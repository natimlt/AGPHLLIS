/**
 * ======================================================
 * AGPHL LIS - Results Management Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class ResultsManager {
    constructor() {
        this.results = [];
        this.filteredResults = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.selectedSampleId = null;
        this.verifySampleId = null;
        this.searchTerm = '';
        this.statusFilter = '';
        this.departmentFilter = '';
        this.init();
    }

    init() {
        this.loadResults();
        this.setupEventListeners();
        this.renderTable();
        this.updateStats();
        this.loadDepartments();
    }

    loadResults() {
        this.results = storage.getAllScoped('results') || [];
        this.applyFilters();
    }

    loadDepartments() {
        const departments = storage.getAll('departments') || [];
        const filterSelect = document.getElementById('resultDepartmentFilter');
        if (!filterSelect) return;

        let deptList = departments;
        if (deptList.length === 0) {
            deptList = DefaultData.departments.map(name => ({ name, id: Utils.generateId('departments') }));
        }

        filterSelect.innerHTML = '<option value="">All Departments</option>';
        deptList.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            filterSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        const searchInput = document.getElementById('resultSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            }, 300));
        }

        const statusFilter = document.getElementById('resultStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const deptFilter = document.getElementById('resultDepartmentFilter');
        if (deptFilter) {
            deptFilter.addEventListener('change', (e) => {
                this.departmentFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const clearBtn = document.getElementById('clearResultFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }

        const form = document.getElementById('resultForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveResults();
            });
        }

        const verifyForm = document.getElementById('verifyForm');
        if (verifyForm) {
            verifyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyResults();
            });
        }
    }

    applyFilters() {
        this.filteredResults = this.results.filter(result => {
            const sample = result.sampleId ? storage.getById('samples', result.sampleId) : null;
            const patient = sample?.patientId ? storage.getById('patients', sample.patientId) : null;
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : '';

            const searchMatch = this.searchTerm === '' ||
                (result.labNumber || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (result.testName || '').toLowerCase().includes(this.searchTerm.toLowerCase());

            const statusMatch = this.statusFilter === '' || result.status === this.statusFilter;
            const deptMatch = this.departmentFilter === '' || result.department === this.departmentFilter;

            return searchMatch && statusMatch && deptMatch;
        });

        this.filteredResults.sort((a, b) => {
            return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });

        this.updateStats();
        this.updateCount();
    }

    clearFilters() {
        const searchInput = document.getElementById('resultSearch');
        const statusFilter = document.getElementById('resultStatusFilter');
        const deptFilter = document.getElementById('resultDepartmentFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (deptFilter) deptFilter.value = '';

        this.searchTerm = '';
        this.statusFilter = '';
        this.departmentFilter = '';
        this.currentPage = 1;
        this.applyFilters();
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('resultTableBody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageResults = this.filteredResults.slice(start, end);

        if (pageResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-icon">📊</div>
                            <h3>No Results Found</h3>
                            <p>${this.searchTerm ? 'Try adjusting your search criteria' : 'Results will appear here when tests are completed'}</p>
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        tbody.innerHTML = pageResults.map((result, index) => {
            const sample = result.sampleId ? storage.getById('samples', result.sampleId) : null;
            const patient = sample?.patientId ? storage.getById('patients', sample.patientId) : null;
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

            const isCritical = result.isCritical || false;
            const hasAbnormal = result.hasAbnormal || false;

            let flagHtml = '';
            if (isCritical) {
                flagHtml = '<span class="flag-critical">CRITICAL</span>';
            } else if (hasAbnormal) {
                flagHtml = '<span class="flag-high">Abnormal</span>';
            } else {
                flagHtml = '<span class="flag-normal">Normal</span>';
            }

            return `
                <tr>
                    <td>${start + index + 1}</td>
                    <td><strong>${result.labNumber || 'N/A'}</strong></td>
                    <td>${Utils.truncate(patientName, 20)}</td>
                    <td>${result.testName || 'N/A'}</td>
                    <td>${result.result || 'N/A'} ${result.unit || ''}</td>
                    <td>${flagHtml}</td>
                    <td>
                        <span class="result-status-badge ${(result.status || 'pending').toLowerCase()}">
                            ${result.status || 'Pending'}
                        </span>
                    </td>
                    <td>${result.verifiedBy ? '✓ Verified' : '—'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" onclick="resultsManager.viewResult('${result.id}')" title="View">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            ${result.status !== 'verified' ? `
                                <button class="action-btn edit-btn" onclick="resultsManager.editResult('${result.id}')" title="Edit">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            ` : ''}
                            ${result.status === 'complete' && !result.verifiedBy ? `
                                <button class="action-btn" style="color: var(--primary);" onclick="resultsManager.openVerification('${result.sampleId}')" title="Verify">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <path d="M9 12l2 2 4-4"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const container = document.getElementById('resultPagination');
        const info = document.getElementById('resultPaginationInfo');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredResults.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            if (info) info.textContent = `Showing ${this.filteredResults.length} results`;
            return;
        }

        const pages = Utils.generatePagination(this.currentPage, totalPages);
        
        container.innerHTML = `
            <button onclick="resultsManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                ←
            </button>
            ${pages.map(page => `
                <button class="${page === this.currentPage ? 'active' : ''}" 
                        onclick="${page === '...' ? '' : `resultsManager.goToPage(${page})`}"
                        ${page === '...' ? 'disabled' : ''}>
                    ${page}
                </button>
            `).join('')}
            <button onclick="resultsManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                →
            </button>
        `;

        if (info) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.filteredResults.length);
            info.textContent = `Showing ${start}-${end} of ${this.filteredResults.length} results`;
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredResults.length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderTable();
    }

    updateStats() {
        const totalEl = document.getElementById('totalResultsCount');
        const pendingEl = document.getElementById('pendingResultsCount');
        const verifiedEl = document.getElementById('verifiedResultsCount');
        const criticalEl = document.getElementById('criticalResultsCount');

        if (totalEl) totalEl.textContent = this.results.length;
        
        if (pendingEl) {
            const pending = this.results.filter(r => r.status === 'pending' || r.status === 'partial').length;
            pendingEl.textContent = pending;
        }
        
        if (verifiedEl) {
            const verified = this.results.filter(r => r.status === 'verified').length;
            verifiedEl.textContent = verified;
        }
        
        if (criticalEl) {
            const critical = this.results.filter(r => r.isCritical === true).length;
            criticalEl.textContent = critical;
        }
    }

    updateCount() {
        const countEl = document.getElementById('resultCount');
        if (countEl) {
            const total = this.filteredResults.length;
            countEl.textContent = `Showing ${total} result${total !== 1 ? 's' : ''}`;
        }
    }

    openResultEntry(sampleId) {
        const sample = storage.getById('samples', sampleId);
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        if (sample.status === 'Rejected' || sample.status === 'Cancelled') {
            showToast('Cannot enter results for rejected or cancelled samples', 'warning');
            return;
        }

        this.selectedSampleId = sampleId;
        const modal = document.getElementById('resultEntryModal');
        const title = document.getElementById('resultEntryTitle');
        
        if (!modal) return;

        const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

        title.textContent = `Enter Results - ${sample.labNumber}`;
        
        document.getElementById('resultSampleInfo').innerHTML = `
            <div class="quick-info-grid">
                <span><strong>Lab #:</strong> ${sample.labNumber}</span>
                <span><strong>Patient:</strong> ${patientName}</span>
                <span><strong>Specimen:</strong> ${sample.specimenType || 'N/A'}</span>
                <span><strong>Priority:</strong> ${sample.priority || 'Routine'}</span>
            </div>
        `;

        this.loadTestResults(sample);

        modal.style.display = 'flex';
    }

    loadTestResults(sample) {
        const container = document.getElementById('resultFields');
        if (!container) return;

        const tests = sample.tests || [];
        
        if (tests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 1rem;">No tests selected for this sample</p>';
            return;
        }

        const existingResults = this.results.filter(r => r.sampleId === sample.id);

        container.innerHTML = tests.map((test, index) => {
            const existing = existingResults.find(r => r.testName === test);
            return `
                <div class="result-field">
                    <label>
                        ${test}
                        <span class="unit">(Enter result)</span>
                    </label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="text" 
                               id="result_${index}" 
                               class="result-input" 
                               data-test="${test}"
                               value="${existing?.result || ''}"
                               placeholder="Enter result value..."
                               style="flex: 1; padding: 0.5rem; border: 2px solid var(--gray-300); border-radius: var(--radius-sm);">
                        <input type="text" 
                               id="unit_${index}" 
                               class="unit-input" 
                               placeholder="Unit"
                               value="${existing?.unit || ''}"
                               style="width: 80px; padding: 0.5rem; border: 2px solid var(--gray-300); border-radius: var(--radius-sm);">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 0.25rem;">
                        <input type="text" 
                               id="refLow_${index}" 
                               placeholder="Ref low"
                               value="${existing?.referenceLow || ''}"
                               style="width: 80px; font-size: var(--text-xs); padding: 0.25rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                        <span style="color: var(--gray-400);">-</span>
                        <input type="text" 
                               id="refHigh_${index}" 
                               placeholder="Ref high"
                               value="${existing?.referenceHigh || ''}"
                               style="width: 80px; font-size: var(--text-xs); padding: 0.25rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm);">
                        <label style="font-size: var(--text-xs); display: flex; align-items: center; gap: 0.25rem;">
                            <input type="checkbox" id="critical_${index}" ${existing?.isCritical ? 'checked' : ''}>
                            Critical
                        </label>
                    </div>
                    <div class="reference-range">
                        <span style="color: var(--gray-500);">Reference range: </span>
                        <span id="refRangeDisplay_${index}">${existing?.referenceLow || ''} - ${existing?.referenceHigh || ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.result-input').forEach(input => {
            input.addEventListener('change', () => {
                this.checkResultFlags(input);
            });
            input.addEventListener('input', Utils.debounce(() => {
                this.checkResultFlags(input);
            }, 500));
        });
    }

    checkResultFlags(input) {
        const index = Array.from(document.querySelectorAll('.result-input')).indexOf(input);
        const value = parseFloat(input.value);
        const refLow = parseFloat(document.getElementById(`refLow_${index}`)?.value);
        const refHigh = parseFloat(document.getElementById(`refHigh_${index}`)?.value);
        const display = document.getElementById(`refRangeDisplay_${index}`);

        if (!isNaN(value) && !isNaN(refLow) && !isNaN(refHigh)) {
            const status = value < refLow ? '⬇ Low' : value > refHigh ? '⬆ High' : '✓ Normal';
            display.textContent = `${refLow} - ${refHigh} (${status})`;
            display.style.color = value < refLow || value > refHigh ? 'var(--danger)' : 'var(--success)';
        } else {
            display.textContent = `${refLow || '?'} - ${refHigh || '?'}`;
            display.style.color = '';
        }
    }

    saveResults() {
        const sample = storage.getById('samples', this.selectedSampleId);
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        const inputs = document.querySelectorAll('.result-input');
        const results = [];
        let hasCritical = false;
        let hasAbnormal = false;

        inputs.forEach((input, index) => {
            const testName = input.dataset.test;
            const value = input.value.trim();
            const unit = document.getElementById(`unit_${index}`)?.value.trim() || '';
            const refLow = document.getElementById(`refLow_${index}`)?.value.trim() || '';
            const refHigh = document.getElementById(`refHigh_${index}`)?.value.trim() || '';
            const isCritical = document.getElementById(`critical_${index}`)?.checked || false;

            if (value) {
                const numValue = parseFloat(value);
                const numLow = parseFloat(refLow);
                const numHigh = parseFloat(refHigh);
                let flag = 'normal';

                if (!isNaN(numValue) && !isNaN(numLow) && !isNaN(numHigh)) {
                    if (isCritical) {
                        flag = 'critical';
                        hasCritical = true;
                    } else if (numValue < numLow || numValue > numHigh) {
                        flag = 'abnormal';
                        hasAbnormal = true;
                    }
                }

                const resultData = {
                    sampleId: sample.id,
                    labNumber: sample.labNumber,
                    patientId: sample.patientId,
                    testName: testName,
                    result: value,
                    unit: unit,
                    referenceLow: refLow,
                    referenceHigh: refHigh,
                    flag: flag,
                    isCritical: isCritical,
                    hasAbnormal: flag === 'abnormal',
                    status: 'pending',
                    department: sample.department,
                    testCategory: sample.testCategory,
                    enteredBy: auth.getCurrentUser()?.fullName || 'Unknown',
                    enteredAt: new Date().toISOString()
                };

                const existing = this.results.find(r => r.sampleId === sample.id && r.testName === testName);
                if (existing) {
                    storage.update('results', existing.id, resultData);
                    results.push({ ...resultData, id: existing.id });
                } else {
                    const created = storage.create('results', resultData);
                    results.push(created);
                }
            }
        });

        const allTests = sample.tests || [];
        const completedTests = results.length;
        const totalTests = allTests.length;

        let newStatus = 'pending';
        if (completedTests === 0) {
            newStatus = 'pending';
        } else if (completedTests < totalTests) {
            newStatus = 'partial';
        } else {
            newStatus = 'complete';
        }

        const timeline = sample.timeline || [];
        timeline.push({
            status: `Results ${newStatus}`,
            timestamp: new Date().toISOString(),
            note: `Results ${newStatus === 'complete' ? 'completed' : 'partially entered'}`
        });

        storage.update('samples', sample.id, {
            status: newStatus,
            timeline: timeline,
            resultDate: newStatus === 'complete' ? new Date().toISOString() : null
        });

        if (hasCritical) {
            const criticalResults = results.filter(r => r.isCritical);
            this.handleCriticalValues(sample, criticalResults);
        }

        showToast(`Results saved successfully! (${completedTests}/${totalTests} tests)`, 'success');
        
        this.loadResults();
        this.renderTable();
        this.updateStats();
        this.closeResultEntry();

        if (newStatus === 'complete') {
            setTimeout(() => {
                if (confirm('All results are entered. Would you like to verify this sample now?')) {
                    this.openVerification(sample.id);
                }
            }, 500);
        }
    }

    handleCriticalValues(sample, criticalResults) {
        const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

        const alertData = {
            sampleId: sample.id,
            labNumber: sample.labNumber,
            patientName: patientName,
            tests: criticalResults.map(r => r.testName).join(', '),
            values: criticalResults.map(r => `${r.testName}: ${r.result} ${r.unit}`).join('; '),
            status: 'Open',
            createdAt: new Date().toISOString(),
            resolvedAt: null,
            resolvedBy: null
        };

        storage.create('criticalAlerts', alertData);
        showToast(`⚠️ CRITICAL VALUE: ${patientName} - ${criticalResults.map(r => r.testName).join(', ')}`, 'error');
    }

    openVerification(sampleId) {
        const sample = typeof sampleId === 'string' ? storage.getById('samples', sampleId) : sampleId;
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        const modal = document.getElementById('verifyModal');
        if (!modal) return;

        const results = this.results.filter(r => r.sampleId === sample.id && r.status !== 'verified');

        if (results.length === 0) {
            showToast('No results to verify', 'warning');
            return;
        }

        const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

        document.getElementById('verifySampleInfo').innerHTML = `
            <div class="quick-info-grid">
                <span><strong>Lab #:</strong> ${sample.labNumber}</span>
                <span><strong>Patient:</strong> ${patientName}</span>
                <span><strong>Tests:</strong> ${results.length}</span>
                <span><strong>Status:</strong> ${sample.status}</span>
            </div>
        `;

        const resultsHtml = results.map(r => `
            <div style="padding: 0.5rem; background: var(--white); border-radius: var(--radius-sm); margin-bottom: 0.5rem; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${r.testName}</strong></span>
                    <span>${r.result} ${r.unit || ''}</span>
                    <span class="${r.isCritical ? 'flag-critical' : r.hasAbnormal ? 'flag-high' : 'flag-normal'}">
                        ${r.isCritical ? 'CRITICAL' : r.hasAbnormal ? 'Abnormal' : 'Normal'}
                    </span>
                </div>
                <div style="font-size: var(--text-xs); color: var(--gray-500);">
                    Ref: ${r.referenceLow || '?'} - ${r.referenceHigh || '?'}
                </div>
            </div>
        `).join('');

        document.getElementById('verifyResultsList').innerHTML = resultsHtml;
        this.verifySampleId = sample.id;
        modal.style.display = 'flex';
        document.getElementById('verifierName').focus();
    }

    verifyResults() {
        if (!this.verifySampleId) {
            showToast('No sample selected for verification', 'error');
            return;
        }

        const verifierName = document.getElementById('verifierName').value.trim() || 
                            auth.getCurrentUser()?.fullName || 'Unknown';
        const comments = document.getElementById('verifyComments').value.trim();

        const results = this.results.filter(r => r.sampleId === this.verifySampleId && r.status !== 'verified');

        results.forEach(result => {
            storage.update('results', result.id, {
                status: 'verified',
                verifiedBy: verifierName,
                verifiedAt: new Date().toISOString(),
                verifyComments: comments
            });
        });

        const sample = storage.getById('samples', this.verifySampleId);
        if (sample) {
            const timeline = sample.timeline || [];
            timeline.push({
                status: 'Verified',
                timestamp: new Date().toISOString(),
                note: `Verified by ${verifierName}${comments ? ': ' + comments : ''}`
            });

            storage.update('samples', this.verifySampleId, {
                status: 'Verified',
                timeline: timeline,
                verifiedAt: new Date().toISOString(),
                verifiedBy: verifierName
            });
        }

        showToast(`Results verified successfully by ${verifierName}`, 'success');
        
        this.loadResults();
        this.renderTable();
        this.updateStats();
        this.closeVerification();
    }

    viewResult(id) {
        const result = storage.getById('results', id);
        if (!result) {
            showToast('Result not found', 'error');
            return;
        }

        const modal = document.getElementById('resultViewModal');
        const content = document.getElementById('resultViewContent');
        
        if (!modal || !content) return;

        const sample = result.sampleId ? storage.getById('samples', result.sampleId) : null;
        const patient = sample?.patientId ? storage.getById('patients', sample.patientId) : null;
        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

        content.innerHTML = `
            <div class="result-view-grid">
                <div class="patient-view-section">
                    <h4>Result Information</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Lab Number</span>
                        <span class="patient-view-value"><strong>${result.labNumber || 'N/A'}</strong></span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Patient</span>
                        <span class="patient-view-value">${patientName}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Test Name</span>
                        <span class="patient-view-value">${result.testName || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Result</span>
                        <span class="patient-view-value">
                            <strong>${result.result || 'N/A'}</strong> ${result.unit || ''}
                        </span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Reference Range</span>
                        <span class="patient-view-value">${result.referenceLow || '?'} - ${result.referenceHigh || '?'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Flag</span>
                        <span class="patient-view-value">
                            ${result.isCritical ? '<span class="flag-critical">CRITICAL</span>' : 
                              result.hasAbnormal ? '<span class="flag-high">Abnormal</span>' : 
                              '<span class="flag-normal">Normal</span>'}
                        </span>
                    </div>
                </div>

                <div class="patient-view-section">
                    <h4>Status Information</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Status</span>
                        <span class="patient-view-value">
                            <span class="result-status-badge ${(result.status || 'pending').toLowerCase()}">
                                ${result.status || 'Pending'}
                            </span>
                        </span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Entered By</span>
                        <span class="patient-view-value">${result.enteredBy || 'Unknown'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Entered At</span>
                        <span class="patient-view-value">${result.enteredAt ? Utils.formatDate(result.enteredAt) : 'N/A'}</span>
                    </div>
                    ${result.verifiedBy ? `
                        <div class="patient-view-item">
                            <span class="patient-view-label">Verified By</span>
                            <span class="patient-view-value">${result.verifiedBy}</span>
                        </div>
                        <div class="patient-view-item">
                            <span class="patient-view-label">Verified At</span>
                            <span class="patient-view-value">${result.verifiedAt ? Utils.formatDate(result.verifiedAt) : 'N/A'}</span>
                        </div>
                        ${result.verifyComments ? `
                            <div class="patient-view-item">
                                <span class="patient-view-label">Comments</span>
                                <span class="patient-view-value">${result.verifyComments}</span>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    editResult(id) {
        const result = storage.getById('results', id);
        if (!result) {
            showToast('Result not found', 'error');
            return;
        }

        this.openResultEntry(result.sampleId);
        
        setTimeout(() => {
            const inputs = document.querySelectorAll('.result-input');
            inputs.forEach(input => {
                if (input.dataset.test === result.testName) {
                    input.value = result.result || '';
                    input.focus();
                    input.select();
                }
            });
        }, 300);
    }

    closeResultEntry() {
        document.getElementById('resultEntryModal').style.display = 'none';
        this.selectedSampleId = null;
    }

    closeVerification() {
        document.getElementById('verifyModal').style.display = 'none';
        this.verifySampleId = null;
        document.getElementById('verifierName').value = '';
        document.getElementById('verifyComments').value = '';
    }

    closeResultView() {
        document.getElementById('resultViewModal').style.display = 'none';
    }
}

// Make results manager globally available
let resultsManager;

document.addEventListener('DOMContentLoaded', function() {
    resultsManager = new ResultsManager();
});

function closeResultEntry() {
    if (resultsManager) resultsManager.closeResultEntry();
}

function closeVerification() {
    if (resultsManager) resultsManager.closeVerification();
}

function closeResultView() {
    if (resultsManager) resultsManager.closeResultView();
}