/**
 * ======================================================
 * AGPHL LIS - Test Availability Module
 * Version: 1.0
 *
 * Maintains the laboratory's live test catalog/menu status
 * (Available / Limited / Unavailable) so reception and
 * clinicians always know what can be ordered right now,
 * and why a test is down when it isn't (reagent stockout,
 * equipment failure, staff shortage, referral pending...).
 * Feeds the "Test Availability Rate" ISO 15189 indicator.
 * ======================================================
 */

class AvailabilityManager {
    constructor() {
        this.deptFilter = '';
        this.statusFilter = '';
        this.searchTerm = '';
        this.editingId = null;
        this.activeTab = 'live';
        this.monthlyPeriod = new Date().toISOString().slice(0, 7);
        this.init();
    }

    init() {
        if (!document.getElementById('availabilityPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'availability') this.render();
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#availabilityPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#availabilityPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `avail-${tab}-panel`));
        this.render();
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_availability');
        document.querySelectorAll('.availability-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
    }

    setupEventListeners() {
        document.querySelectorAll('#availabilityPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        document.getElementById('availSearch')?.addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value;
            this.renderTable();
        }, 250));
        document.getElementById('availDeptFilter')?.addEventListener('change', (e) => {
            this.deptFilter = e.target.value;
            this.renderTable();
        });
        document.getElementById('availStatusFilter')?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.renderTable();
        });
        document.getElementById('availAddBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('availForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTest();
        });

        document.getElementById('availMonthlyPeriod')?.addEventListener('change', (e) => {
            this.monthlyPeriod = e.target.value || this.monthlyPeriod;
            this.renderMonthly();
        });
        document.getElementById('availAutoCalcBtn')?.addEventListener('click', () => this.autoCalcMonthly());
        document.getElementById('availMonthlyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMonthly();
        });
        document.getElementById('availMonthlyTestSelect')?.addEventListener('change', () => this.loadMonthlyForSelectedTest());
        document.getElementById('availBulkSaveBtn')?.addEventListener('click', () => this.saveBulkAll());
    }

    getCatalog() {
        return storage.getAll('testCatalog') || [];
    }

    render() {
        if (this.activeTab === 'monthly') {
            this.renderMonthly();
            return;
        }
        this.populateDeptFilter();
        const widgets = (window.configManager ? configManager.get().widgets.availability : null) || { stats: true, table: true };
        this.toggleVisible('availStats', widgets.stats);
        this.toggleVisible('availTableCard', widgets.table);
        if (widgets.stats) this.renderStats();
        if (widgets.table) this.renderTable();
    }

    toggleVisible(id, visible) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    }

    // ==================== MONTHLY REPORT ====================
    getMonthlyReports() {
        return storage.getAll('availabilityMonthlyReports') || [];
    }

    populateMonthlyTestSelect() {
        const select = document.getElementById('availMonthlyTestSelect');
        if (select && select.options.length <= 1) {
            this.getCatalog().forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.testName;
                opt.textContent = t.testName;
                select.appendChild(opt);
            });
        }
    }

    /** Snapshot the test's current live status into the manual entry form. */
    loadMonthlyForSelectedTest() {
        const testName = document.getElementById('availMonthlyTestSelect').value;
        const test = this.getCatalog().find(t => t.testName === testName);
        if (!test) return;
        document.getElementById('availMonthlyDept').value = test.department || '';
        document.getElementById('availMonthlyStatus').value = test.status || 'Available';
        document.getElementById('availMonthlyReason').value = test.reason || '';
    }

    autoCalcMonthly() {
        this.populateMonthlyTestSelect();
        const testName = document.getElementById('availMonthlyTestSelect').value;
        if (!testName) {
            showToast('Select a test first', 'error');
            return;
        }
        this.loadMonthlyForSelectedTest();
        showToast('Snapshotted current live status for this test - review before saving', 'success');
    }

    renderMonthly() {
        this.populateMonthlyTestSelect();
        const periodInput = document.getElementById('availMonthlyPeriod');
        if (periodInput && !periodInput.value) periodInput.value = this.monthlyPeriod;

        const allReports = [...this.getMonthlyReports()].sort((a, b) => b.period.localeCompare(a.period));
        const tbody = document.getElementById('availMonthlyTableBody');
        if (tbody) {
            if (allReports.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No monthly availability reports recorded yet</td></tr>`;
            } else {
                const statusBadge = { 'Available': 'badge-success', 'Interrupted': 'badge-warning', 'Out of Service': 'badge-danger' };
                tbody.innerHTML = allReports.map(r => `
                    <tr>
                        <td>${Utils.escapeHtml(r.period)}</td>
                        <td>${Utils.escapeHtml(r.testName)}</td>
                        <td>${Utils.escapeHtml(r.department || '-')}</td>
                        <td><span class="badge ${statusBadge[r.status] || 'badge-secondary'}">${Utils.escapeHtml(r.status)}</span></td>
                        <td>${r.dateInterrupted ? Utils.formatDate(r.dateInterrupted, 'MM/DD/YYYY') : '-'}</td>
                        <td>${r.dateRestored ? Utils.formatDate(r.dateRestored, 'MM/DD/YYYY') : '-'}</td>
                        <td><span class="badge badge-secondary">${r.source === 'auto' ? 'Auto' : 'Manual'}</span></td>
                    </tr>`).join('');
            }
        }

        // Availability rate trend: % of logged tests marked Available, per month
        const months = [...new Set(this.getMonthlyReports().map(r => r.period))].sort().slice(-6);
        const values = months.map(m => {
            const monthReports = this.getMonthlyReports().filter(r => r.period === m);
            const available = monthReports.filter(r => r.status === 'Available').length;
            return monthReports.length ? Math.round((available / monthReports.length) * 100) : 0;
        });
        Utils.drawLineChart('availMonthlyTrendChart', months, values, { valueFormatter: v => v + '%', targetLine: 98, emptyText: 'No monthly reports recorded yet' });
        this.renderBulkTable();
    }

    /**
     * Bulk manual-entry table: one row per test in the catalog for the
     * selected period, so every test can be reported in one screen
     * instead of one at a time via the single-record form above.
     */
    renderBulkTable() {
        const tbody = document.getElementById('availBulkTableBody');
        if (!tbody) return;
        const catalog = this.getCatalog();
        const period = this.monthlyPeriod;
        const existingReports = this.getMonthlyReports().filter(r => r.period === period);

        if (catalog.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:1.5rem;">No tests in the catalog yet</td></tr>`;
            return;
        }

        tbody.innerHTML = catalog.map(t => {
            const existing = existingReports.find(r => r.testName === t.testName);
            const status = existing?.status || 'Available';
            return `
            <tr data-test="${Utils.escapeHtml(t.testName)}" data-dept="${Utils.escapeHtml(t.department || '')}">
                <td>${Utils.escapeHtml(t.testName)}</td>
                <td>${Utils.escapeHtml(t.department || '-')}</td>
                <td>
                    <select class="bulk-status">
                        <option value="Available" ${status === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Interrupted" ${status === 'Interrupted' ? 'selected' : ''}>Interrupted</option>
                        <option value="Out of Service" ${status === 'Out of Service' ? 'selected' : ''}>Out of Service</option>
                    </select>
                </td>
                <td><input type="date" class="bulk-interrupted" value="${existing?.dateInterrupted || ''}"></td>
                <td><input type="date" class="bulk-restored" value="${existing?.dateRestored || ''}"></td>
                <td><input type="text" class="bulk-reason" value="${Utils.escapeHtml(existing?.reason || '')}" placeholder="Reason" style="width:140px;"></td>
            </tr>`;
        }).join('');
    }

    saveBulkAll() {
        const period = this.monthlyPeriod;
        const rows = document.querySelectorAll('#availBulkTableBody tr[data-test]');
        let savedCount = 0;

        rows.forEach(row => {
            const testName = row.dataset.test;
            const status = row.querySelector('.bulk-status').value;
            const reason = row.querySelector('.bulk-reason').value.trim();
            // Skip tests left at the default Available/no-reason state -
            // don't create a record for every single test every month.
            if (status === 'Available' && !reason) return;

            const data = {
                period,
                testName,
                department: row.dataset.dept,
                status,
                dateInterrupted: row.querySelector('.bulk-interrupted').value,
                dateRestored: row.querySelector('.bulk-restored').value,
                reason,
                correctiveAction: '',
                comments: '',
                source: 'manual',
                recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
            };

            const existing = this.getMonthlyReports().find(r => r.period === period && r.testName === testName);
            if (existing) storage.update('availabilityMonthlyReports', existing.id, data);
            else storage.create('availabilityMonthlyReports', data);
            savedCount++;
        });

        showToast(`Saved availability reports for ${savedCount} test(s)`, 'success');
        this.renderMonthly();
    }

    saveMonthly() {
        const data = {
            period: document.getElementById('availMonthlyPeriod').value,
            testName: document.getElementById('availMonthlyTestSelect').value,
            department: document.getElementById('availMonthlyDept').value,
            status: document.getElementById('availMonthlyStatus').value,
            dateInterrupted: document.getElementById('availMonthlyDateInterrupted').value,
            dateRestored: document.getElementById('availMonthlyDateRestored').value,
            reason: document.getElementById('availMonthlyReason').value.trim(),
            correctiveAction: document.getElementById('availMonthlyCorrectiveAction').value.trim(),
            comments: document.getElementById('availMonthlyComments').value.trim(),
            source: document.getElementById('availMonthlySource').value,
            recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
        };

        if (!data.period || !data.testName) {
            showToast('Reporting period and test name are required', 'error');
            return;
        }

        const existing = this.getMonthlyReports().find(r => r.period === data.period && r.testName === data.testName);
        try {
            if (existing) {
                storage.update('availabilityMonthlyReports', existing.id, data);
                showToast('Monthly availability report updated', 'success');
            } else {
                storage.create('availabilityMonthlyReports', data);
                showToast('Monthly availability report saved', 'success');
            }
            document.getElementById('availMonthlyForm').reset();
            document.getElementById('availMonthlyPeriod').value = this.monthlyPeriod;
            this.renderMonthly();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    populateDeptFilter() {
        const select = document.getElementById('availDeptFilter');
        if (select && select.options.length <= 1) {
            const departments = storage.getAll('departments') || [];
            departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = d.name;
                select.appendChild(opt);
            });
        }
    }

    renderStats() {
        const catalog = this.getCatalog();
        const total = catalog.length;
        const available = catalog.filter(t => t.status === 'Available').length;
        const limited = catalog.filter(t => t.status === 'Limited').length;
        const unavailable = catalog.filter(t => t.status === 'Unavailable').length;
        const rate = total ? Math.round((available / total) * 100) : 100;

        const container = document.getElementById('availStats');
        if (!container) return;

        const block = (value, label, color) => `
            <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                <div style="font-size:var(--text-3xl); font-weight:700; color:${color};">${value}</div>
                <div style="font-size:var(--text-sm); color:var(--gray-600);">${label}</div>
            </div>`;

        container.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem;">
                    ${block(rate + '%', 'Test Availability Rate', rate >= 98 ? 'var(--success)' : rate >= 90 ? '#856404' : 'var(--danger)')}
                    ${block(available, 'Available', 'var(--success)')}
                    ${block(limited, 'Limited', '#856404')}
                    ${block(unavailable, 'Unavailable', 'var(--danger)')}
                </div>
            </div>`;
    }

    renderTable() {
        const tbody = document.getElementById('availTableBody');
        if (!tbody) return;
        const canManage = window.auth?.hasPermission('manage_availability');

        let list = this.getCatalog();
        if (this.deptFilter) list = list.filter(t => t.department === this.deptFilter);
        if (this.statusFilter) list = list.filter(t => t.status === this.statusFilter);
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            list = list.filter(t => (t.testName || '').toLowerCase().includes(term));
        }
        list = list.sort((a, b) => (a.testName || '').localeCompare(b.testName || ''));

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No tests match the selected filters</td></tr>`;
            return;
        }

        const badgeClass = { 'Available': 'badge-success', 'Limited': 'badge-warning', 'Unavailable': 'badge-danger' };

        tbody.innerHTML = list.map(t => `
            <tr>
                <td><strong>${Utils.escapeHtml(t.testName)}</strong>${t.criticalTest ? ' <span class="badge badge-danger" title="Critical/STAT test">!</span>' : ''}</td>
                <td>${Utils.escapeHtml(t.department || '-')}</td>
                <td>${Utils.escapeHtml(t.specimenType || '-')}</td>
                <td>${t.targetTAT || '-'} min</td>
                <td><span class="badge ${badgeClass[t.status] || 'badge-secondary'}">${Utils.escapeHtml(t.status || 'Available')}</span></td>
                <td>${Utils.escapeHtml(t.reason || '-')}</td>
                <td class="actions">
                    ${canManage ? `
                        <button class="edit-btn" title="Update status" onclick="availabilityManager.openStatusModal('${t.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="delete-btn" title="Remove from catalog" onclick="availabilityManager.deleteTest('${t.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>` : '-'}
                </td>
            </tr>`).join('');
    }

    openAddModal() {
        if (!window.auth?.hasPermission('manage_availability')) return;
        this.editingId = null;
        document.getElementById('availModalTitle').textContent = 'Add Test to Catalog';
        document.getElementById('availForm').reset();
        document.getElementById('availStatusGroup').style.display = 'none';
        document.getElementById('availModal').style.display = 'flex';
    }

    openStatusModal(id) {
        if (!window.auth?.hasPermission('manage_availability')) return;
        const test = storage.getById('testCatalog', id);
        if (!test) return;
        this.editingId = id;
        document.getElementById('availModalTitle').textContent = `Update: ${test.testName}`;
        document.getElementById('availTestName').value = test.testName;
        document.getElementById('availTestName').disabled = true;
        document.getElementById('availDepartment').value = test.department || '';
        document.getElementById('availSpecimenType').value = test.specimenType || '';
        document.getElementById('availTargetTAT').value = test.targetTAT || 60;
        document.getElementById('availCritical').checked = !!test.criticalTest;
        document.getElementById('availStatus').value = test.status || 'Available';
        document.getElementById('availReason').value = test.reason || '';
        document.getElementById('availStatusGroup').style.display = '';
        document.getElementById('availModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('availModal').style.display = 'none';
        document.getElementById('availTestName').disabled = false;
        this.editingId = null;
    }

    saveTest() {
        if (!window.auth?.hasPermission('manage_availability')) {
            showToast('You do not have permission to manage test availability', 'error');
            return;
        }

        const data = {
            testName: document.getElementById('availTestName').value.trim(),
            department: document.getElementById('availDepartment').value,
            specimenType: document.getElementById('availSpecimenType').value.trim(),
            targetTAT: parseInt(document.getElementById('availTargetTAT').value) || 60,
            criticalTest: document.getElementById('availCritical').checked,
            status: document.getElementById('availStatus').value || 'Available',
            reason: document.getElementById('availReason').value.trim(),
            lastUpdated: new Date().toISOString(),
            updatedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
        };

        if (!data.testName || !data.department) {
            showToast('Test name and department are required', 'error');
            return;
        }

        try {
            if (this.editingId) {
                storage.update('testCatalog', this.editingId, data);
                showToast('Test availability updated', 'success');
            } else {
                if (storage.exists('testCatalog', 'testName', data.testName)) {
                    showToast('This test already exists in the catalog', 'error');
                    return;
                }
                storage.create('testCatalog', data);
                showToast('Test added to catalog', 'success');
            }
            this.closeModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteTest(id) {
        if (!window.auth?.hasPermission('manage_availability')) return;
        if (!confirm('Remove this test from the catalog? This does not affect past sample records.')) return;
        storage.delete('testCatalog', id);
        showToast('Test removed from catalog', 'success');
        this.render();
    }
}

let availabilityManager;
document.addEventListener('DOMContentLoaded', function () {
    availabilityManager = new AvailabilityManager();
    window.availabilityManager = availabilityManager;
});
