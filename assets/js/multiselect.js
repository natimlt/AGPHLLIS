/**
 * ======================================================
 * AGPHL LIS - Multi-Select Dropdown Widget
 * Version: 1.0
 *
 * A lightweight, dependency-free multi-select control used
 * by filter toolbars (Patients, Samples) so a person can
 * filter by several departments/sample types/tests at once
 * instead of being limited to one value. Renders a button
 * that opens a checkbox panel; selections are reported back
 * via a callback rather than a native <select multiple>,
 * which is clunky to use with the mouse.
 * ======================================================
 */

class MultiSelectDropdown {
    /**
     * @param {string} containerId - element to render into (replaces its contents)
     * @param {string} placeholder - label shown when nothing is selected, e.g. "All Departments"
     * @param {Array<{value:string,label:string}>} options
     * @param {(selected: string[]) => void} onChange
     */
    constructor(containerId, placeholder, options, onChange) {
        this.container = document.getElementById(containerId);
        this.placeholder = placeholder;
        this.options = options;
        this.onChange = onChange;
        this.selected = new Set();
        this.open = false;
        if (this.container) this.render();
    }

    setOptions(options) {
        this.options = options;
        this.render();
    }

    getSelected() {
        return [...this.selected];
    }

    clear() {
        this.selected.clear();
        this.render();
        this.onChange(this.getSelected());
    }

    label() {
        if (this.selected.size === 0) return this.placeholder;
        if (this.selected.size === 1) {
            const opt = this.options.find(o => o.value === [...this.selected][0]);
            return opt ? opt.label : `${this.placeholder.replace('All ', '')} (1)`;
        }
        return `${this.selected.size} selected`;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="multiselect-dropdown">
                <button type="button" class="filter-select multiselect-btn">
                    <span class="multiselect-label">${Utils.escapeHtml(this.label())}</span>
                    <span class="multiselect-arrow">▾</span>
                </button>
                <div class="multiselect-panel" style="display:none;">
                    <div class="multiselect-panel-actions">
                        <button type="button" class="btn-link multiselect-clear">Clear</button>
                    </div>
                    ${this.options.map(o => `
                        <label class="checkbox-label multiselect-option">
                            <input type="checkbox" value="${Utils.escapeHtml(o.value)}" ${this.selected.has(o.value) ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            ${Utils.escapeHtml(o.label)}
                        </label>`).join('')}
                </div>
            </div>`;

        const btn = this.container.querySelector('.multiselect-btn');
        const panel = this.container.querySelector('.multiselect-panel');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.multiselect-panel').forEach(p => { if (p !== panel) p.style.display = 'none'; });
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) this.selected.add(cb.value);
                else this.selected.delete(cb.value);
                this.container.querySelector('.multiselect-label').textContent = this.label();
                this.onChange(this.getSelected());
            });
        });

        this.container.querySelector('.multiselect-clear').addEventListener('click', (e) => {
            e.stopPropagation();
            this.clear();
        });

        if (!this._outsideClickBound) {
            document.addEventListener('click', (e) => {
                if (this.container && !this.container.contains(e.target)) {
                    const p = this.container.querySelector('.multiselect-panel');
                    if (p) p.style.display = 'none';
                }
            });
            this._outsideClickBound = true;
        }
    }
}
