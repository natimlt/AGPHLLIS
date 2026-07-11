/**
 * ======================================================
 * AGPHL LIS - Workload Monitoring Module
 * Version: 1.0
 *
 * Tracks laboratory productivity: samples collected,
 * results entered/verified per staff member, workload
 * distribution across departments, daily volume trends,
 * and equipment status overview. Supports ISO 15189:2022
 * staffing-adequacy and resource-planning review (clause
 * 6.2 Personnel / 6.3 Facilities and environment).
 * ======================================================
 */

class WorkloadManager {
    constructor() {
        this.daysFilter = 7;
        this.deptFilter = '';
        this.activeTab = 'live';
        this.monthlyPeriod = new Date().toISOString().slice(0, 7);
        this.init();
    }

    init() {
        if (!document.getElementById('workloadPage')) return;
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'workload') this.render();
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#workloadPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#workloadPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `workload-${tab}-panel`));
        this.render();
    }

    setupEventListeners() {
        document.querySelectorAll('#workloadPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        document.getElementById('workloadDaysFilter')?.addEventListener('change', (e) => {
            this.daysFilter = parseInt(e.target.value) || 7;
            this.render();
        });
        document.getElementById('workloadDeptFilter')?.addEventListener('change', (e) => {
            this.deptFilter = e.target.value;
            this.render();
        });

        document.getElementById('workloadMonthlyPeriod')?.addEventListener('change', (e) => {
            this.monthlyPeriod = e.target.value || this.monthlyPeriod;
            this.renderMonthly();
        });
        document.getElementById('workloadAutoCalcBtn')?.addEventListener('click', () => this.autoCalcMonthly());
        document.getElementById('workloadBulkApplyBtn')?.addEventListener('click', () => this.applyBulkToForm());
        document.getElementById('workloadBulkApplyBtn')?.addEventListener('click', () => this.applyBulkToForm());
        document.getElementById('workloadMonthlyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMonthly();
        });
    }

    inPeriod(dateStr) {
        if (!dateStr) return false;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.daysFilter);
        return new Date(dateStr) >= cutoff;
    }

    getFilteredSamples() {
        return (storage.getAllScoped('samples') || []).filter(s => {
            if (!this.inPeriod(s.collectionDate || s.createdAt)) return false;
            if (this.deptFilter && s.department !== this.deptFilter) return false;
            return true;
        });
    }

    getFilteredResults() {
        return (storage.getAllScoped('results') || []).filter(r => {
            if (!this.inPeriod(r.createdAt)) return false;
            if (this.deptFilter && r.department !== this.deptFilter) return false;
            return true;
        });
    }

    render() {
        if (this.activeTab === 'monthly') {
            this.renderMonthly();
            return;
        }
        this.populateFilters();
        const samples = this.getFilteredSamples();
        const results = this.getFilteredResults();
        const widgets = (window.configManager ? configManager.get().widgets.workload : null) ||
            { stats: true, deptChart: true, trendChart: true, staffTable: true, equipment: true };

        this.toggleVisible('workloadStats', widgets.stats);
        this.toggleVisible('workloadDeptChartCard', widgets.deptChart);
        this.toggleVisible('workloadTrendChartCard', widgets.trendChart);
        this.toggleVisible('workloadStaffTableCard', widgets.staffTable);
        this.toggleVisible('workloadEquipmentCard', widgets.equipment);

        if (widgets.stats) this.renderStats(samples, results);
        if (widgets.staffTable) this.renderStaffTable(samples, results);
        if (widgets.deptChart) this.renderDeptChart(samples);
        if (widgets.trendChart) this.renderTrendChart(samples);
        if (widgets.equipment) this.renderEquipment();
    }

    toggleVisible(id, visible) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    }

    // ==================== MONTHLY REPORT ====================
    getMonthlyReports() {
        return storage.getAll('workloadMonthlyReports') || [];
    }

    /**
     * Bucket a department name into the spec's fixed test-category
     * columns (Hematology / Clinical Chemistry / Serology / Microbiology
     * / Molecular / Other), since the lab's actual department list is
     * more granular (Blood Bank, Parasitology, Urinalysis, etc.).
     */
    categoryFor(department) {
        const map = {
            'Hematology': 'hematology',
            'Clinical Chemistry': 'chemistry',
            'Serology': 'serology',
            'Microbiology': 'microbiology',
            'Molecular': 'molecular'
        };
        return map[department] || 'other';
    }

    autoCalcMonthly() {
        const period = this.monthlyPeriod;
        const samples = (storage.getAllScoped('samples') || []).filter(s => (s.collectionDate || s.createdAt || '').startsWith(period));
        const patientIds = new Set(samples.map(s => s.patientId).filter(Boolean));
        const totalTests = samples.reduce((sum, s) => sum + (s.tests?.length || 0), 0);

        const counts = { hematology: 0, chemistry: 0, serology: 0, microbiology: 0, molecular: 0, other: 0 };
        samples.forEach(s => {
            const cat = this.categoryFor(s.department);
            counts[cat] += (s.tests?.length || 0);
        });

        document.getElementById('workloadMonthlyPatients').value = patientIds.size;
        document.getElementById('workloadMonthlySamples').value = samples.length;
        document.getElementById('workloadMonthlyTests').value = totalTests;
        document.getElementById('workloadMonthlyHematology').value = counts.hematology;
        document.getElementById('workloadMonthlyChemistry').value = counts.chemistry;
        document.getElementById('workloadMonthlySerology').value = counts.serology;
        document.getElementById('workloadMonthlyMicrobiology').value = counts.microbiology;
        document.getElementById('workloadMonthlyMolecular').value = counts.molecular;
        document.getElementById('workloadMonthlyOther').value = counts.other;
        showToast(`Auto-calculated from ${samples.length} sample(s) this period`, 'success');
    }

    renderMonthly() {
        const periodInput = document.getElementById('workloadMonthlyPeriod');
        if (periodInput && !periodInput.value) periodInput.value = this.monthlyPeriod;

        const allReports = [...this.getMonthlyReports()].sort((a, b) => b.period.localeCompare(a.period));
        const tbody = document.getElementById('workloadMonthlyTableBody');
        if (tbody) {
            if (allReports.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No monthly workload reports recorded yet</td></tr>`;
            } else {
                tbody.innerHTML = allReports.map(r => `
                    <tr>
                        <td>${Utils.escapeHtml(r.period)}</td>
                        <td>${r.totalPatients}</td>
                        <td>${r.totalSamples}</td>
                        <td><strong>${r.totalTests}</strong></td>
                        <td>H:${r.hematologyTests || 0} C:${r.chemistryTests || 0} S:${r.serologyTests || 0} M:${r.microbiologyTests || 0} Mol:${r.molecularTests || 0} O:${r.otherTests || 0}</td>
                        <td><span class="badge badge-secondary">${r.source === 'auto' ? 'Auto' : 'Manual'}</span></td>
                    </tr>`).join('');
            }
        }

        const months = [...new Set(this.getMonthlyReports().map(r => r.period))].sort().slice(-6);
        const values = months.map(m => {
            const r = this.getMonthlyReports().find(rep => rep.period === m);
            return r ? r.totalTests : 0;
        });
        Utils.drawLineChart('workloadMonthlyTrendChart', months, values, { emptyText: 'No monthly reports recorded yet' });
        this.renderBulkTable();
    }

    /**
     * Bulk manual-entry table: one row per department for the selected
     * period. Since the workload report itself is a single aggregate
     * record (not one per department), "Apply to Report" sums these
     * per-department test counts into the category fields above rather
     * than creating separate records - review/adjust, then Save.
     */
    renderBulkTable() {
        const tbody = document.getElementById('workloadBulkTableBody');
        if (!tbody) return;
        const departments = storage.getAll('departments') || [];

        if (departments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="padding:1.5rem;">No departments configured yet</td></tr>`;
            return;
        }

        tbody.innerHTML = departments.map(d => `
            <tr data-dept="${Utils.escapeHtml(d.name)}">
                <td>${Utils.escapeHtml(d.name)} <span style="color:var(--gray-400); font-size:var(--text-xs);">(${this.categoryFor(d.name)})</span></td>
                <td><input type="number" class="bulk-tests" min="0" value="0" style="width:100px;"></td>
            </tr>`).join('');
    }

    applyBulkToForm() {
        const rows = document.querySelectorAll('#workloadBulkTableBody tr[data-dept]');
        const counts = { hematology: 0, chemistry: 0, serology: 0, microbiology: 0, molecular: 0, other: 0 };

        rows.forEach(row => {
            const dept = row.dataset.dept;
            const count = parseInt(row.querySelector('.bulk-tests').value) || 0;
            counts[this.categoryFor(dept)] += count;
        });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.getElementById('workloadMonthlyTests').value = total;
        document.getElementById('workloadMonthlyHematology').value = counts.hematology;
        document.getElementById('workloadMonthlyChemistry').value = counts.chemistry;
        document.getElementById('workloadMonthlySerology').value = counts.serology;
        document.getElementById('workloadMonthlyMicrobiology').value = counts.microbiology;
        document.getElementById('workloadMonthlyMolecular').value = counts.molecular;
        document.getElementById('workloadMonthlyOther').value = counts.other;
        showToast('Department test counts applied - review, then Save Monthly Report', 'success');
    }

    saveMonthly() {
        const data = {
            period: document.getElementById('workloadMonthlyPeriod').value,
            totalPatients: parseInt(document.getElementById('workloadMonthlyPatients').value) || 0,
            totalSamples: parseInt(document.getElementById('workloadMonthlySamples').value) || 0,
            totalTests: parseInt(document.getElementById('workloadMonthlyTests').value) || 0,
            hematologyTests: parseInt(document.getElementById('workloadMonthlyHematology').value) || 0,
            chemistryTests: parseInt(document.getElementById('workloadMonthlyChemistry').value) || 0,
            serologyTests: parseInt(document.getElementById('workloadMonthlySerology').value) || 0,
            microbiologyTests: parseInt(document.getElementById('workloadMonthlyMicrobiology').value) || 0,
            molecularTests: parseInt(document.getElementById('workloadMonthlyMolecular').value) || 0,
            otherTests: parseInt(document.getElementById('workloadMonthlyOther').value) || 0,
            comments: document.getElementById('workloadMonthlyComments').value.trim(),
            source: document.getElementById('workloadMonthlySource').value,
            recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
        };

        if (!data.period) {
            showToast('Reporting period is required', 'error');
            return;
        }

        const existing = this.getMonthlyReports().find(r => r.period === data.period);
        try {
            if (existing) {
                storage.update('workloadMonthlyReports', existing.id, data);
                showToast('Monthly workload report updated', 'success');
            } else {
                storage.create('workloadMonthlyReports', data);
                showToast('Monthly workload report saved', 'success');
            }
            document.getElementById('workloadMonthlyForm').reset();
            document.getElementById('workloadMonthlyPeriod').value = this.monthlyPeriod;
            this.renderMonthly();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    populateFilters() {
        const select = document.getElementById('workloadDeptFilter');
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

    renderStats(samples, results) {
        const verified = results.filter(r => r.verifiedBy).length;
        const avgPerDay = Math.round((samples.length / Math.max(this.daysFilter, 1)) * 10) / 10;

        const container = document.getElementById('workloadStats');
        if (!container) return;
        const block = (value, label, sub, color) => `
            <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                <div style="font-size:var(--text-3xl); font-weight:700; color:${color};">${value}</div>
                <div style="font-size:var(--text-sm); color:var(--gray-600);">${label}</div>
                <div style="font-size:var(--text-xs); color:var(--gray-400);">${sub}</div>
            </div>`;

        container.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:1rem;">
                    ${block(samples.length, 'Samples Processed', `last ${this.daysFilter} day(s)`, 'var(--primary-500)')}
                    ${block(results.length, 'Results Entered', `last ${this.daysFilter} day(s)`, 'var(--info)')}
                    ${block(verified, 'Results Verified', `${results.length ? Math.round(verified / results.length * 100) : 0}% of entered`, 'var(--success)')}
                    ${block(avgPerDay, 'Avg Samples / Day', 'workload pace', 'var(--gray-700)')}
                </div>
            </div>`;
    }

    renderStaffTable(samples, results) {
        const tbody = document.getElementById('workloadStaffBody');
        if (!tbody) return;

        const staff = {};
        const bump = (name, field) => {
            if (!name) return;
            if (!staff[name]) staff[name] = { collected: 0, entered: 0, verified: 0 };
            staff[name][field]++;
        };

        samples.forEach(s => bump(s.collector, 'collected'));
        results.forEach(r => {
            bump(r.enteredBy, 'entered');
            bump(r.verifiedBy, 'verified');
        });

        const names = Object.keys(staff).sort((a, b) => {
            const totalA = staff[a].collected + staff[a].entered + staff[a].verified;
            const totalB = staff[b].collected + staff[b].entered + staff[b].verified;
            return totalB - totalA;
        });

        if (names.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:2rem;">No workload data recorded for this period</td></tr>`;
            return;
        }

        tbody.innerHTML = names.map(name => {
            const s = staff[name];
            const total = s.collected + s.entered + s.verified;
            return `
                <tr>
                    <td>${Utils.escapeHtml(name)}</td>
                    <td>${s.collected}</td>
                    <td>${s.entered}</td>
                    <td>${s.verified}</td>
                    <td><strong>${total}</strong></td>
                </tr>`;
        }).join('');
    }

    renderDeptChart(samples) {
        const byDept = {};
        samples.forEach(s => {
            const dept = s.department || 'Unspecified';
            byDept[dept] = (byDept[dept] || 0) + 1;
        });
        const labels = Object.keys(byDept);
        const values = labels.map(d => byDept[d]);
        Utils.drawBarChart('workloadDeptChart', labels, values, { emptyText: 'No samples in this period' });
    }

    renderTrendChart(samples) {
        const days = Math.min(this.daysFilter, 30);
        const labels = [];
        const values = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = new Date();
            day.setDate(day.getDate() - i);
            const dayStr = day.toISOString().split('T')[0];
            labels.push(Utils.formatDate(dayStr, 'MM/DD'));
            values.push(samples.filter(s => (s.collectionDate || s.createdAt || '').startsWith(dayStr)).length);
        }
        Utils.drawLineChart('workloadTrendChart', labels, values, { emptyText: 'No samples in this period' });
    }

    renderEquipment() {
        const container = document.getElementById('workloadEquipment');
        if (!container) return;
        const equipment = storage.getAll('equipment') || [];
        if (equipment.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No equipment records found</p></div>`;
            return;
        }
        const counts = {};
        equipment.forEach(e => {
            const status = e.status || 'Operational';
            counts[status] = (counts[status] || 0) + 1;
        });
        const badgeClass = { 'Operational': 'badge-success', 'Under Maintenance': 'badge-warning', 'Down': 'badge-danger', 'Decommissioned': 'badge-secondary' };
        container.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:0.75rem;">
                ${Object.entries(counts).map(([status, count]) => `
                    <span class="badge ${badgeClass[status] || 'badge-secondary'}" style="font-size:var(--text-sm); padding:0.5rem 0.85rem;">
                        ${Utils.escapeHtml(status)}: ${count}
                    </span>`).join('')}
            </div>`;
    }
}

let workloadManager;
document.addEventListener('DOMContentLoaded', function () {
    workloadManager = new WorkloadManager();
    window.workloadManager = workloadManager;
});
