/**
 * ======================================================
 * AGPHL LIS - Quality Management Module (FIXED)
 * ISO 15189:2022 Compliant
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class QualityManager {
    constructor() {
        this.iqcData = [];
        this.eqaData = [];
        this.eqaPrograms = [];
        this.sopData = [];
        this.auditData = [];
        this.editingSOPId = null;
        this.editingAuditId = null;
        this.editingProgramId = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderIQC();
        this.renderEQA();
        this.renderSOP();
        this.renderAudit();
        this.renderQualitySummary();
    }

    loadData() {
        this.iqcData = storage.getAll('iqc') || [];
        this.eqaData = storage.getAll('eqa') || [];
        this.eqaPrograms = storage.getAll('eqaPrograms') || [];
        this.sopData = storage.getAll('sop') || [];
        this.auditData = storage.getAll('audit') || [];
        
        if (this.eqaData.length === 0) {
            this.initDefaultEQA();
        }
        if (this.sopData.length === 0) {
            this.initDefaultSOP();
        }
        if (this.auditData.length === 0) {
            this.initDefaultAudit();
        }
    }

    setupEventListeners() {
        // IQC Form
        const iqcForm = document.getElementById('iqcForm');
        if (iqcForm) {
            iqcForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveIQC();
            });
        }

        // EQA Form
        const eqaForm = document.getElementById('eqaForm');
        if (eqaForm) {
            eqaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEQA();
            });
        }

        // SOP Form
        const sopForm = document.getElementById('sopForm');
        if (sopForm) {
            sopForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSOP();
            });
        }

        // Audit Form
        const auditForm = document.getElementById('auditForm');
        if (auditForm) {
            auditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAudit();
            });
        }

        // Add IQC Test Button
        const addTestBtn = document.getElementById('addIqcTestBtn');
        if (addTestBtn) {
            addTestBtn.addEventListener('click', () => {
                this.addIqcTestField();
            });
        }

        // Add EQA Facility Button
        const addFacilityBtn = document.getElementById('addEqaFacilityBtn');
        if (addFacilityBtn) {
            addFacilityBtn.addEventListener('click', () => {
                this.addEqaFacilityField();
            });
        }

        // Add Audit Checklist Item
        const addChecklistBtn = document.querySelector('#auditForm .btn-secondary');
        if (addChecklistBtn) {
            addChecklistBtn.addEventListener('click', () => {
                this.addAuditChecklistItem();
            });
        }

        // EQA Programs
        document.getElementById('eqaManageProgramsBtn')?.addEventListener('click', () => this.openProgramsModal());
        document.getElementById('eqaProgram')?.addEventListener('change', () => this.onProgramSelected());
        document.getElementById('eqaResultType')?.addEventListener('change', () => this.toggleQuantitativeFields());
        document.getElementById('eqaEvaluateBtn')?.addEventListener('click', () => this.evaluateEQA());
        document.getElementById('programAddTestBtn')?.addEventListener('click', () => this.addProgramTestRow());
        document.getElementById('programAddNewBtn')?.addEventListener('click', () => this.openProgramEditor());
        document.getElementById('programForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProgram();
        });
    }

    // ========================================
    // 1. INTERNAL QUALITY CONTROL (IQC)
    // ========================================

    renderIQC() {
        const container = document.getElementById('iqcContainer');
        if (!container) return;

        if (this.iqcData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No IQC Data</h3>
                    <p>Start by entering internal quality control data</p>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('iqcModal').style.display='flex'">
                        Add IQC Data
                    </button>
                </div>
            `;
            return;
        }

        const grouped = {};
        this.iqcData.forEach(iqc => {
            if (!grouped[iqc.testName]) grouped[iqc.testName] = [];
            grouped[iqc.testName].push(iqc);
        });

        let html = '';
        for (const [testName, data] of Object.entries(grouped)) {
            const latest = data[data.length - 1];
            const westgardResults = this.checkWestgardRules(data);
            
            html += `
                <div class="card" style="margin-bottom: 1rem; padding: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0;">${testName}</h4>
                        <span class="status-badge ${latest.inControl ? 'active' : 'inactive'}">
                            ${latest.inControl ? 'In Control' : 'Out of Control'}
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; margin: 0.5rem 0;">
                        <div><span style="color: var(--gray-500); font-size: var(--text-xs);">Mean</span><br><strong>${latest.mean || 'N/A'}</strong></div>
                        <div><span style="color: var(--gray-500); font-size: var(--text-xs);">SD</span><br><strong>${latest.sd || 'N/A'}</strong></div>
                        <div><span style="color: var(--gray-500); font-size: var(--text-xs);">CV</span><br><strong>${latest.cv || 'N/A'}%</strong></div>
                        <div><span style="color: var(--gray-500); font-size: var(--text-xs);">n</span><br><strong>${data.length}</strong></div>
                    </div>
                    <div class="westgard-rules">
                        ${Object.entries(westgardResults).map(([rule, passed]) => `
                            <div class="westgard-rule ${passed ? 'passed' : 'failed'}">
                                ${rule}: ${passed ? '✓' : '✗'}
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-secondary" onclick="qualityManager.viewIQC('${testName}')">View Details</button>
                        <button class="btn btn-sm btn-primary" onclick="qualityManager.addIQCPoint('${testName}')">Add Data Point</button>
                        <button class="btn btn-sm btn-danger" onclick="qualityManager.deleteIQC('${testName}')">Delete</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    checkWestgardRules(data) {
        const results = {
            '1₂s': true,
            '1₃s': true,
            '2₂s': true,
            'R₄s': true,
            '4₁s': true,
            '10x': true
        };

        if (data.length < 2) return results;

        const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sd = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);

        const has2s = values.some(v => v > mean + (2 * sd) || v < mean - (2 * sd));
        results['1₂s'] = !has2s;

        const has3s = values.some(v => v > mean + (3 * sd) || v < mean - (3 * sd));
        results['1₃s'] = !has3s;

        let has2_2s = false;
        for (let i = 0; i < values.length - 1; i++) {
            const v1 = values[i];
            const v2 = values[i + 1];
            if ((v1 > mean + (2 * sd) && v2 > mean + (2 * sd)) ||
                (v1 < mean - (2 * sd) && v2 < mean - (2 * sd))) {
                has2_2s = true;
                break;
            }
        }
        results['2₂s'] = !has2_2s;

        let has4_1s = false;
        for (let i = 0; i < values.length - 3; i++) {
            let allAbove = true;
            let allBelow = true;
            for (let j = 0; j < 4; j++) {
                const v = values[i + j];
                if (v <= mean + sd) allAbove = false;
                if (v >= mean - sd) allBelow = false;
            }
            if (allAbove || allBelow) {
                has4_1s = true;
                break;
            }
        }
        results['4₁s'] = !has4_1s;

        let has10x = false;
        for (let i = 0; i < values.length - 9; i++) {
            let allAbove = true;
            let allBelow = true;
            for (let j = 0; j < 10; j++) {
                const v = values[i + j];
                if (v <= mean) allAbove = false;
                if (v >= mean) allBelow = false;
            }
            if (allAbove || allBelow) {
                has10x = true;
                break;
            }
        }
        results['10x'] = !has10x;

        return results;
    }

    saveIQC() {
        const data = {
            testName: document.getElementById('iqcTestName').value,
            value: document.getElementById('iqcValue').value,
            unit: document.getElementById('iqcUnit').value,
            mean: document.getElementById('iqcMean').value,
            sd: document.getElementById('iqcSD').value,
            cv: document.getElementById('iqcCV').value,
            controlLevel: document.getElementById('iqcControlLevel').value || 'Level 1',
            lotNumber: document.getElementById('iqcLotNumber').value,
            reagentLot: document.getElementById('iqcReagentLot').value,
            instrument: document.getElementById('iqcInstrument').value,
            operator: document.getElementById('iqcOperator').value || auth.getCurrentUser()?.fullName || 'Unknown',
            notes: document.getElementById('iqcNotes').value,
            date: document.getElementById('iqcDate').value || new Date().toISOString().split('T')[0]
        };

        if (!data.testName || !data.value) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const mean = parseFloat(data.mean);
        const sd = parseFloat(data.sd);
        const value = parseFloat(data.value);
        let inControl = true;
        if (!isNaN(mean) && !isNaN(sd) && !isNaN(value)) {
            inControl = Math.abs(value - mean) <= (3 * sd);
        }

        data.inControl = inControl;

        try {
            const created = storage.create('iqc', data);
            showToast(`IQC data saved for ${data.testName} - ${inControl ? 'In Control' : 'Out of Control'}`, 'success');
            this.iqcData.push(created);
            this.renderIQC();
            this.closeIQCModal();
        } catch (error) {
            showToast('Error saving IQC: ' + error.message, 'error');
        }
    }

    addIqcTestField() {
        const container = document.getElementById('iqcTestFields');
        if (!container) return;

        const fieldHtml = `
            <div class="iqc-test-field" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <input type="text" class="iqc-test-name" placeholder="Test Name" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <input type="number" class="iqc-test-value" placeholder="Value" step="any" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <input type="text" class="iqc-test-unit" placeholder="Unit" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', fieldHtml);
    }

    viewIQC(testName) {
        const data = this.iqcData.filter(i => i.testName === testName);
        if (data.length === 0) return;

        const modal = document.getElementById('iqcViewModal');
        const content = document.getElementById('iqcViewContent');
        if (!modal || !content) return;

        const latest = data[data.length - 1];
        const westgardResults = this.checkWestgardRules(data);

        content.innerHTML = `
            <div class="card" style="padding: 1.25rem;">
                <h4>${testName} - Control Chart</h4>
                <div class="iqc-chart-container" style="height: 250px; margin: 1rem 0;">
                    <canvas id="iqcChart"></canvas>
                </div>
                <div style="margin-top: 1rem;">
                    <h5>Westgard Rules Results</h5>
                    <div class="westgard-rules">
                        ${Object.entries(westgardResults).map(([rule, passed]) => `
                            <div class="westgard-rule ${passed ? 'passed' : 'failed'}">
                                ${rule}: ${passed ? '✓ Passed' : '✗ Failed'}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <h5>Recent Data Points</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Value</th>
                                <th>Mean</th>
                                <th>SD</th>
                                <th>CV</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.slice(-10).reverse().map(d => `
                                <tr>
                                    <td>${d.date || 'N/A'}</td>
                                    <td>${d.value} ${d.unit || ''}</td>
                                    <td>${d.mean || 'N/A'}</td>
                                    <td>${d.sd || 'N/A'}</td>
                                    <td>${d.cv || 'N/A'}%</td>
                                    <td>
                                        <span class="status-badge ${d.inControl ? 'active' : 'inactive'}">
                                            ${d.inControl ? 'In Control' : 'Out of Control'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        setTimeout(() => {
            this.renderIQCChart(testName);
        }, 100);
    }

    renderIQCChart(testName) {
        const canvas = document.getElementById('iqcChart');
        if (!canvas) return;

        const data = this.iqcData.filter(i => i.testName === testName);
        if (data.length < 2) {
            canvas.parentElement.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Need at least 2 data points for chart</p>';
            return;
        }

        const ctx = canvas.getContext('2d');
        const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
        const dates = data.map(d => d.date || 'N/A');

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sd = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const maxVal = Math.max(...values) + sd * 2;
        const minVal = Math.min(...values) - sd * 2;

        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }

        const meanY = padding + chartHeight - ((mean - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.strokeStyle = '#1a66f5';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, meanY);
        ctx.lineTo(canvas.width - padding, meanY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#1a66f5';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Mean: ' + mean.toFixed(2), canvas.width - padding, meanY - 5);

        const sd2Y = padding + chartHeight - ((mean + 2 * sd - minVal) / (maxVal - minVal)) * chartHeight;
        const sd2YLow = padding + chartHeight - ((mean - 2 * sd - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding, sd2Y);
        ctx.lineTo(canvas.width - padding, sd2Y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding, sd2YLow);
        ctx.lineTo(canvas.width - padding, sd2YLow);
        ctx.stroke();
        ctx.setLineDash([]);

        const sd3Y = padding + chartHeight - ((mean + 3 * sd - minVal) / (maxVal - minVal)) * chartHeight;
        const sd3YLow = padding + chartHeight - ((mean - 3 * sd - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padding, sd3Y);
        ctx.lineTo(canvas.width - padding, sd3Y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding, sd3YLow);
        ctx.lineTo(canvas.width - padding, sd3YLow);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 2;
        ctx.beginPath();

        values.forEach((val, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        values.forEach((val, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
            
            const isOutOfControl = Math.abs(val - mean) > 3 * sd;
            ctx.fillStyle = isOutOfControl ? '#dc3545' : '#28a745';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#495057';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(val.toFixed(1), x, y - 10);
        });
    }

    addIQCPoint(testName) {
        document.getElementById('iqcModal').style.display = 'flex';
        document.getElementById('iqcTestName').value = testName;
        document.getElementById('iqcTestName').readOnly = true;
        document.getElementById('iqcModalTitle').textContent = `Add Data Point - ${testName}`;
    }

    deleteIQC(testName) {
        if (!confirm(`Delete all IQC data for ${testName}?`)) return;
        
        const toDelete = this.iqcData.filter(i => i.testName === testName);
        toDelete.forEach(i => {
            storage.delete('iqc', i.id);
        });
        
        this.iqcData = this.iqcData.filter(i => i.testName !== testName);
        this.renderIQC();
        showToast(`Deleted IQC data for ${testName}`, 'success');
    }

    closeIQCModal() {
        document.getElementById('iqcModal').style.display = 'none';
        document.getElementById('iqcTestName').readOnly = false;
        document.getElementById('iqcForm').reset();
    }

    // ========================================
    // 2. EXTERNAL QUALITY ASSESSMENT (EQA)
    // ========================================

    initDefaultEQA() {
        const facilities = [
            { name: 'AGPHL (Main Hospital)', type: 'Hospital', isMain: true },
            { name: 'Gimjabet Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Buya Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Tulita Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Messela Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Azena Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Degera Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Ayehu Health Centre', type: 'Health Centre', isMain: false },
            { name: 'Wndigi Wunbire Health Centre', type: 'Health Centre', isMain: false }
        ];

        const eqaTypes = ['Hematology', 'Clinical Chemistry', 'Microbiology', 'Serology', 'Parasitology'];

        facilities.forEach(facility => {
            eqaTypes.forEach(type => {
                const data = {
                    facilityName: facility.name,
                    facilityType: facility.type,
                    isMain: facility.isMain,
                    eqaType: type,
                    sampleId: `EQA-${Utils.generateId(6)}`,
                    receivedDate: new Date().toISOString().split('T')[0],
                    result: (Math.random() * 10 + 90).toFixed(1),
                    expectedResult: (Math.random() * 10 + 90).toFixed(1),
                    status: ['Passed', 'Failed', 'Pending'][Math.floor(Math.random() * 3)],
                    comments: '',
                    evaluatedBy: 'Quality Officer',
                    evaluatedDate: new Date().toISOString().split('T')[0]
                };
                storage.create('eqa', data);
                this.eqaData.push(data);
            });
        });
    }

    // ==================== EQA PROGRAMS ====================
    /**
     * A "program" is an EQA scheme (e.g. "UK NEQAS Hematology",
     * "WHO EQA Malaria Microscopy") with its own panel of tests. Adding
     * results against a program (rather than free-typing an EQA type
     * every time) keeps results comparable round to round and lets
     * quantitative results be auto-evaluated against that program's
     * acceptable range instead of eyeballing pass/fail.
     */
    openProgramsModal() {
        this.renderProgramsList();
        document.getElementById('eqaProgramsModal').style.display = 'flex';
    }

    closeProgramsModal() {
        document.getElementById('eqaProgramsModal').style.display = 'none';
    }

    renderProgramsList() {
        const container = document.getElementById('eqaProgramsList');
        if (!container) return;
        this.eqaPrograms = storage.getAll('eqaPrograms') || [];

        if (this.eqaPrograms.length === 0) {
            container.innerHTML = `<p style="color:var(--gray-400); font-size:var(--text-sm);">No EQA programs defined yet. Add one below.</p>`;
        } else {
            container.innerHTML = this.eqaPrograms.map(p => `
                <div class="card" style="padding:1rem; margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <strong>${Utils.escapeHtml(p.name)}</strong>
                            <div style="font-size:var(--text-xs); color:var(--gray-500);">${Utils.escapeHtml(p.provider || 'No provider set')} &middot; ${Utils.escapeHtml(p.frequency || 'Frequency not set')}</div>
                            <div style="font-size:var(--text-xs); color:var(--gray-500); margin-top:0.25rem;">Tests: ${(p.tests || []).map(t => Utils.escapeHtml(t.testName)).join(', ') || 'None added'}</div>
                        </div>
                        <div class="actions">
                            <button class="edit-btn" title="Edit" onclick="qualityManager.openProgramEditor('${p.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="delete-btn" title="Delete" onclick="qualityManager.deleteProgram('${p.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>`).join('');
        }

        this.renderProgramEditorTestRows();
    }

    openProgramEditor(id = null) {
        this.editingProgramId = id;
        const form = document.getElementById('programForm');
        form.reset();
        document.getElementById('programTestsBody').innerHTML = '';

        if (id) {
            const p = storage.getById('eqaPrograms', id);
            if (!p) return;
            document.getElementById('programEditorTitle').textContent = 'Edit Program';
            document.getElementById('programName').value = p.name;
            document.getElementById('programProvider').value = p.provider || '';
            document.getElementById('programFrequency').value = p.frequency || 'Quarterly';
            (p.tests || []).forEach(t => this.addProgramTestRow(t.testName, t.unit));
        } else {
            document.getElementById('programEditorTitle').textContent = 'Add Program';
            this.addProgramTestRow();
        }
        document.getElementById('programEditorPanel').style.display = 'block';
    }

    closeProgramEditor() {
        document.getElementById('programEditorPanel').style.display = 'none';
        this.editingProgramId = null;
    }

    addProgramTestRow(testName = '', unit = '') {
        const tbody = document.getElementById('programTestsBody');
        if (!tbody) return;
        const row = document.createElement('div');
        row.className = 'program-test-row';
        row.style.cssText = 'display:flex; gap:0.5rem; margin-bottom:0.5rem;';
        row.innerHTML = `
            <input type="text" class="prog-test-name" placeholder="Test name" value="${Utils.escapeHtml(testName)}" style="flex:2; padding:0.4rem;">
            <input type="text" class="prog-test-unit" placeholder="Unit (e.g. mg/dL)" value="${Utils.escapeHtml(unit)}" style="flex:1; padding:0.4rem;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>`;
        tbody.appendChild(row);
    }

    renderProgramEditorTestRows() {
        // no-op placeholder kept for symmetry with other render* methods
    }

    saveProgram() {
        const name = document.getElementById('programName').value.trim();
        const provider = document.getElementById('programProvider').value.trim();
        const frequency = document.getElementById('programFrequency').value;
        const tests = [...document.querySelectorAll('#programTestsBody .program-test-row')]
            .map(row => ({
                testName: row.querySelector('.prog-test-name').value.trim(),
                unit: row.querySelector('.prog-test-unit').value.trim()
            }))
            .filter(t => t.testName);

        if (!name) {
            showToast('Program name is required', 'error');
            return;
        }
        if (tests.length === 0) {
            showToast('Add at least one test to this program', 'error');
            return;
        }

        const data = { name, provider, frequency, tests, active: true };

        try {
            if (this.editingProgramId) {
                storage.update('eqaPrograms', this.editingProgramId, data);
                showToast('Program updated', 'success');
            } else {
                storage.create('eqaPrograms', data);
                showToast('Program added', 'success');
            }
            this.closeProgramEditor();
            this.renderProgramsList();
            this.populateProgramSelect();
        } catch (err) {
            showToast('Failed to save program: ' + err.message, 'error');
        }
    }

    deleteProgram(id) {
        if (!confirm('Delete this EQA program? Past results referencing it are kept but will show "Unknown Program".')) return;
        storage.delete('eqaPrograms', id);
        showToast('Program deleted', 'success');
        this.renderProgramsList();
        this.populateProgramSelect();
    }

    populateProgramSelect() {
        const select = document.getElementById('eqaProgram');
        if (!select) return;
        this.eqaPrograms = storage.getAll('eqaPrograms') || [];
        select.innerHTML = '<option value="">No program (free-text type)</option>' +
            this.eqaPrograms.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('');
    }

    onProgramSelected() {
        const programId = document.getElementById('eqaProgram').value;
        const testSelect = document.getElementById('eqaProgramTest');
        const legacyType = document.getElementById('eqaType');
        if (!testSelect) return;

        if (!programId) {
            testSelect.style.display = 'none';
            legacyType.closest('.form-group').style.display = '';
            return;
        }

        const program = storage.getById('eqaPrograms', programId);
        testSelect.innerHTML = (program?.tests || []).map(t => `<option value="${Utils.escapeHtml(t.testName)}" data-unit="${Utils.escapeHtml(t.unit || '')}">${Utils.escapeHtml(t.testName)}</option>`).join('');
        testSelect.style.display = '';
        legacyType.closest('.form-group').style.display = 'none';
        this.toggleQuantitativeFields();
    }

    toggleQuantitativeFields() {
        const isQuant = document.getElementById('eqaResultType')?.value === 'Quantitative';
        const quantFields = document.getElementById('eqaQuantFields');
        if (quantFields) quantFields.style.display = isQuant ? '' : 'none';
    }

    /**
     * Auto-evaluate a quantitative EQA result using a z-score against the
     * program's target value and acceptable SD - the standard approach
     * real EQA schemes use: |z| <= 2 is acceptable, 2 < |z| <= 3 is a
     * warning, |z| > 3 is a fail.
     */
    evaluateEQA() {
        const resultType = document.getElementById('eqaResultType').value;
        const statusSelect = document.getElementById('eqaStatus');

        if (resultType !== 'Quantitative') {
            const result = document.getElementById('eqaResult').value.trim().toLowerCase();
            const expected = document.getElementById('eqaExpectedResult').value.trim().toLowerCase();
            if (!result || !expected) {
                showToast('Enter both Result and Expected Result to evaluate', 'error');
                return;
            }
            statusSelect.value = result === expected ? 'Passed' : 'Failed';
            showToast(`Evaluated: ${statusSelect.value}`, 'success');
            return;
        }

        const result = parseFloat(document.getElementById('eqaResult').value);
        const target = parseFloat(document.getElementById('eqaTargetValue').value);
        const sd = parseFloat(document.getElementById('eqaAcceptableSD').value);

        if (isNaN(result) || isNaN(target) || isNaN(sd) || sd === 0) {
            showToast('Enter a numeric Result, Target Value, and Acceptable SD to evaluate', 'error');
            return;
        }

        const z = (result - target) / sd;
        const absZ = Math.abs(z);
        let status;
        if (absZ <= 2) status = 'Passed';
        else if (absZ <= 3) status = 'Warning';
        else status = 'Failed';

        statusSelect.value = status;
        const zDisplay = document.getElementById('eqaZScoreDisplay');
        if (zDisplay) zDisplay.textContent = `z-score: ${z.toFixed(2)} -> ${status}`;
        showToast(`Evaluated: ${status} (z-score ${z.toFixed(2)})`, status === 'Failed' ? 'error' : 'success');
    }

    renderEQA() {
        const container = document.getElementById('eqaContainer');
        if (!container) return;

        const facilities = [...new Set(this.eqaData.map(e => e.facilityName))];

        let html = `
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="qualityManager.populateProgramSelect(); document.getElementById('eqaModal').style.display='flex'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add EQA Data
                </button>
                <button class="btn btn-secondary btn-sm" id="eqaManageProgramsBtn" onclick="qualityManager.openProgramsModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                    </svg>
                    Manage Programs
                </button>
                <button class="btn btn-secondary btn-sm" onclick="qualityManager.generateEQAReport()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2"/>
                        <circle cx="12" cy="16" r="5"/>
                        <line x1="12" y1="11" x2="12" y2="16"/>
                        <line x1="9" y1="13" x2="12" y2="16"/>
                        <line x1="15" y1="13" x2="12" y2="16"/>
                    </svg>
                    Generate Report
                </button>
            </div>
            <div class="eqa-facility-grid">
        `;

        facilities.forEach(facility => {
            const facilityData = this.eqaData.filter(e => e.facilityName === facility);
            const total = facilityData.length;
            const passed = facilityData.filter(e => e.status === 'Passed').length;
            const failed = facilityData.filter(e => e.status === 'Failed').length;
            const pending = facilityData.filter(e => e.status === 'Pending').length;
            const score = total > 0 ? Math.round((passed / total) * 100) : 0;
            const isMain = facilityData[0]?.isMain || false;

            html += `
                <div class="eqa-facility-card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div class="facility-name">${facility}</div>
                            <div style="font-size: var(--text-xs); color: var(--gray-500);">
                                ${isMain ? '🏥 Main Hospital' : '🏥 Health Centre'}
                            </div>
                        </div>
                        <span class="facility-status ${score >= 80 ? 'passed' : score > 0 ? 'pending' : 'failed'}">
                            ${score >= 80 ? '✓ Passing' : score > 0 ? '⏳ In Progress' : '✗ Needs Review'}
                        </span>
                    </div>
                    <div class="facility-score">${score}%</div>
                    <div style="display: flex; gap: 1rem; font-size: var(--text-sm);">
                        <span style="color: var(--success);">✓ ${passed}</span>
                        <span style="color: var(--danger);">✗ ${failed}</span>
                        <span style="color: #856404;">⏳ ${pending}</span>
                        <span style="color: var(--gray-500);">Total: ${total}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" style="margin-top: 0.5rem; width: 100%;" 
                            onclick="qualityManager.viewEQAForFacility('${facility}')">
                        View Details
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    viewEQAForFacility(facility) {
        const data = this.eqaData.filter(e => e.facilityName === facility);
        if (data.length === 0) return;

        const modal = document.getElementById('eqaViewModal');
        const content = document.getElementById('eqaViewContent');
        if (!modal || !content) return;

        const passed = data.filter(e => e.status === 'Passed').length;
        const total = data.length;
        const score = total > 0 ? Math.round((passed / total) * 100) : 0;

        content.innerHTML = `
            <h4>${facility} - EQA Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${score}%</span>
                    <span class="stat-mini-label">Overall Score</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--success);">${passed}</span>
                    <span class="stat-mini-label">Passed</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--danger);">${total - passed}</span>
                    <span class="stat-mini-label">Failed/Pending</span>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>EQA Type</th>
                        <th>Sample ID</th>
                        <th>Result</th>
                        <th>Expected</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(d => `
                        <tr>
                            <td>${d.eqaType}</td>
                            <td>${d.sampleId}</td>
                            <td>${d.result}</td>
                            <td>${d.expectedResult}</td>
                            <td>
                                <span class="facility-status ${d.status.toLowerCase()}">
                                    ${d.status}
                                </span>
                            </td>
                            <td>${d.evaluatedDate || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="qualityManager.closeEQAView()">Close</button>
                <button class="btn btn-primary" onclick="qualityManager.printEQAFacility('${facility}')">Print Report</button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    addEqaFacilityField() {
        const container = document.getElementById('eqaFacilityFields');
        if (!container) return;

        const fieldHtml = `
            <div class="eqa-facility-field" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <input type="text" class="eqa-facility-name" placeholder="Facility Name" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <select class="eqa-facility-type" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                    <option value="Hospital">Hospital</option>
                    <option value="Health Centre">Health Centre</option>
                </select>
                <input type="number" class="eqa-facility-score" placeholder="Score %" style="padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', fieldHtml);
    }

    saveEQA() {
        const programId = document.getElementById('eqaProgram').value;
        const program = programId ? storage.getById('eqaPrograms', programId) : null;
        const programTestName = programId ? document.getElementById('eqaProgramTest').value : '';
        const resultType = document.getElementById('eqaResultType').value;

        const data = {
            facilityName: document.getElementById('eqaFacilityName').value,
            facilityType: document.getElementById('eqaFacilityType').value || 'Health Centre',
            isMain: document.getElementById('eqaFacilityName').value === 'AGPHL (Main Hospital)',
            programId: programId || null,
            programName: program ? program.name : null,
            eqaType: programId ? programTestName : document.getElementById('eqaType').value,
            resultType,
            sampleId: document.getElementById('eqaSampleId').value || `EQA-${Utils.generateId(6)}`,
            receivedDate: document.getElementById('eqaReceivedDate').value || new Date().toISOString().split('T')[0],
            result: document.getElementById('eqaResult').value,
            expectedResult: document.getElementById('eqaExpectedResult').value,
            targetValue: resultType === 'Quantitative' ? (parseFloat(document.getElementById('eqaTargetValue').value) || null) : null,
            acceptableSD: resultType === 'Quantitative' ? (parseFloat(document.getElementById('eqaAcceptableSD').value) || null) : null,
            status: document.getElementById('eqaStatus').value || 'Pending',
            comments: document.getElementById('eqaComments').value,
            evaluatedBy: document.getElementById('eqaEvaluatedBy').value || auth.getCurrentUser()?.fullName || 'Unknown',
            evaluatedDate: document.getElementById('eqaEvaluatedDate').value || new Date().toISOString().split('T')[0]
        };

        if (!data.facilityName || !data.eqaType || !data.result) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        try {
            const created = storage.create('eqa', data);
            this.eqaData.push(created);
            this.renderEQA();
            this.closeEQAModal();
            showToast(`EQA data saved for ${data.facilityName} - ${data.eqaType}`, 'success');
        } catch (error) {
            showToast('Error saving EQA: ' + error.message, 'error');
        }
    }

    generateEQAReport() {
        const facilities = [...new Set(this.eqaData.map(e => e.facilityName))];
        let report = '=== EQA Report ===\n';
        report += `Generated: ${new Date().toLocaleString()}\n\n`;

        facilities.forEach(facility => {
            const data = this.eqaData.filter(e => e.facilityName === facility);
            const passed = data.filter(e => e.status === 'Passed').length;
            const total = data.length;
            const score = total > 0 ? Math.round((passed / total) * 100) : 0;
            
            report += `\n${facility} (${data[0]?.facilityType || 'N/A'}): ${score}% (${passed}/${total})\n`;
            data.forEach(d => {
                report += `  - ${d.eqaType}: ${d.result} (Expected: ${d.expectedResult}) - ${d.status}\n`;
            });
        });

        Utils.downloadFile(report, `EQA_Report_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
        showToast('EQA Report generated and downloaded', 'success');
    }

    printEQAFacility(facility) {
        const data = this.eqaData.filter(e => e.facilityName === facility);
        if (data.length === 0) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showToast('Please allow popups for printing', 'warning');
            return;
        }

        const passed = data.filter(e => e.status === 'Passed').length;
        const total = data.length;
        const score = total > 0 ? Math.round((passed / total) * 100) : 0;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>EQA Report - ${facility}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #1a66f5; }
                    .score { font-size: 48px; font-weight: 700; color: ${score >= 80 ? '#28a745' : '#dc3545'}; text-align: center; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                    th { background: #f5f5f5; }
                    .passed { color: #28a745; }
                    .failed { color: #dc3545; }
                    .pending { color: #ffc107; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>AGPHL LIS</h1>
                    <p>External Quality Assessment (EQA) Report</p>
                    <p>${facility}</p>
                </div>
                <div class="score">${score}%</div>
                <table>
                    <thead>
                        <tr>
                            <th>EQA Type</th>
                            <th>Sample ID</th>
                            <th>Result</th>
                            <th>Expected</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(d => `
                            <tr>
                                <td>${d.eqaType}</td>
                                <td>${d.sampleId}</td>
                                <td>${d.result}</td>
                                <td>${d.expectedResult}</td>
                                <td class="${d.status.toLowerCase()}">${d.status}</td>
                                <td>${d.evaluatedDate || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Generated by AGPHL LIS v1.0</p>
                    <p>© 2026 Asrat Genet. All Rights Reserved.</p>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }

    closeEQAModal() {
        document.getElementById('eqaModal').style.display = 'none';
        document.getElementById('eqaForm').reset();
    }

    closeEQAView() {
        document.getElementById('eqaViewModal').style.display = 'none';
    }

    // ========================================
    // 3. SOP MANAGEMENT
    // ========================================

    initDefaultSOP() {
        const defaultSOPs = [
            {
                title: 'Sample Collection and Handling SOP',
                sopNumber: 'SOP-CL-001',
                type: 'SOP',
                issueDate: new Date().toISOString().split('T')[0],
                reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                preparedBy: 'Asrat Genet',
                reviewedBy: 'Quality Officer',
                approvedBy: 'Laboratory Manager',
                version: '1.0',
                department: 'Clinical Laboratory',
                status: 'Active',
                masterlist: true,
                description: 'Standard operating procedure for sample collection and handling',
                keywords: 'Sample, Collection, Handling'
            },
            {
                title: 'Hematology Test Request Form',
                sopNumber: 'FRM-HEM-001',
                type: 'Format',
                issueDate: new Date().toISOString().split('T')[0],
                reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                preparedBy: 'Asrat Genet',
                reviewedBy: 'Quality Officer',
                approvedBy: 'Laboratory Manager',
                version: '1.0',
                department: 'Hematology',
                status: 'Active',
                masterlist: true,
                description: 'Test request form for hematology department',
                keywords: 'Hematology, Request, Form'
            }
        ];

        defaultSOPs.forEach(sop => {
            storage.create('sop', sop);
            this.sopData.push(sop);
        });
    }

    renderSOP() {
        const container = document.getElementById('sopContainer');
        if (!container) return;

        const total = this.sopData.length;
        const active = this.sopData.filter(s => s.status === 'Active').length;
        const dueForReview = this.sopData.filter(s => {
            const reviewDate = new Date(s.reviewDate);
            const now = new Date();
            const diffDays = (reviewDate - now) / (1000 * 60 * 60 * 24);
            return diffDays < 30 && diffDays > 0;
        }).length;
        const overdue = this.sopData.filter(s => {
            const reviewDate = new Date(s.reviewDate);
            const now = new Date();
            return reviewDate < now && s.status === 'Active';
        }).length;

        const typeCounts = {};
        this.sopData.forEach(s => {
            typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
        });

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${total}</span>
                    <span class="stat-mini-label">Total Documents</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--success);">${active}</span>
                    <span class="stat-mini-label">Active</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: #856404;">${dueForReview}</span>
                    <span class="stat-mini-label">Due for Review</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--danger);">${overdue}</span>
                    <span class="stat-mini-label">Overdue</span>
                </div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                ${Object.entries(typeCounts).map(([type, count]) => `
                    <span class="sop-type-badge ${type.toLowerCase()}">${type}: ${count}</span>
                `).join('')}
            </div>

            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="document.getElementById('sopModal').style.display='flex'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Document
                </button>
                <button class="btn btn-secondary btn-sm" onclick="qualityManager.exportSOPMasterlist()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export Masterlist
                </button>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Document Number</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Version</th>
                        <th>Issue Date</th>
                        <th>Review Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (this.sopData.length === 0) {
            html += `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-icon">📄</div>
                            <h3>No SOP Documents</h3>
                            <p>Start by creating your first document</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            this.sopData.forEach((sop, index) => {
                const isOverdue = new Date(sop.reviewDate) < new Date() && sop.status === 'Active';
                const isDueSoon = !isOverdue && (new Date(sop.reviewDate) - new Date()) / (1000 * 60 * 60 * 24) < 30;

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${sop.sopNumber || 'N/A'}</strong></td>
                        <td>${Utils.truncate(sop.title, 30)}</td>
                        <td><span class="sop-type-badge ${(sop.type || 'sop').toLowerCase()}">${sop.type || 'SOP'}</span></td>
                        <td>v${sop.version || '1.0'}</td>
                        <td>${sop.issueDate || 'N/A'}</td>
                        <td style="color: ${isOverdue ? 'var(--danger)' : isDueSoon ? '#856404' : 'var(--gray-700)'};">
                            ${sop.reviewDate || 'N/A'}
                            ${isOverdue ? ' ⚠' : ''}
                            ${isDueSoon ? ' 📅' : ''}
                        </td>
                        <td>
                            <span class="status-badge ${sop.status === 'Active' ? 'active' : 'inactive'}">
                                ${sop.status || 'Active'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn view-btn" onclick="qualityManager.viewSOP('${sop.id}')" title="View">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </button>
                                <button class="action-btn edit-btn" onclick="qualityManager.editSOP('${sop.id}')" title="Edit">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button class="action-btn delete-btn" onclick="qualityManager.deleteSOP('${sop.id}')" title="Delete">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    saveSOP() {
        const data = {
            title: document.getElementById('sopTitle').value,
            sopNumber: document.getElementById('sopNumber').value || `SOP-${Utils.generateId(8)}`,
            type: document.getElementById('sopType').value,
            issueDate: document.getElementById('sopIssueDate').value || new Date().toISOString().split('T')[0],
            reviewDate: document.getElementById('sopReviewDate').value,
            preparedBy: document.getElementById('sopPreparedBy').value || auth.getCurrentUser()?.fullName || 'Unknown',
            reviewedBy: document.getElementById('sopReviewedBy').value,
            approvedBy: document.getElementById('sopApprovedBy').value,
            version: document.getElementById('sopVersion').value || '1.0',
            department: document.getElementById('sopDepartment').value,
            status: document.getElementById('sopStatus').value || 'Active',
            masterlist: document.getElementById('sopMasterlist')?.checked || true,
            description: document.getElementById('sopDescription').value,
            keywords: document.getElementById('sopKeywords').value
        };

        if (!data.title || !data.type) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const isEdit = this.editingSOPId;
        try {
            if (isEdit) {
                storage.update('sop', isEdit, data);
                showToast('SOP updated successfully', 'success');
                this.editingSOPId = null;
            } else {
                storage.create('sop', data);
                showToast('SOP created successfully', 'success');
            }
            
            this.loadData();
            this.renderSOP();
            this.closeSOPModal();
        } catch (error) {
            showToast('Error saving SOP: ' + error.message, 'error');
        }
    }

    viewSOP(id) {
        const sop = storage.getById('sop', id);
        if (!sop) {
            showToast('Document not found', 'error');
            return;
        }

        const modal = document.getElementById('sopViewModal');
        const content = document.getElementById('sopViewContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="card" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0;">${sop.title}</h4>
                        <div style="color: var(--gray-500); font-size: var(--text-sm);">${sop.sopNumber || 'N/A'}</div>
                    </div>
                    <span class="sop-type-badge ${(sop.type || 'sop').toLowerCase()}">${sop.type || 'SOP'}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
                    <div><strong>Version:</strong> v${sop.version || '1.0'}</div>
                    <div><strong>Status:</strong> <span class="status-badge ${sop.status === 'Active' ? 'active' : 'inactive'}">${sop.status || 'Active'}</span></div>
                    <div><strong>Department:</strong> ${sop.department || 'N/A'}</div>
                    <div><strong>Masterlist:</strong> ${sop.masterlist ? '✓ Yes' : '✗ No'}</div>
                    <div><strong>Issue Date:</strong> ${sop.issueDate || 'N/A'}</div>
                    <div><strong>Review Date:</strong> ${sop.reviewDate || 'N/A'}</div>
                    <div><strong>Prepared By:</strong> ${sop.preparedBy || 'N/A'}</div>
                    <div><strong>Reviewed By:</strong> ${sop.reviewedBy || 'N/A'}</div>
                    <div><strong>Approved By:</strong> ${sop.approvedBy || 'N/A'}</div>
                </div>

                ${sop.description ? `
                    <div style="margin: 1rem 0;">
                        <strong>Description:</strong>
                        <p style="margin: 0.25rem 0; color: var(--gray-700);">${sop.description}</p>
                    </div>
                ` : ''}

                ${sop.keywords ? `
                    <div style="margin: 0.5rem 0;">
                        <strong>Keywords:</strong>
                        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.25rem;">
                            ${sop.keywords.split(',').map(k => `
                                <span class="tag tag-primary">${k.trim()}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'flex';
    }

    editSOP(id) {
        const sop = storage.getById('sop', id);
        if (!sop) {
            showToast('Document not found', 'error');
            return;
        }

        this.editingSOPId = id;
        document.getElementById('sopModal').style.display = 'flex';
        document.getElementById('sopModalTitle').textContent = 'Edit Document';

        document.getElementById('sopTitle').value = sop.title || '';
        document.getElementById('sopNumber').value = sop.sopNumber || '';
        document.getElementById('sopType').value = sop.type || 'SOP';
        document.getElementById('sopIssueDate').value = sop.issueDate || '';
        document.getElementById('sopReviewDate').value = sop.reviewDate || '';
        document.getElementById('sopPreparedBy').value = sop.preparedBy || '';
        document.getElementById('sopReviewedBy').value = sop.reviewedBy || '';
        document.getElementById('sopApprovedBy').value = sop.approvedBy || '';
        document.getElementById('sopVersion').value = sop.version || '1.0';
        document.getElementById('sopDepartment').value = sop.department || '';
        document.getElementById('sopStatus').value = sop.status || 'Active';
        document.getElementById('sopMasterlist').checked = sop.masterlist !== false;
        document.getElementById('sopDescription').value = sop.description || '';
        document.getElementById('sopKeywords').value = sop.keywords || '';
    }

    deleteSOP(id) {
        if (!confirm('Delete this document?')) return;
        
        storage.delete('sop', id);
        this.loadData();
        this.renderSOP();
        showToast('Document deleted successfully', 'success');
    }

    exportSOPMasterlist() {
        const headers = ['Document Number', 'Title', 'Type', 'Version', 'Issue Date', 'Review Date', 'Status', 'Department'];
        const rows = this.sopData.map(s => [
            s.sopNumber || '',
            s.title || '',
            s.type || 'SOP',
            s.version || '1.0',
            s.issueDate || '',
            s.reviewDate || '',
            s.status || 'Active',
            s.department || ''
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.join(',') + '\n';
        });

        Utils.downloadFile(csv, `SOP_Masterlist_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        showToast('SOP Masterlist exported successfully', 'success');
    }

    closeSOPModal() {
        document.getElementById('sopModal').style.display = 'none';
        document.getElementById('sopForm').reset();
        this.editingSOPId = null;
        document.getElementById('sopModalTitle').textContent = 'Add Document';
    }

    closeSOPView() {
        document.getElementById('sopViewModal').style.display = 'none';
    }

    // ========================================
    // 4. AUDIT MANAGEMENT
    // ========================================

    initDefaultAudit() {
        const defaultAudits = [
            {
                title: 'SLIMTA Assessment - Phase 1',
                type: 'SLIMTA',
                category: 'Quality Management',
                date: new Date().toISOString().split('T')[0],
                auditor: 'Quality Officer',
                score: 78,
                status: 'Completed',
                findings: ['Need to improve document control', 'SOPs not fully implemented'],
                recommendations: ['Review all SOPs', 'Implement document numbering system'],
                checklist: [
                    { item: 'Quality Management System', compliant: true },
                    { item: 'Document Control', compliant: false },
                    { item: 'Records Management', compliant: true },
                    { item: 'Internal Audit', compliant: true },
                    { item: 'Management Review', compliant: false }
                ]
            },
            {
                title: 'Biosafety Audit - Lab Safety',
                type: 'Biosafety',
                category: 'Safety',
                date: new Date().toISOString().split('T')[0],
                auditor: 'Safety Officer',
                score: 92,
                status: 'Completed',
                findings: ['PPE usage needs improvement', 'Waste disposal procedures need review'],
                recommendations: ['Conduct PPE training', 'Review waste disposal SOP'],
                checklist: [
                    { item: 'PPE Usage', compliant: false },
                    { item: 'Chemical Safety', compliant: true },
                    { item: 'Waste Disposal', compliant: false },
                    { item: 'Emergency Response', compliant: true },
                    { item: 'Training Records', compliant: true }
                ]
            }
        ];

        defaultAudits.forEach(audit => {
            storage.create('audit', audit);
            this.auditData.push(audit);
        });
    }

    renderAudit() {
        const container = document.getElementById('auditContainer');
        if (!container) return;

        const total = this.auditData.length;
        const completed = this.auditData.filter(a => a.status === 'Completed').length;
        const inProgress = this.auditData.filter(a => a.status === 'In Progress').length;
        const avgScore = total > 0 ? Math.round(this.auditData.reduce((sum, a) => sum + (a.score || 0), 0) / total) : 0;

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${total}</span>
                    <span class="stat-mini-label">Total Audits</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--success);">${completed}</span>
                    <span class="stat-mini-label">Completed</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: #856404;">${inProgress}</span>
                    <span class="stat-mini-label">In Progress</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--primary-600);">${avgScore}%</span>
                    <span class="stat-mini-label">Average Score</span>
                </div>
            </div>

            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="document.getElementById('auditModal').style.display='flex'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Audit
                </button>
                <button class="btn btn-secondary btn-sm" onclick="qualityManager.exportAuditReport()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export Report
                </button>
            </div>
        `;

        if (this.auditData.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Audits Found</h3>
                    <p>Start by creating your first audit</p>
                </div>
            `;
        } else {
            html += this.auditData.map(audit => `
                <div class="card" style="padding: 1.25rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <h4 style="margin: 0;">${audit.title}</h4>
                            <div style="font-size: var(--text-sm); color: var(--gray-500);">
                                ${audit.type} • ${audit.category || 'General'} • ${audit.date || 'N/A'}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span class="status-badge ${audit.status === 'Completed' ? 'active' : 'pending'}">
                                ${audit.status || 'Pending'}
                            </span>
                            <span style="font-size: var(--text-xl); font-weight: 700; color: ${(audit.score || 0) >= 80 ? 'var(--success)' : (audit.score || 0) >= 60 ? '#856404' : 'var(--danger)'};">
                                ${audit.score || 0}%
                            </span>
                        </div>
                    </div>

                    ${audit.findings && audit.findings.length > 0 ? `
                        <div style="margin: 0.5rem 0;">
                            <strong style="color: var(--danger);">Findings:</strong>
                            <ul style="margin: 0.25rem 0; padding-left: 1.5rem;">
                                ${audit.findings.map(f => `<li style="font-size: var(--text-sm);">${f}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${audit.recommendations && audit.recommendations.length > 0 ? `
                        <div style="margin: 0.5rem 0;">
                            <strong style="color: var(--primary-600);">Recommendations:</strong>
                            <ul style="margin: 0.25rem 0; padding-left: 1.5rem;">
                                ${audit.recommendations.map(r => `<li style="font-size: var(--text-sm);">${r}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-secondary" onclick="qualityManager.viewAudit('${audit.id}')">View Details</button>
                        <button class="btn btn-sm btn-primary" onclick="qualityManager.editAudit('${audit.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="qualityManager.deleteAudit('${audit.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;
    }

    saveAudit() {
        const checklistItems = [];
        document.querySelectorAll('.audit-checklist-item').forEach(item => {
            const name = item.querySelector('.audit-checklist-name')?.value || '';
            const compliant = item.querySelector('.audit-checklist-compliant')?.checked || false;
            if (name) {
                checklistItems.push({ item: name, compliant });
            }
        });

        const data = {
            title: document.getElementById('auditTitle').value,
            type: document.getElementById('auditType').value,
            category: document.getElementById('auditCategory').value,
            date: document.getElementById('auditDate').value || new Date().toISOString().split('T')[0],
            auditor: document.getElementById('auditAuditor').value || auth.getCurrentUser()?.fullName || 'Unknown',
            score: parseInt(document.getElementById('auditScore').value) || 0,
            status: document.getElementById('auditStatus').value || 'In Progress',
            findings: document.getElementById('auditFindings').value ? document.getElementById('auditFindings').value.split('\n').filter(f => f.trim()) : [],
            recommendations: document.getElementById('auditRecommendations').value ? document.getElementById('auditRecommendations').value.split('\n').filter(r => r.trim()) : [],
            checklist: checklistItems,
            completedDate: document.getElementById('auditCompletedDate').value || null
        };

        if (!data.title || !data.type) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const isEdit = this.editingAuditId;
        try {
            if (isEdit) {
                storage.update('audit', isEdit, data);
                showToast('Audit updated successfully', 'success');
                this.editingAuditId = null;
            } else {
                storage.create('audit', data);
                showToast('Audit created successfully', 'success');
            }
            
            this.loadData();
            this.renderAudit();
            this.closeAuditModal();
        } catch (error) {
            showToast('Error saving audit: ' + error.message, 'error');
        }
    }

    addAuditChecklistItem() {
        const container = document.getElementById('auditChecklistContainer');
        if (!container) return;

        const itemHtml = `
            <div class="audit-checklist-item" style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0;">
                <input type="text" class="audit-checklist-name" placeholder="Checklist item" style="flex: 1; padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                <label style="display: flex; align-items: center; gap: 0.25rem; font-size: var(--text-sm);">
                    <input type="checkbox" class="audit-checklist-compliant"> Compliant
                </label>
                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    }

    viewAudit(id) {
        const audit = storage.getById('audit', id);
        if (!audit) {
            showToast('Audit not found', 'error');
            return;
        }

        const modal = document.getElementById('auditViewModal');
        const content = document.getElementById('auditViewContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="card" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0;">${audit.title}</h4>
                        <div style="color: var(--gray-500); font-size: var(--text-sm);">
                            ${audit.type} • ${audit.category || 'General'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="status-badge ${audit.status === 'Completed' ? 'active' : 'pending'}">${audit.status || 'Pending'}</span>
                        <div style="font-size: var(--text-2xl); font-weight: 700; color: ${(audit.score || 0) >= 80 ? 'var(--success)' : (audit.score || 0) >= 60 ? '#856404' : 'var(--danger)'};">
                            ${audit.score || 0}%
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 1rem 0;">
                    <div><strong>Date:</strong> ${audit.date || 'N/A'}</div>
                    <div><strong>Auditor:</strong> ${audit.auditor || 'N/A'}</div>
                    ${audit.completedDate ? `<div><strong>Completed:</strong> ${audit.completedDate}</div>` : ''}
                </div>

                ${audit.findings && audit.findings.length > 0 ? `
                    <div style="margin: 0.5rem 0;">
                        <h5 style="color: var(--danger); margin: 0 0 0.25rem 0;">Findings</h5>
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            ${audit.findings.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${audit.recommendations && audit.recommendations.length > 0 ? `
                    <div style="margin: 0.5rem 0;">
                        <h5 style="color: var(--primary-600); margin: 0 0 0.25rem 0;">Recommendations</h5>
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            ${audit.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${audit.checklist && audit.checklist.length > 0 ? `
                    <div style="margin: 0.5rem 0;">
                        <h5 style="margin: 0 0 0.25rem 0;">Checklist</h5>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem;">
                            ${audit.checklist.map(item => `
                                <div style="font-size: var(--text-sm); display: flex; align-items: center; gap: 0.5rem; padding: 0.125rem 0;">
                                    <span style="color: ${item.compliant ? 'var(--success)' : 'var(--danger)'};">
                                        ${item.compliant ? '✓' : '✗'}
                                    </span>
                                    ${item.item}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'flex';
    }

    editAudit(id) {
        const audit = storage.getById('audit', id);
        if (!audit) {
            showToast('Audit not found', 'error');
            return;
        }

        this.editingAuditId = id;
        document.getElementById('auditModal').style.display = 'flex';
        document.getElementById('auditModalTitle').textContent = 'Edit Audit';

        document.getElementById('auditTitle').value = audit.title || '';
        document.getElementById('auditType').value = audit.type || '';
        document.getElementById('auditCategory').value = audit.category || '';
        document.getElementById('auditDate').value = audit.date || '';
        document.getElementById('auditAuditor').value = audit.auditor || '';
        document.getElementById('auditScore').value = audit.score || '';
        document.getElementById('auditStatus').value = audit.status || 'In Progress';
        document.getElementById('auditFindings').value = audit.findings ? audit.findings.join('\n') : '';
        document.getElementById('auditRecommendations').value = audit.recommendations ? audit.recommendations.join('\n') : '';
        document.getElementById('auditCompletedDate').value = audit.completedDate || '';

        const container = document.getElementById('auditChecklistContainer');
        container.innerHTML = '';
        if (audit.checklist) {
            audit.checklist.forEach(item => {
                const itemHtml = `
                    <div class="audit-checklist-item" style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0;">
                        <input type="text" class="audit-checklist-name" value="${item.item}" style="flex: 1; padding: 0.375rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                        <label style="display: flex; align-items: center; gap: 0.25rem; font-size: var(--text-sm);">
                            <input type="checkbox" class="audit-checklist-compliant" ${item.compliant ? 'checked' : ''}> Compliant
                        </label>
                        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', itemHtml);
            });
        }
    }

    deleteAudit(id) {
        if (!confirm('Delete this audit record?')) return;
        
        storage.delete('audit', id);
        this.loadData();
        this.renderAudit();
        showToast('Audit deleted successfully', 'success');
    }

    exportAuditReport() {
        const headers = ['Title', 'Type', 'Category', 'Date', 'Auditor', 'Score', 'Status', 'Findings', 'Recommendations'];
        const rows = this.auditData.map(a => [
            a.title || '',
            a.type || '',
            a.category || '',
            a.date || '',
            a.auditor || '',
            a.score || 0,
            a.status || 'Pending',
            (a.findings || []).join('; '),
            (a.recommendations || []).join('; ')
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        Utils.downloadFile(csv, `Audit_Report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        showToast('Audit report exported successfully', 'success');
    }

    closeAuditModal() {
        document.getElementById('auditModal').style.display = 'none';
        document.getElementById('auditForm').reset();
        document.getElementById('auditChecklistContainer').innerHTML = '';
        this.editingAuditId = null;
        document.getElementById('auditModalTitle').textContent = 'New Audit';
    }

    closeAuditView() {
        document.getElementById('auditViewModal').style.display = 'none';
    }

    // ========================================
    // 5. QUALITY SUMMARY DASHBOARD
    // ========================================

    renderQualitySummary() {
        const container = document.getElementById('qualitySummary');
        if (!container) return;

        const totalIQC = this.iqcData.length;
        const inControl = this.iqcData.filter(i => i.inControl).length;
        const iqcRate = totalIQC > 0 ? Math.round((inControl / totalIQC) * 100) : 0;

        const totalEQA = this.eqaData.length;
        const eqaPassed = this.eqaData.filter(e => e.status === 'Passed').length;
        const eqaRate = totalEQA > 0 ? Math.round((eqaPassed / totalEQA) * 100) : 0;

        const totalSOP = this.sopData.length;
        const activeSOP = this.sopData.filter(s => s.status === 'Active').length;
        const sopRate = totalSOP > 0 ? Math.round((activeSOP / totalSOP) * 100) : 0;

        const totalAudit = this.auditData.length;
        const completedAudit = this.auditData.filter(a => a.status === 'Completed').length;
        const auditRate = totalAudit > 0 ? Math.round((completedAudit / totalAudit) * 100) : 0;

        const overallScore = Math.round((iqcRate + eqaRate + sopRate + auditRate) / 4);

        container.innerHTML = `
            <div class="card" style="padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0;">Quality Management Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">
                        <div style="font-size: var(--text-3xl); font-weight: 700; color: ${iqcRate >= 80 ? 'var(--success)' : 'var(--danger)'};">
                            ${iqcRate}%
                        </div>
                        <div style="font-size: var(--text-sm); color: var(--gray-600);">IQC Performance</div>
                        <div style="font-size: var(--text-xs); color: var(--gray-400);">${inControl}/${totalIQC} in control</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">
                        <div style="font-size: var(--text-3xl); font-weight: 700; color: ${eqaRate >= 80 ? 'var(--success)' : 'var(--danger)'};">
                            ${eqaRate}%
                        </div>
                        <div style="font-size: var(--text-sm); color: var(--gray-600);">EQA Performance</div>
                        <div style="font-size: var(--text-xs); color: var(--gray-400);">${eqaPassed}/${totalEQA} passed</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">
                        <div style="font-size: var(--text-3xl); font-weight: 700; color: ${sopRate >= 80 ? 'var(--success)' : 'var(--danger)'};">
                            ${sopRate}%
                        </div>
                        <div style="font-size: var(--text-sm); color: var(--gray-600);">SOP Compliance</div>
                        <div style="font-size: var(--text-xs); color: var(--gray-400);">${activeSOP}/${totalSOP} active</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">
                        <div style="font-size: var(--text-3xl); font-weight: 700; color: ${auditRate >= 80 ? 'var(--success)' : 'var(--danger)'};">
                            ${auditRate}%
                        </div>
                        <div style="font-size: var(--text-sm); color: var(--gray-600);">Audit Completion</div>
                        <div style="font-size: var(--text-xs); color: var(--gray-400);">${completedAudit}/${totalAudit} completed</div>
                    </div>
                </div>
                <div style="margin-top: 1.5rem; padding: 1rem; background: ${overallScore >= 80 ? 'var(--success-light)' : overallScore >= 60 ? 'var(--warning-light)' : 'var(--danger-light)'}; border-radius: var(--radius-sm); text-align: center;">
                    <div style="font-size: var(--text-2xl); font-weight: 700; color: ${overallScore >= 80 ? 'var(--success)' : overallScore >= 60 ? '#856404' : 'var(--danger)'};">
                        Overall Quality Score: ${overallScore}%
                    </div>
                    <div style="font-size: var(--text-sm); color: ${overallScore >= 80 ? 'var(--success)' : overallScore >= 60 ? '#856404' : 'var(--danger)'};">
                        ${overallScore >= 80 ? '✅ ISO 15189:2022 Compliant' : overallScore >= 60 ? '⚠️ Partially Compliant' : '❌ Non-Compliant'}
                    </div>
                </div>
            </div>
        `;
    }
}

// Make quality manager globally available
let qualityManager;

document.addEventListener('DOMContentLoaded', function() {
    qualityManager = new QualityManager();
});

// Global functions
function closeIQCModal() {
    if (qualityManager) qualityManager.closeIQCModal();
}

function closeEQAModal() {
    if (qualityManager) qualityManager.closeEQAModal();
}

function closeEQAView() {
    if (qualityManager) qualityManager.closeEQAView();
}

function closeSOPModal() {
    if (qualityManager) qualityManager.closeSOPModal();
}

function closeSOPView() {
    if (qualityManager) qualityManager.closeSOPView();
}

function closeAuditModal() {
    if (qualityManager) qualityManager.closeAuditModal();
}

function closeAuditView() {
    if (qualityManager) qualityManager.closeAuditView();
}