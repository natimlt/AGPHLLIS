/**
 * ======================================================
 * AGPHL LIS - Dashboard Customization Module
 * Version: 1.0
 *
 * Lets an Administrator or Quality Officer tailor the
 * monitoring dashboards to the lab's own workflow:
 *   - show/hide individual widgets on TAT, Availability,
 *     QI, and Workload dashboards
 *   - adjust the priority multipliers used to derive a
 *     sample's target TAT (Routine/Urgent/ASAP/Stat)
 *   - edit ISO 15189:2022 Quality Indicator targets,
 *     direction, and whether each indicator is tracked
 * ======================================================
 */

class CustomizationManager {
    constructor() {
        this.init();
    }

    init() {
        if (!document.getElementById('customizationPage')) return;
        this.applyPermissions();
        if (!window.auth?.hasPermission('manage_customization')) return;
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'customization') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_customization');
        if (!canManage) {
            const container = document.getElementById('customizationPage');
            if (container) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><h3>Access Restricted</h3><p>Only Administrators and Quality Officers can customize dashboards.</p></div>`;
            }
        }
    }

    setupEventListeners() {
        document.getElementById('widgetConfigForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWidgetConfig();
        });
        document.getElementById('tatMultiplierForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTatMultipliers();
        });
        document.getElementById('resetCustomizationBtn')?.addEventListener('click', () => {
            if (!confirm('Reset all dashboard customization to system defaults?')) return;
            configManager.reset();
            this.render();
            showToast('Customization reset to defaults', 'success');
        });
    }

    render() {
        const config = configManager.get();
        this.renderWidgetToggles(config);
        this.renderTatMultipliers(config);
        this.renderQiEditor();
    }

    renderWidgetToggles(config) {
        const groups = {
            tat: { label: 'TAT Monitoring', items: { stats: 'Summary stat cards', deptChart: 'Avg TAT by department chart', trendChart: 'Compliance trend chart', table: 'Sample detail table' } },
            availability: { label: 'Test Availability', items: { stats: 'Summary stat cards', table: 'Test catalog table' } },
            qi: { label: 'Quality Indicators', items: { summary: 'Summary stat cards', register: 'Indicator register table' } },
            workload: { label: 'Workload Monitoring', items: { stats: 'Summary stat cards', deptChart: 'Samples by department chart', trendChart: 'Daily volume chart', staffTable: 'Staff productivity table', equipment: 'Equipment status panel' } }
        };

        const container = document.getElementById('widgetConfigForm');
        if (!container) return;

        let html = '';
        Object.entries(groups).forEach(([key, group]) => {
            html += `<div class="customization-group">
                <h4>${Utils.escapeHtml(group.label)}</h4>
                <div class="customization-checks">`;
            Object.entries(group.items).forEach(([itemKey, label]) => {
                const checked = config.widgets[key]?.[itemKey] !== false;
                html += `
                    <label class="checkbox-label" style="margin-bottom:0.5rem;">
                        <input type="checkbox" data-module="${key}" data-widget="${itemKey}" ${checked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        ${Utils.escapeHtml(label)}
                    </label>`;
            });
            html += `</div></div>`;
        });
        html += `<div class="modal-footer" style="padding:0; border:none; margin-top:1rem; justify-content:flex-start;">
            <button type="submit" class="btn btn-primary">Save Widget Visibility</button>
        </div>`;
        container.innerHTML = html;
    }

    saveWidgetConfig() {
        const widgets = {};
        document.querySelectorAll('#widgetConfigForm input[type="checkbox"]').forEach(cb => {
            const mod = cb.dataset.module;
            const widget = cb.dataset.widget;
            if (!widgets[mod]) widgets[mod] = {};
            widgets[mod][widget] = cb.checked;
        });
        configManager.set({ widgets });
        showToast('Widget visibility saved. Changes apply next time you open each dashboard.', 'success');
    }

    renderTatMultipliers(config) {
        const container = document.getElementById('tatMultiplierForm');
        if (!container) return;
        const m = config.tatMultipliers;
        container.innerHTML = `
            <p style="color:var(--gray-500); font-size:var(--text-sm); margin:0 0 1rem;">
                A sample's target TAT is the matching test's base target TAT (from Test Availability)
                multiplied by the priority factor below. Lower = faster required turnaround.
            </p>
            <div class="form-row">
                <div class="form-group">
                    <label>Routine</label>
                    <input type="number" step="0.05" min="0.05" max="2" id="multRoutine" value="${m.Routine}">
                </div>
                <div class="form-group">
                    <label>Urgent</label>
                    <input type="number" step="0.05" min="0.05" max="2" id="multUrgent" value="${m.Urgent}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ASAP</label>
                    <input type="number" step="0.05" min="0.05" max="2" id="multASAP" value="${m.ASAP}">
                </div>
                <div class="form-group">
                    <label>Stat</label>
                    <input type="number" step="0.05" min="0.05" max="2" id="multStat" value="${m.Stat}">
                </div>
            </div>
            <div class="modal-footer" style="padding:0; border:none; margin-top:1rem; justify-content:flex-start;">
                <button type="submit" class="btn btn-primary">Save Multipliers</button>
            </div>`;
    }

    saveTatMultipliers() {
        const tatMultipliers = {
            Routine: parseFloat(document.getElementById('multRoutine').value) || 1,
            Urgent: parseFloat(document.getElementById('multUrgent').value) || 0.7,
            ASAP: parseFloat(document.getElementById('multASAP').value) || 0.5,
            Stat: parseFloat(document.getElementById('multStat').value) || 0.4
        };
        configManager.set({ tatMultipliers });
        showToast('TAT priority multipliers saved', 'success');
    }

    renderQiEditor() {
        const tbody = document.getElementById('qiEditorBody');
        if (!tbody) return;
        const defs = storage.getAll('qiDefinitions') || [];

        tbody.innerHTML = defs.map(d => `
            <tr>
                <td>${Utils.escapeHtml(d.code)}</td>
                <td>${Utils.escapeHtml(d.name)}</td>
                <td>${Utils.escapeHtml(d.category)}</td>
                <td><input type="number" step="0.1" style="width:80px;" value="${d.target}" data-qi-id="${d.id}" data-field="target"></td>
                <td>
                    <select data-qi-id="${d.id}" data-field="direction">
                        <option value="lower" ${d.direction === 'lower' ? 'selected' : ''}>Lower is better</option>
                        <option value="higher" ${d.direction === 'higher' ? 'selected' : ''}>Higher is better</option>
                    </select>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" data-qi-id="${d.id}" data-field="active" ${d.active !== false ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', (e) => this.updateQiDefinition(e.target));
        });
    }

    updateQiDefinition(input) {
        const id = input.dataset.qiId;
        const field = input.dataset.field;
        let value = input.type === 'checkbox' ? input.checked : input.value;
        if (field === 'target') value = parseFloat(value) || 0;

        try {
            storage.update('qiDefinitions', id, { [field]: value });
            showToast('Indicator updated', 'success');
        } catch (err) {
            showToast('Failed to update indicator: ' + err.message, 'error');
        }
    }
}

let customizationManager;
document.addEventListener('DOMContentLoaded', function () {
    customizationManager = new CustomizationManager();
    window.customizationManager = customizationManager;
});
