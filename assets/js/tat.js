/**
 * ======================================================
 * AGPHL LIS - Turnaround Time (TAT) Monitoring Module
 * Version: 1.0
 *
 * Tracks the time from sample registration/collection to
 * verified/completed results, compares it against the
 * target TAT defined in the Test Catalog, and reports
 * compliance per ISO 15189:2022 post-analytical
 * requirements (clause 7.4 / 8.6 turnaround time KPIs).
 * ======================================================
 */

class TATManager {
    constructor() {
        this.deptFilter = '';
        this.priorityFilter = '';
        this.daysFilter = 30;
        this.activeTab = 'live';
        this.monthlyPeriod = new Date().toISOString().slice(0, 7);
        this.editingMonthlyId = null;
        this.init();
    }

    init() {
        if (!document.getElementById('tatPage')) return;
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'tat') this.render();
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#tatPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#tatPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `tat-${tab}-panel`));
        this.render();
    }

    setupEventListeners() {
        document.querySelectorAll('#tatPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        document.getElementById('tatDeptFilter')?.addEventListener('change', (e) => {
            this.deptFilter = e.target.value;
            this.render();
        });
        document.getElementById('tatPriorityFilter')?.addEventListener('change', (e) => {
            this.priorityFilter = e.target.value;
            this.render();
        });
        document.getElementById('tatDaysFilter')?.addEventListener('change', (e) => {
            this.daysFilter = parseInt(e.target.value) || 30;
            this.render();
        });
        document.getElementById('tatExportBtn')?.addEventListener('click', () => this.exportCSV());

        document.getElementById('tatMonthlyPeriod')?.addEventListener('change', (e) => {
            this.monthlyPeriod = e.target.value || this.monthlyPeriod;
            this.renderMonthly();
        });
        document.getElementById('tatMonthlyDept')?.addEventListener('change', () => this.renderMonthly());
        document.getElementById('tatAutoCalcBtn')?.addEventListener('click', () => this.autoCalcMonthly());
        document.getElementById('tatMonthlyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMonthly();
        });
        document.getElementById('tatBulkSaveBtn')?.addEventListener('click', () => this.saveBulkAll());
    }

    /**
     * Priority multiplier applied to a test's base target TAT.
     * Stat/ASAP samples must turn around much faster than routine ones.
     * Values are lab-configurable via Settings > Customization.
     */
    priorityMultiplier(priority) {
        const map = window.configManager ? configManager.get().tatMultipliers : { Routine: 1, Urgent: 0.7, ASAP: 0.5, Stat: 0.4 };
        return map[priority] ?? 1;
    }

    /**
     * Resolve the target TAT (minutes) for a sample based on its tests
     * and department, falling back to a safe default if no catalog match.
     */
    getTargetTAT(sample, catalog) {
        const matches = catalog.filter(t => (sample.tests || []).includes(t.testName));
        let base;
        if (matches.length) {
            base = Math.max(...matches.map(t => t.targetTAT || 120));
        } else {
            const deptMatches = catalog.filter(t => t.department === sample.department);
            base = deptMatches.length ? Math.max(...deptMatches.map(t => t.targetTAT || 120)) : 120;
        }
        return Math.round(base * this.priorityMultiplier(sample.priority));
    }

    /**
     * Compute TAT details for a single sample using its status timeline.
     */
    computeTAT(sample, catalog) {
        const timeline = sample.timeline || [];
        const startEntry = timeline.find(t => ['Registered', 'Collected'].includes(t.status)) || timeline[0];
        const endEntry = [...timeline].reverse().find(t => ['Completed', 'Verified'].includes(t.status));
        const start = startEntry ? new Date(startEntry.timestamp) : (sample.collectionDate ? new Date(sample.collectionDate) : new Date(sample.createdAt));
        const target = this.getTargetTAT(sample, catalog);

        if (!start || isNaN(start.getTime())) return null;

        if (endEntry) {
            const end = new Date(endEntry.timestamp);
            const minutes = Math.max(0, Math.round((end - start) / 60000));
            return { sample, start, end, minutes, target, status: minutes <= target ? 'On Time' : 'Breached', complete: true };
        }

        if (sample.status === 'Rejected' || sample.status === 'Cancelled') {
            return null;
        }

        const elapsed = Math.max(0, Math.round((new Date() - start) / 60000));
        return { sample, start, end: null, minutes: elapsed, target, status: elapsed > target ? 'Overdue' : 'In Progress', complete: false };
    }

    getFilteredResults() {
        const samples = storage.getAllScoped('samples') || [];
        const catalog = storage.getAll('testCatalog') || [];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.daysFilter);

        return samples
            .filter(s => {
                const cDate = new Date(s.collectionDate || s.createdAt);
                if (cDate < cutoff) return false;
                if (this.deptFilter && s.department !== this.deptFilter) return false;
                if (this.priorityFilter && s.priority !== this.priorityFilter) return false;
                return true;
            })
            .map(s => this.computeTAT(s, catalog))
            .filter(Boolean)
            .sort((a, b) => b.start - a.start);
    }

    formatMinutes(mins) {
        if (mins < 60) return `${mins}m`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
    }

    render() {
        if (this.activeTab === 'monthly') {
            this.renderMonthly();
            return;
        }
        this.populateFilters();
        const results = this.getFilteredResults();
        const widgets = (window.configManager ? configManager.get().widgets.tat : null) || { stats: true, deptChart: true, trendChart: true, table: true };

        this.toggleVisible('tatStats', widgets.stats);
        this.toggleVisible('tatDeptChartCard', widgets.deptChart);
        this.toggleVisible('tatTrendChartCard', widgets.trendChart);
        this.toggleVisible('tatTableCard', widgets.table);

        if (widgets.stats) this.renderStats(results);
        if (widgets.deptChart) this.renderDeptChart(results);
        if (widgets.trendChart) this.renderTrendChart(results);
        if (widgets.table) this.renderTable(results);
    }

    // ==================== MONTHLY REPORT ====================
    getMonthlyReports() {
        return storage.getAll('tatMonthlyReports') || [];
    }

    /**
     * Auto-calculate TAT compliance for the selected period + department
     * from actual sample data, then populate the manual entry fields so
     * the user can review/adjust before saving an authoritative record.
     */
    autoCalcMonthly() {
        const period = this.monthlyPeriod;
        const dept = document.getElementById('tatMonthlyDept')?.value || '';
        const catalog = storage.getAll('testCatalog') || [];
        const samples = (storage.getAllScoped('samples') || []).filter(s => {
            const inPeriod = (s.collectionDate || s.createdAt || '').startsWith(period);
            const inDept = !dept || s.department === dept;
            return inPeriod && inDept;
        });

        const results = samples.map(s => this.computeTAT(s, catalog)).filter(r => r && r.complete);
        const within = results.filter(r => r.status === 'On Time').length;
        const beyond = results.length - within;
        const compliance = results.length ? Math.round((within / results.length) * 100) : 0;
        const avgTarget = results.length ? Math.round(results.reduce((s, r) => s + r.target, 0) / results.length) : 60;

        document.getElementById('tatMonthlyTarget').value = avgTarget;
        document.getElementById('tatMonthlyWithin').value = within;
        document.getElementById('tatMonthlyBeyond').value = beyond;
        document.getElementById('tatMonthlyCompliance').value = compliance;
        showToast(`Auto-calculated from ${results.length} completed sample(s) this period`, 'success');
    }

    renderMonthly() {
        const periodInput = document.getElementById('tatMonthlyPeriod');
        if (periodInput && !periodInput.value) periodInput.value = this.monthlyPeriod;
        this.populateMonthlyDeptFilter();

        const period = this.monthlyPeriod;
        const reports = this.getMonthlyReports().filter(r => r.period === period);

        const tbody = document.getElementById('tatMonthlyTableBody');
        if (tbody) {
            const allReports = [...this.getMonthlyReports()].sort((a, b) => b.period.localeCompare(a.period));
            if (allReports.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No monthly TAT reports recorded yet</td></tr>`;
            } else {
                tbody.innerHTML = allReports.map(r => `
                    <tr>
                        <td>${Utils.escapeHtml(r.period)}</td>
                        <td>${Utils.escapeHtml(r.department || 'All')}</td>
                        <td>${r.targetTAT} min</td>
                        <td>${r.testsWithinTAT}</td>
                        <td>${r.testsBeyondTAT}</td>
                        <td><strong>${r.compliancePercent}%</strong></td>
                        <td><span class="badge badge-secondary">${r.source === 'auto' ? 'Auto' : 'Manual'}</span></td>
                    </tr>`).join('');
            }
        }

        // Trend chart across the last 6 recorded months (all departments combined view)
        const months = [...new Set(this.getMonthlyReports().map(r => r.period))].sort().slice(-6);
        const values = months.map(m => {
            const monthReports = this.getMonthlyReports().filter(r => r.period === m);
            return monthReports.length ? Math.round(monthReports.reduce((s, r) => s + r.compliancePercent, 0) / monthReports.length) : 0;
        });
        Utils.drawLineChart('tatMonthlyTrendChart', months, values, { valueFormatter: v => v + '%', targetLine: 90, emptyText: 'No monthly reports recorded yet' });
        this.renderBulkTable();
    }

    /**
     * Bulk manual-entry table: one row per department for the selected
     * period, so all departments can be entered/reviewed in one screen
     * instead of one at a time via the single-record form above.
     */
    renderBulkTable() {
        const tbody = document.getElementById('tatBulkTableBody');
        if (!tbody) return;
        const departments = storage.getAll('departments') || [];
        const period = this.monthlyPeriod;
        const existingReports = this.getMonthlyReports().filter(r => r.period === period);

        if (departments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:1.5rem;">No departments configured yet</td></tr>`;
            return;
        }

        tbody.innerHTML = departments.map(d => {
            const existing = existingReports.find(r => r.department === d.name);
            return `
            <tr data-dept="${Utils.escapeHtml(d.name)}">
                <td>${Utils.escapeHtml(d.name)}</td>
                <td><input type="number" class="bulk-target" min="1" value="${existing?.targetTAT ?? ''}" style="width:80px;"></td>
                <td><input type="number" class="bulk-within" min="0" value="${existing?.testsWithinTAT ?? ''}" style="width:80px;"></td>
                <td><input type="number" class="bulk-beyond" min="0" value="${existing?.testsBeyondTAT ?? ''}" style="width:80px;"></td>
                <td><input type="text" class="bulk-delay" value="${Utils.escapeHtml(existing?.delayReason || '')}" placeholder="Delay reason" style="width:140px;"></td>
                <td><input type="text" class="bulk-corrective" value="${Utils.escapeHtml(existing?.correctiveAction || '')}" placeholder="Corrective action" style="width:140px;"></td>
            </tr>`;
        }).join('');
    }

    saveBulkAll() {
        const period = this.monthlyPeriod;
        const rows = document.querySelectorAll('#tatBulkTableBody tr[data-dept]');
        let savedCount = 0;

        rows.forEach(row => {
            const department = row.dataset.dept;
            const target = parseInt(row.querySelector('.bulk-target').value) || 0;
            const within = parseInt(row.querySelector('.bulk-within').value) || 0;
            const beyond = parseInt(row.querySelector('.bulk-beyond').value) || 0;
            // Skip rows nobody filled in - don't create empty records for every department.
            if (!target && !within && !beyond) return;

            const total = within + beyond;
            const data = {
                period,
                department,
                targetTAT: target,
                testsWithinTAT: within,
                testsBeyondTAT: beyond,
                compliancePercent: total ? Math.round((within / total) * 100) : 0,
                delayReason: row.querySelector('.bulk-delay').value.trim(),
                correctiveAction: row.querySelector('.bulk-corrective').value.trim(),
                comments: '',
                source: 'manual',
                recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
            };

            const existing = this.getMonthlyReports().find(r => r.period === period && r.department === department);
            if (existing) storage.update('tatMonthlyReports', existing.id, data);
            else storage.create('tatMonthlyReports', data);
            savedCount++;
        });

        showToast(`Saved TAT reports for ${savedCount} department(s)`, 'success');
        this.renderMonthly();
    }

    populateMonthlyDeptFilter() {
        const select = document.getElementById('tatMonthlyDept');
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

    saveMonthly() {
        const data = {
            period: document.getElementById('tatMonthlyPeriod').value,
            department: document.getElementById('tatMonthlyDept').value,
            targetTAT: parseInt(document.getElementById('tatMonthlyTarget').value) || 0,
            testsWithinTAT: parseInt(document.getElementById('tatMonthlyWithin').value) || 0,
            testsBeyondTAT: parseInt(document.getElementById('tatMonthlyBeyond').value) || 0,
            compliancePercent: parseFloat(document.getElementById('tatMonthlyCompliance').value) || 0,
            delayReason: document.getElementById('tatMonthlyDelayReason').value.trim(),
            correctiveAction: document.getElementById('tatMonthlyCorrectiveAction').value.trim(),
            comments: document.getElementById('tatMonthlyComments').value.trim(),
            source: document.getElementById('tatMonthlySource').value,
            recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
        };

        if (!data.period) {
            showToast('Reporting period is required', 'error');
            return;
        }

        const existing = this.getMonthlyReports().find(r => r.period === data.period && r.department === data.department);
        try {
            if (existing) {
                storage.update('tatMonthlyReports', existing.id, data);
                showToast('Monthly TAT report updated', 'success');
            } else {
                storage.create('tatMonthlyReports', data);
                showToast('Monthly TAT report saved', 'success');
            }
            document.getElementById('tatMonthlyForm').reset();
            document.getElementById('tatMonthlyPeriod').value = this.monthlyPeriod;
            this.renderMonthly();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    toggleVisible(id, visible) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    }

    populateFilters() {
        const deptSelect = document.getElementById('tatDeptFilter');
        if (deptSelect && deptSelect.options.length <= 1) {
            const departments = storage.getAll('departments') || [];
            departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = d.name;
                deptSelect.appendChild(opt);
            });
        }
    }

    renderStats(results) {
        const completed = results.filter(r => r.complete);
        const onTime = completed.filter(r => r.status === 'On Time').length;
        const compliance = completed.length ? Math.round((onTime / completed.length) * 100) : 0;
        const avgMinutes = completed.length ? Math.round(completed.reduce((s, r) => s + r.minutes, 0) / completed.length) : 0;
        const overdue = results.filter(r => r.status === 'Overdue').length;
        const inProgress = results.filter(r => r.status === 'In Progress').length;

        const container = document.getElementById('tatStats');
        if (!container) return;

        const statBlock = (value, label, sub, color) => `
            <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                <div style="font-size:var(--text-3xl); font-weight:700; color:${color};">${value}</div>
                <div style="font-size:var(--text-sm); color:var(--gray-600);">${label}</div>
                <div style="font-size:var(--text-xs); color:var(--gray-400);">${sub}</div>
            </div>`;

        container.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    ${statBlock(compliance + '%', 'TAT Compliance', `${onTime}/${completed.length} within target`, compliance >= 90 ? 'var(--success)' : compliance >= 70 ? '#856404' : 'var(--danger)')}
                    ${statBlock(this.formatMinutes(avgMinutes), 'Average TAT', `${completed.length} completed samples`, 'var(--primary-500)')}
                    ${statBlock(overdue, 'Overdue (Pending)', 'past target, not yet verified', overdue > 0 ? 'var(--danger)' : 'var(--success)')}
                    ${statBlock(inProgress, 'In Progress', 'within target time', 'var(--info)')}
                </div>
            </div>`;
    }

    renderDeptChart(results) {
        const byDept = {};
        results.filter(r => r.complete).forEach(r => {
            const dept = r.sample.department || 'Unspecified';
            if (!byDept[dept]) byDept[dept] = { total: 0, count: 0 };
            byDept[dept].total += r.minutes;
            byDept[dept].count += 1;
        });
        const labels = Object.keys(byDept);
        const values = labels.map(d => Math.round(byDept[d].total / byDept[d].count));
        Utils.drawBarChart('tatDeptChart', labels, values, {
            valueFormatter: v => this.formatMinutes(v),
            emptyText: 'No completed samples in this period'
        });
    }

    renderTrendChart(results) {
        const days = Math.min(this.daysFilter, 14);
        const labels = [];
        const values = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = new Date();
            day.setDate(day.getDate() - i);
            const dayStr = day.toISOString().split('T')[0];
            labels.push(Utils.formatDate(dayStr, 'MM/DD'));
            const dayResults = results.filter(r => r.complete && r.start.toISOString().startsWith(dayStr));
            const onTime = dayResults.filter(r => r.status === 'On Time').length;
            values.push(dayResults.length ? Math.round((onTime / dayResults.length) * 100) : 0);
        }
        Utils.drawLineChart('tatTrendChart', labels, values, {
            valueFormatter: v => v + '%',
            targetLine: 90,
            emptyText: 'No completed samples in this period'
        });
    }

    renderTable(results) {
        const tbody = document.getElementById('tatTableBody');
        if (!tbody) return;

        const visible = results.slice(0, 100);

        if (visible.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:2rem;">No samples found for the selected filters</td></tr>`;
            return;
        }

        tbody.innerHTML = visible.map(r => {
            const patient = storage.getById('patients', r.sample.patientId);
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown';
            const badgeClass = { 'On Time': 'badge-success', 'Breached': 'badge-danger', 'Overdue': 'badge-danger', 'In Progress': 'badge-info' }[r.status] || 'badge-secondary';
            return `
                <tr>
                    <td>${Utils.escapeHtml(r.sample.labNumber || r.sample.id)}</td>
                    <td>${Utils.escapeHtml(Utils.truncate(patientName, 22))}</td>
                    <td>${Utils.escapeHtml(r.sample.department || '-')}</td>
                    <td><span class="badge badge-secondary">${Utils.escapeHtml(r.sample.priority || 'Routine')}</span></td>
                    <td>${Utils.formatDate(r.start, 'MM/DD HH:mm')}</td>
                    <td>${this.formatMinutes(r.minutes)}</td>
                    <td>${this.formatMinutes(r.target)}</td>
                    <td><span class="badge ${badgeClass}">${r.status}</span></td>
                </tr>`;
        }).join('');
    }

    exportCSV() {
        const results = this.getFilteredResults();
        const rows = [['Lab Number', 'Department', 'Priority', 'Start', 'TAT (min)', 'Target (min)', 'Status']];
        results.forEach(r => {
            rows.push([
                r.sample.labNumber || r.sample.id,
                r.sample.department || '',
                r.sample.priority || '',
                r.start.toISOString(),
                r.minutes,
                r.target,
                r.status
            ]);
        });
        const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        Utils.downloadFile(csv, `TAT_Report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }
}

let tatManager;
document.addEventListener('DOMContentLoaded', function () {
    tatManager = new TATManager();
    window.tatManager = tatManager;
});
