/**
 * ======================================================
 * AGPHL LIS - Quality Indicators (QI) Module
 * Version: 2.0
 *
 * Implements an ISO 15189:2022-aligned Quality Indicator
 * register (clause 4.14 / 8.6 - Quality Indicators and
 * monitoring of laboratory contribution to patient care).
 * Several indicators are auto-calculated from existing
 * data (rejections, TAT, IQC, EQA, test availability);
 * the rest are recorded monthly by the Quality Officer.
 * ======================================================
 */

class QIManager {
    constructor() {
        this.period = new Date().toISOString().slice(0, 7); // YYYY-MM
        this.trendCode = null;
        this.init();
    }

    init() {
        if (!document.getElementById('qiPage')) return;
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'qi') this.render();
        });
    }

    setupEventListeners() {
        const periodInput = document.getElementById('qiPeriod');
        if (periodInput) {
            periodInput.value = this.period;
            periodInput.addEventListener('change', (e) => {
                this.period = e.target.value || this.period;
                this.render();
            });
        }
        document.getElementById('qiRecalcAllBtn')?.addEventListener('click', () => {
            this.recalculateAuto();
            this.render();
            showToast('Auto-calculated indicators refreshed', 'success');
        });
        document.getElementById('qiManualForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveManualEntry();
        });
    }

    getDefinitions() {
        return (storage.getAll('qiDefinitions') || []).filter(d => d.active !== false);
    }

    getRecord(code, period) {
        return (storage.getAll('qiRecords') || []).find(r => r.qiCode === code && r.period === period);
    }

    upsertRecord(code, period, value, source, note = '') {
        const def = this.getDefinitions().find(d => d.code === code);
        if (!def) return;
        const met = def.direction === 'lower' ? value <= def.target : value >= def.target;
        const existing = this.getRecord(code, period);
        const payload = {
            qiCode: code, period, value, target: def.target, direction: def.direction,
            status: met ? 'Met' : 'Not Met', source, note,
            recordedBy: window.auth?.getCurrentUser()?.fullName || 'system',
            recordedAt: new Date().toISOString()
        };
        if (existing) {
            storage.update('qiRecords', existing.id, payload);
        } else {
            storage.create('qiRecords', payload);
        }
    }

    /** Auto-calculate the indicators that can be derived from existing data */
    recalculateAuto() {
        const period = this.period;
        const samples = (storage.getAllScoped('samples') || []).filter(s => (s.collectionDate || s.createdAt || '').startsWith(period));

        // QI-01 Sample Rejection Rate
        if (samples.length) {
            const rejected = samples.filter(s => s.status === 'Rejected').length;
            this.upsertRecord('QI-01', period, +(rejected / samples.length * 100).toFixed(1), 'auto');
        }

        // QI-03 / QI-04 TAT Compliance, split by priority class
        if (window.tatManager) {
            const catalog = storage.getAll('testCatalog') || [];
            const routine = samples.filter(s => (s.priority || 'Routine') === 'Routine')
                .map(s => window.tatManager.computeTAT(s, catalog)).filter(r => r && r.complete);
            const urgent = samples.filter(s => ['Stat', 'Urgent', 'ASAP'].includes(s.priority))
                .map(s => window.tatManager.computeTAT(s, catalog)).filter(r => r && r.complete);

            if (routine.length) {
                const onTime = routine.filter(r => r.status === 'On Time').length;
                this.upsertRecord('QI-03', period, +(onTime / routine.length * 100).toFixed(1), 'auto');
            }
            if (urgent.length) {
                const onTime = urgent.filter(r => r.status === 'On Time').length;
                this.upsertRecord('QI-04', period, +(onTime / urgent.length * 100).toFixed(1), 'auto');
            }
        }

        // QI-07 Internal QC Failure Rate
        const iqc = (storage.getAll('iqc') || []).filter(i => (i.date || '').startsWith(period));
        if (iqc.length) {
            const failed = iqc.filter(i => !i.inControl).length;
            this.upsertRecord('QI-07', period, +(failed / iqc.length * 100).toFixed(1), 'auto');
        }

        // QI-08 EQA Acceptable Performance Rate
        const eqa = (storage.getAll('eqa') || []).filter(e => (e.evaluatedDate || e.receivedDate || '').startsWith(period));
        if (eqa.length) {
            const passed = eqa.filter(e => e.status === 'Passed').length;
            this.upsertRecord('QI-08', period, +(passed / eqa.length * 100).toFixed(1), 'auto');
        }

        // QI-11 Test Availability Rate (current snapshot)
        const catalog = storage.getAll('testCatalog') || [];
        if (catalog.length) {
            const available = catalog.filter(t => t.status === 'Available').length;
            this.upsertRecord('QI-11', period, +(available / catalog.length * 100).toFixed(1), 'auto');
        }
    }

    render() {
        this.recalculateAuto();
        const widgets = (window.configManager ? configManager.get().widgets.qi : null) || { summary: true, register: true };
        this.toggleVisible('qiSummary', widgets.summary);
        this.toggleVisible('qiRegisterCard', widgets.register);
        if (widgets.summary) this.renderSummary();
        if (widgets.register) this.renderRegister();
        if (this.trendCode) this.renderTrend(this.trendCode);
    }

    toggleVisible(id, visible) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    }

    renderSummary() {
        const defs = this.getDefinitions();
        const records = defs.map(d => this.getRecord(d.code, this.period)).filter(Boolean);
        const met = records.filter(r => r.status === 'Met').length;
        const score = records.length ? Math.round((met / records.length) * 100) : 0;

        const container = document.getElementById('qiSummary');
        if (!container) return;
        container.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                        <div style="font-size:var(--text-3xl); font-weight:700; color:${score >= 80 ? 'var(--success)' : score >= 60 ? '#856404' : 'var(--danger)'};">${score}%</div>
                        <div style="font-size:var(--text-sm); color:var(--gray-600);">Indicators Met</div>
                        <div style="font-size:var(--text-xs); color:var(--gray-400);">${met}/${records.length} for ${this.period}</div>
                    </div>
                    <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                        <div style="font-size:var(--text-3xl); font-weight:700; color:var(--primary-500);">${defs.length}</div>
                        <div style="font-size:var(--text-sm); color:var(--gray-600);">Indicators Tracked</div>
                        <div style="font-size:var(--text-xs); color:var(--gray-400);">ISO 15189:2022 aligned</div>
                    </div>
                    <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                        <div style="font-size:var(--text-3xl); font-weight:700; color:${records.length - met > 0 ? 'var(--danger)' : 'var(--success)'};">${records.length - met}</div>
                        <div style="font-size:var(--text-sm); color:var(--gray-600);">Not Meeting Target</div>
                        <div style="font-size:var(--text-xs); color:var(--gray-400);">review with CAPA where needed</div>
                    </div>
                </div>
            </div>`;
    }

    renderRegister() {
        const tbody = document.getElementById('qiTableBody');
        if (!tbody) return;
        const defs = this.getDefinitions();
        const canManage = window.auth?.hasPermission('manage_qi');
        const autoCodes = ['QI-01', 'QI-03', 'QI-04', 'QI-07', 'QI-08', 'QI-11'];

        const categories = [...new Set(defs.map(d => d.category))];
        let rows = '';

        categories.forEach(cat => {
            rows += `<tr style="background:var(--gray-50);"><td colspan="7" style="font-weight:600; padding:0.5rem 0.75rem;">${Utils.escapeHtml(cat)}</td></tr>`;
            defs.filter(d => d.category === cat).forEach(d => {
                const record = this.getRecord(d.code, this.period);
                const isAuto = autoCodes.includes(d.code);
                rows += `
                    <tr>
                        <td>${Utils.escapeHtml(d.code)}</td>
                        <td>${Utils.escapeHtml(d.name)}</td>
                        <td>${d.target}${d.unit === '%' ? '%' : ' ' + Utils.escapeHtml(d.unit)} (${d.direction === 'lower' ? 'max' : 'min'})</td>
                        <td>${record ? record.value + (d.unit === '%' ? '%' : ' ' + Utils.escapeHtml(d.unit)) : '<span style="color:var(--gray-400);">No data</span>'}</td>
                        <td>${record ? `<span class="badge ${record.status === 'Met' ? 'badge-success' : 'badge-danger'}">${record.status}</span>` : '-'}</td>
                        <td><span class="badge badge-secondary">${isAuto ? 'Auto' : 'Manual'}</span></td>
                        <td class="actions">
                            <button class="edit-btn" title="View trend" onclick="qiManager.showTrend('${d.code}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M19 9l-5 5-4-4-3 3"/></svg>
                            </button>
                            ${!isAuto && canManage ? `
                            <button class="edit-btn" title="Enter value" onclick="qiManager.openManualEntry('${d.code}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>` : ''}
                        </td>
                    </tr>`;
            });
        });

        tbody.innerHTML = rows;
    }

    openManualEntry(code) {
        const def = this.getDefinitions().find(d => d.code === code);
        if (!def) return;
        const record = this.getRecord(code, this.period);
        document.getElementById('qiManualModalTitle').textContent = `${def.code} - ${def.name}`;
        document.getElementById('qiManualCode').value = code;
        document.getElementById('qiManualValue').value = record ? record.value : '';
        document.getElementById('qiManualUnit').textContent = def.unit;
        document.getElementById('qiManualTarget').textContent = `Target: ${def.direction === 'lower' ? '≤' : '≥'} ${def.target} ${def.unit}`;
        document.getElementById('qiManualNote').value = record ? (record.note || '') : '';
        document.getElementById('qiManualModal').style.display = 'flex';
    }

    closeManualModal() {
        document.getElementById('qiManualModal').style.display = 'none';
    }

    saveManualEntry() {
        if (!window.auth?.hasPermission('manage_qi')) {
            showToast('You do not have permission to record quality indicators', 'error');
            return;
        }
        const code = document.getElementById('qiManualCode').value;
        const value = parseFloat(document.getElementById('qiManualValue').value);
        const note = document.getElementById('qiManualNote').value.trim();
        if (isNaN(value)) {
            showToast('Please enter a numeric value', 'error');
            return;
        }
        this.upsertRecord(code, this.period, value, 'manual', note);
        this.closeManualModal();
        this.render();
        showToast('Quality indicator recorded', 'success');
    }

    showTrend(code) {
        this.trendCode = code;
        document.getElementById('qiTrendPanel').style.display = 'block';
        this.renderTrend(code);
    }

    renderTrend(code) {
        const def = this.getDefinitions().find(d => d.code === code);
        if (!def) return;
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(d.toISOString().slice(0, 7));
        }
        const values = months.map(m => {
            const r = this.getRecord(code, m);
            return r ? r.value : 0;
        });
        document.getElementById('qiTrendTitle').textContent = `${def.code} - ${def.name} (last 6 months)`;
        Utils.drawLineChart('qiTrendChart', months, values, {
            valueFormatter: v => v + (def.unit === '%' ? '%' : ''),
            targetLine: def.target,
            emptyText: 'No recorded data yet for this indicator'
        });
    }
}

let qiManager;
document.addEventListener('DOMContentLoaded', function () {
    qiManager = new QIManager();
    window.qiManager = qiManager;
});
