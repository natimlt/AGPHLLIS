/**
 * ======================================================
 * AGPHL LIS - Sample Management Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class SampleManager {
    constructor() {
        this.samples = [];
        this.filteredSamples = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.editingId = null;
        this.rejectSampleId = null;
        this.searchTerm = '';
        this.statusFilter = '';
        this.priorityFilter = '';
        this.deptFilters = [];
        this.specimenTypeFilters = [];
        this.testFilters = [];
        this.init();
    }

    init() {
        this.loadSamples();
        this.setupEventListeners();
        this.loadDropdowns();
        this.setupFilterMultiSelects();
        this.renderTable();
        this.updateStats();
        this.setupAutoGenerate();
    }

    /**
     * Multi-select filters (Department, Specimen Type, Tests) for the
     * sample list toolbar - lets a person filter across several values
     * at once instead of being limited to one, unlike a native <select>.
     */
    setupFilterMultiSelects() {
        const departments = storage.getAll('departments') || [];
        const specimenTypes = storage.getAll('specimenTypes') || [];
        const allTests = new Set();
        (storage.getAll('testCatalog') || []).forEach(t => allTests.add(t.testName));
        (storage.getAllScoped('samples') || []).forEach(s => (s.tests || []).forEach(t => allTests.add(t)));

        this.deptMultiSelect = new MultiSelectDropdown(
            'sampleDeptFilterContainer', 'All Departments',
            departments.map(d => ({ value: d.name, label: d.name })),
            (selected) => { this.deptFilters = selected; this.currentPage = 1; this.applyFilters(); this.renderTable(); }
        );

        this.specimenTypeMultiSelect = new MultiSelectDropdown(
            'sampleTypeFilterContainer', 'All Sample Types',
            specimenTypes.map(t => ({ value: t.name, label: t.name })),
            (selected) => { this.specimenTypeFilters = selected; this.currentPage = 1; this.applyFilters(); this.renderTable(); }
        );

        this.testMultiSelect = new MultiSelectDropdown(
            'sampleTestFilterContainer', 'All Tests',
            [...allTests].sort().map(t => ({ value: t, label: t })),
            (selected) => { this.testFilters = selected; this.currentPage = 1; this.applyFilters(); this.renderTable(); }
        );
    }

    loadSamples() {
        this.samples = storage.getAllScoped('samples') || [];
        this.applyFilters();
    }

    setupAutoGenerate() {
        document.getElementById('addSampleBtn')?.addEventListener('click', () => {
            document.getElementById('sampleLabNumber').value = Utils.generateLabNumber();
            document.getElementById('sampleBarcode').value = Utils.generateBarcode();
            document.getElementById('sampleStatus').value = 'Registered';
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('sampleCollectionDate').value = now.toISOString().slice(0, 16);
        });
    }

    loadDropdowns() {
        this.loadPatientSelect();
        this.loadSpecimenTypes();
        this.loadDepartments();
        this.loadTestCategories();
    }

    loadPatientSelect() {
        const select = document.getElementById('samplePatientSelect');
        if (!select) return;

        const patients = storage.getAllScoped('patients') || [];
        select.innerHTML = '<option value="">Search and select patient...</option>';
        
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.firstName || ''} ${patient.lastName || ''} (${patient.mrn || 'No MRN'})`;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            const patientId = e.target.value;
            if (patientId) {
                this.showPatientQuickInfo(patientId);
            } else {
                document.getElementById('patientQuickInfo').style.display = 'none';
            }
        });
    }

    showPatientQuickInfo(patientId) {
        const patient = storage.getById('patients', patientId);
        if (!patient) return;

        const quickInfo = document.getElementById('patientQuickInfo');
        quickInfo.style.display = 'block';

        document.getElementById('quickMRN').textContent = patient.mrn || '-';
        document.getElementById('quickName').textContent = `${patient.firstName || ''} ${patient.lastName || ''}`;
        
        const age = patient.birthDate ? Utils.getAge(patient.birthDate) : '-';
        document.getElementById('quickAgeSex').textContent = `${age} / ${patient.sex || '-'}`;
        document.getElementById('quickDept').textContent = patient.department || '-';
    }

    loadSpecimenTypes() {
        const types = storage.getAll('specimenTypes') || [];
        const select = document.getElementById('sampleSpecimenType');
        if (!select) return;

        let specimenTypes = types;
        if (specimenTypes.length === 0) {
            specimenTypes = DefaultData.specimenTypes.map(name => ({ name, id: Utils.generateId('specimenTypes') }));
        }

        select.innerHTML = '<option value="">Select Specimen Type</option>';
        specimenTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            select.appendChild(option);
        });
    }

    loadDepartments() {
        const departments = storage.getAll('departments') || [];
        const select = document.getElementById('sampleDepartment');
        if (!select) return;

        let deptList = departments;
        if (deptList.length === 0) {
            deptList = DefaultData.departments.map(name => ({ name, id: Utils.generateId('departments') }));
        }

        select.innerHTML = '<option value="">Select Department</option>';
        deptList.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.loadTestCategories(e.target.value);
        });
    }

    loadTestCategories(department = null) {
        const select = document.getElementById('sampleTestCategory');
        if (!select) return;

        const categories = Object.keys(DefaultData.testCategories || {});
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        let filteredCategories = categories;
        if (department) {
            filteredCategories = categories.filter(cat => 
                cat.toLowerCase().includes(department.toLowerCase()) || 
                department.toLowerCase().includes(cat.toLowerCase())
            );
        }

        if (filteredCategories.length === 0) {
            filteredCategories = categories;
        }

        filteredCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.loadTests(e.target.value);
        });
    }

    loadTests(category) {
        const select = document.getElementById('sampleTests');
        if (!select) return;

        select.innerHTML = '<option value="">Select tests (hold Ctrl/Cmd for multiple)</option>';

        if (!category || !DefaultData.testCategories[category]) {
            return;
        }

        const tests = DefaultData.testCategories[category];
        tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test;
            option.textContent = test;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addSampleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openSampleModal());
        }

        const searchInput = document.getElementById('sampleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            }, 300));
        }

        const statusFilter = document.getElementById('sampleStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const priorityFilter = document.getElementById('samplePriorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.priorityFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const clearBtn = document.getElementById('clearSampleFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        const form = document.getElementById('sampleForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSample();
            });
        }

        const rejectBtn = document.getElementById('confirmRejectBtn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                this.confirmReject();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSampleModal();
                closeSampleView();
                closeRejectModal();
            }
        });
    }

    applyFilters() {
        this.filteredSamples = this.samples.filter(sample => {
            const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : '';

            const searchMatch = this.searchTerm === '' ||
                (sample.labNumber || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (sample.barcode || '').includes(this.searchTerm) ||
                patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (sample.specimenType || '').toLowerCase().includes(this.searchTerm.toLowerCase());

            const statusMatch = this.statusFilter === '' || sample.status === this.statusFilter;
            const priorityMatch = this.priorityFilter === '' || sample.priority === this.priorityFilter;
            const deptMatch = this.deptFilters.length === 0 || this.deptFilters.includes(sample.department);
            const typeMatch = this.specimenTypeFilters.length === 0 || this.specimenTypeFilters.includes(sample.specimenType);
            const testMatch = this.testFilters.length === 0 || (sample.tests || []).some(t => this.testFilters.includes(t));

            return searchMatch && statusMatch && priorityMatch && deptMatch && typeMatch && testMatch;
        });

        this.filteredSamples.sort((a, b) => {
            return new Date(b.collectionDate || b.createdAt || 0) - new Date(a.collectionDate || a.createdAt || 0);
        });

        this.updateStats();
        this.updateCount();
    }

    clearFilters() {
        const searchInput = document.getElementById('sampleSearch');
        const statusFilter = document.getElementById('sampleStatusFilter');
        const priorityFilter = document.getElementById('samplePriorityFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (priorityFilter) priorityFilter.value = '';
        if (this.deptMultiSelect) this.deptMultiSelect.clear();
        if (this.specimenTypeMultiSelect) this.specimenTypeMultiSelect.clear();
        if (this.testMultiSelect) this.testMultiSelect.clear();

        this.searchTerm = '';
        this.statusFilter = '';
        this.priorityFilter = '';
        this.deptFilters = [];
        this.specimenTypeFilters = [];
        this.testFilters = [];
        this.currentPage = 1;
        this.applyFilters();
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('sampleTableBody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageSamples = this.filteredSamples.slice(start, end);

        if (pageSamples.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div class="empty-icon">🧪</div>
                            <h3>No Samples Found</h3>
                            <p>${this.searchTerm ? 'Try adjusting your search criteria' : 'Start by registering a new sample'}</p>
                            ${!this.searchTerm ? '<button class="btn btn-success btn-sm" onclick="sampleManager.openSampleModal()">Register Sample</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        tbody.innerHTML = pageSamples.map((sample, index) => {
            const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown Patient';
            
            const canUpdate = sample.status !== 'Completed' && 
                             sample.status !== 'Verified' && 
                             sample.status !== 'Rejected' && 
                             sample.status !== 'Cancelled';

            return `
                <tr>
                    <td>${start + index + 1}</td>
                    <td><strong>${sample.labNumber || 'N/A'}</strong></td>
                    <td>${Utils.truncate(patientName, 20)}</td>
                    <td>${sample.specimenType || 'N/A'}</td>
                    <td>
                        <span class="priority-badge ${(sample.priority || 'routine').toLowerCase()}">
                            ${sample.priority || 'Routine'}
                        </span>
                    </td>
                    <td>${sample.collectionDate ? Utils.formatDate(sample.collectionDate, 'MM/DD HH:mm') : 'N/A'}</td>
                    <td>
                        <span class="status-badge ${(sample.status || 'registered').toLowerCase().replace(' ', '-')}">
                            ${sample.status || 'Registered'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" onclick="sampleManager.viewSample('${sample.id}')" title="View Details">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            
                            ${canUpdate ? `
                                ${sample.status === 'Registered' || sample.status === 'Collected' ? `
                                    <button class="action-btn" style="color: var(--info);" onclick="sampleManager.updateSampleStatus('${sample.id}', 'Received')" title="Mark as Received">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                            <path d="M2 17l10 5 10-5"/>
                                            <path d="M2 12l10 5 10-5"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                
                                ${sample.status === 'Received' ? `
                                    <button class="action-btn" style="color: var(--primary);" onclick="sampleManager.updateSampleStatus('${sample.id}', 'Processing')" title="Start Processing">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="23 4 23 10 17 10"/>
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                
                                ${sample.status === 'Processing' ? `
                                    <button class="action-btn" style="color: var(--success);" onclick="sampleManager.updateSampleStatus('${sample.id}', 'Completed')" title="Complete">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                            <polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                
                                ${sample.status === 'Completed' ? `
                                    <button class="action-btn" style="color: #1b5e20;" onclick="sampleManager.updateSampleStatus('${sample.id}', 'Verified')" title="Verify">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                            <path d="M9 12l2 2 4-4"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                
                                <button class="action-btn" style="color: var(--danger);" onclick="sampleManager.openRejectModal('${sample.id}')" title="Reject Sample">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="15" y1="9" x2="9" y2="15"/>
                                        <line x1="9" y1="9" x2="15" y2="15"/>
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
        const container = document.getElementById('samplePagination');
        const info = document.getElementById('samplePaginationInfo');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredSamples.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            if (info) info.textContent = `Showing ${this.filteredSamples.length} samples`;
            return;
        }

        const pages = Utils.generatePagination(this.currentPage, totalPages);
        
        container.innerHTML = `
            <button onclick="sampleManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                ←
            </button>
            ${pages.map(page => `
                <button class="${page === this.currentPage ? 'active' : ''}" 
                        onclick="${page === '...' ? '' : `sampleManager.goToPage(${page})`}"
                        ${page === '...' ? 'disabled' : ''}>
                    ${page}
                </button>
            `).join('')}
            <button onclick="sampleManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                →
            </button>
        `;

        if (info) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.filteredSamples.length);
            info.textContent = `Showing ${start}-${end} of ${this.filteredSamples.length} samples`;
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredSamples.length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderTable();
    }

    updateStats() {
        const totalEl = document.getElementById('totalSamplesCount');
        const pendingEl = document.getElementById('pendingSamplesCount');
        const todayEl = document.getElementById('todaySamplesCount');
        const rejectedEl = document.getElementById('rejectedSamplesCount');

        if (totalEl) totalEl.textContent = this.samples.length;

        if (pendingEl) {
            const pending = this.samples.filter(s => 
                s.status !== 'Completed' && 
                s.status !== 'Verified' && 
                s.status !== 'Rejected' && 
                s.status !== 'Cancelled'
            ).length;
            pendingEl.textContent = pending;
        }

        if (todayEl) {
            const today = new Date().toISOString().split('T')[0];
            const todayCount = this.samples.filter(s => 
                s.collectionDate?.startsWith(today)
            ).length;
            todayEl.textContent = todayCount;
        }

        if (rejectedEl) {
            const rejected = this.samples.filter(s => s.status === 'Rejected').length;
            rejectedEl.textContent = rejected;
        }
    }

    updateCount() {
        const countEl = document.getElementById('sampleCount');
        if (countEl) {
            const total = this.filteredSamples.length;
            countEl.textContent = `Showing ${total} sample${total !== 1 ? 's' : ''}`;
        }
    }

    openSampleModal(sample = null) {
        const modal = document.getElementById('sampleModal');
        const title = document.getElementById('sampleModalTitle');
        const form = document.getElementById('sampleForm');
        
        if (!modal) return;

        form.reset();
        this.clearErrors();
        this.editingId = null;

        document.getElementById('sampleLabNumber').value = Utils.generateLabNumber();
        document.getElementById('sampleBarcode').value = Utils.generateBarcode();
        document.getElementById('sampleStatus').value = 'Registered';

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('sampleCollectionDate').value = now.toISOString().slice(0, 16);

        document.getElementById('patientQuickInfo').style.display = 'none';

        if (sample) {
            title.textContent = 'Edit Sample';
            this.editingId = sample.id;
            this.fillForm(sample);
        } else {
            title.textContent = 'Register New Sample';
        }

        modal.style.display = 'flex';
        document.getElementById('samplePatientSelect').focus();
    }

    fillForm(sample) {
        document.getElementById('samplePatientSelect').value = sample.patientId || '';
        if (sample.patientId) {
            this.showPatientQuickInfo(sample.patientId);
        }
        document.getElementById('sampleSpecimenType').value = sample.specimenType || '';
        document.getElementById('samplePriority').value = sample.priority || 'Routine';
        document.getElementById('sampleDepartment').value = sample.department || '';
        this.loadTestCategories(sample.department);
        document.getElementById('sampleTestCategory').value = sample.testCategory || '';
        this.loadTests(sample.testCategory);
        
        if (sample.tests && sample.tests.length > 0) {
            const testSelect = document.getElementById('sampleTests');
            Array.from(testSelect.options).forEach(option => {
                if (sample.tests.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
        
        document.getElementById('sampleCollector').value = sample.collector || '';
        if (sample.collectionDate) {
            const date = new Date(sample.collectionDate);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            document.getElementById('sampleCollectionDate').value = date.toISOString().slice(0, 16);
        }
        document.getElementById('sampleNotes').value = sample.notes || '';
        document.getElementById('sampleLabNumber').value = sample.labNumber || '';
        document.getElementById('sampleBarcode').value = sample.barcode || '';
        document.getElementById('sampleStatus').value = sample.status || 'Registered';
    }

    saveSample() {
        const submitBtn = document.getElementById('saveSampleBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        const selectedTests = Array.from(document.getElementById('sampleTests').selectedOptions)
            .filter(opt => opt.value)
            .map(opt => opt.value);

        const data = {
            patientId: document.getElementById('samplePatientSelect').value,
            specimenType: document.getElementById('sampleSpecimenType').value,
            priority: document.getElementById('samplePriority').value,
            department: document.getElementById('sampleDepartment').value,
            testCategory: document.getElementById('sampleTestCategory').value,
            tests: selectedTests,
            collector: document.getElementById('sampleCollector').value.trim(),
            collectionDate: document.getElementById('sampleCollectionDate').value,
            notes: document.getElementById('sampleNotes').value.trim(),
            labNumber: document.getElementById('sampleLabNumber').value,
            barcode: document.getElementById('sampleBarcode').value,
            status: document.getElementById('sampleStatus').value
        };

        const errors = this.validateSample(data);
        if (Object.keys(errors).length > 0) {
            this.showFieldErrors(errors);
            return;
        }

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';

        try {
            const timeline = [{
                status: data.status || 'Registered',
                timestamp: new Date().toISOString(),
                note: 'Sample registered'
            }];

            const sampleData = {
                ...data,
                timeline: timeline,
                isCritical: false,
                criticalReported: false,
                isRepeat: false,
                resultDate: null
            };

            if (this.editingId) {
                const existing = storage.getById('samples', this.editingId);
                if (existing && existing.timeline) {
                    sampleData.timeline = existing.timeline;
                }
                storage.update('samples', this.editingId, sampleData);
                showToast('Sample updated successfully!', 'success');
            } else {
                storage.create('samples', sampleData);
                showToast('Sample registered successfully!', 'success');
            }

            this.loadSamples();
            this.renderTable();
            this.updateStats();
            this.closeSampleModal();

        } catch (error) {
            showToast('Error saving sample: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    validateSample(data) {
        const errors = {};

        if (!data.patientId) {
            errors.patientSelect = 'Please select a patient';
        }

        if (!data.specimenType) {
            errors.specimenType = 'Please select a specimen type';
        }

        if (!data.priority) {
            errors.priority = 'Please select a priority';
        }

        if (!data.department) {
            errors.sampleDepartment = 'Please select a department';
        }

        if (!data.testCategory) {
            errors.testCategory = 'Please select a test category';
        }

        if (!data.tests || data.tests.length === 0) {
            errors.tests = 'Please select at least one test';
        }

        if (!data.collectionDate) {
            errors.collectionDate = 'Please select collection date and time';
        }

        return errors;
    }

    showFieldErrors(errors) {
        for (const [field, message] of Object.entries(errors)) {
            const errorEl = document.getElementById(`${field}Error`);
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            }
        }

        const firstError = document.querySelector('.error-message[style*="display: block"]');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearErrors() {
        document.querySelectorAll('#sampleForm .error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('#sampleForm .form-group input, #sampleForm .form-group select').forEach(el => {
            el.classList.remove('error');
        });
    }

    closeSampleModal() {
        const modal = document.getElementById('sampleModal');
        if (modal) modal.style.display = 'none';
        this.clearErrors();
    }

    updateSampleStatus(id, newStatus) {
        const sample = storage.getById('samples', id);
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        const timeline = sample.timeline || [];
        timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: `Status changed to ${newStatus}`
        });

        const updateData = {
            status: newStatus,
            timeline: timeline
        };

        if (newStatus === 'Completed' || newStatus === 'Verified') {
            updateData.resultDate = new Date().toISOString();
        }

        try {
            storage.update('samples', id, updateData);
            showToast(`Sample status updated to ${newStatus}`, 'success');
            this.loadSamples();
            this.renderTable();
            this.updateStats();
        } catch (error) {
            showToast('Error updating sample: ' + error.message, 'error');
        }
    }

    openRejectModal(id) {
        this.rejectSampleId = id;
        const modal = document.getElementById('rejectModal');
        if (modal) {
            document.getElementById('rejectForm').reset();
            modal.style.display = 'flex';
        }
    }

    closeRejectModal() {
        const modal = document.getElementById('rejectModal');
        if (modal) modal.style.display = 'none';
        this.rejectSampleId = null;
    }

    confirmReject() {
        if (!this.rejectSampleId) {
            showToast('No sample selected for rejection', 'error');
            return;
        }

        const reason = document.getElementById('rejectReason').value;
        const comment = document.getElementById('rejectComment').value.trim();

        if (!reason) {
            showToast('Please select a rejection reason', 'warning');
            return;
        }

        const sample = storage.getById('samples', this.rejectSampleId);
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        const timeline = sample.timeline || [];
        timeline.push({
            status: 'Rejected',
            timestamp: new Date().toISOString(),
            note: `Rejected: ${reason}${comment ? ' - ' + comment : ''}`
        });

        try {
            storage.update('samples', this.rejectSampleId, {
                status: 'Rejected',
                timeline: timeline,
                rejectionReason: reason,
                rejectionComment: comment,
                rejectionDate: new Date().toISOString()
            });

            showToast('Sample rejected successfully', 'info');
            this.loadSamples();
            this.renderTable();
            this.updateStats();
            this.closeRejectModal();
        } catch (error) {
            showToast('Error rejecting sample: ' + error.message, 'error');
        }
    }

    viewSample(id) {
        const sample = storage.getById('samples', id);
        if (!sample) {
            showToast('Sample not found', 'error');
            return;
        }

        const modal = document.getElementById('sampleViewModal');
        const content = document.getElementById('sampleViewContent');
        
        if (!modal || !content) return;

        const patient = sample.patientId ? storage.getById('patients', sample.patientId) : null;
        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';

        const testsList = sample.tests && sample.tests.length > 0 
            ? sample.tests.join(', ') 
            : 'No tests selected';

        const timelineHtml = (sample.timeline || []).map(entry => {
            const iconClass = entry.status === 'Rejected' ? 'red' : 
                             entry.status === 'Completed' || entry.status === 'Verified' ? 'green' : 'blue';
            return `
                <div class="timeline-item">
                    <div class="timeline-icon ${iconClass}">
                        ${entry.status === 'Rejected' ? '✕' : 
                          entry.status === 'Completed' || entry.status === 'Verified' ? '✓' : '●'}
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${entry.status}</div>
                        <div class="timeline-time">${Utils.formatDate(entry.timestamp)}</div>
                        ${entry.note ? `<div style="font-size: var(--text-xs); color: var(--gray-500);">${entry.note}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="sample-view-grid">
                <div class="patient-view-section">
                    <h4>Sample Information</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Lab Number</span>
                        <span class="patient-view-value"><strong>${sample.labNumber || 'N/A'}</strong></span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Barcode</span>
                        <span class="patient-view-value">${sample.barcode || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Patient</span>
                        <span class="patient-view-value">${patientName}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Specimen Type</span>
                        <span class="patient-view-value">${sample.specimenType || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Priority</span>
                        <span class="patient-view-value">
                            <span class="priority-badge ${(sample.priority || 'routine').toLowerCase()}">
                                ${sample.priority || 'Routine'}
                            </span>
                        </span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Status</span>
                        <span class="patient-view-value">
                            <span class="status-badge ${(sample.status || 'registered').toLowerCase().replace(' ', '-')}">
                                ${sample.status || 'Registered'}
                            </span>
                        </span>
                    </div>
                </div>

                <div class="patient-view-section">
                    <h4>Test Information</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Department</span>
                        <span class="patient-view-value">${sample.department || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Test Category</span>
                        <span class="patient-view-value">${sample.testCategory || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Tests</span>
                        <span class="patient-view-value" style="font-size: var(--text-xs);">${testsList}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Collected By</span>
                        <span class="patient-view-value">${sample.collector || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Collection Date</span>
                        <span class="patient-view-value">${sample.collectionDate ? Utils.formatDate(sample.collectionDate) : 'N/A'}</span>
                    </div>
                    ${sample.resultDate ? `
                        <div class="patient-view-item">
                            <span class="patient-view-label">Result Date</span>
                            <span class="patient-view-value">${Utils.formatDate(sample.resultDate)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${sample.notes ? `
                <div class="patient-view-section" style="margin-top: 1rem;">
                    <h4>Notes</h4>
                    <p style="margin: 0; color: var(--gray-700); font-size: var(--text-sm);">${sample.notes}</p>
                </div>
            ` : ''}

            ${sample.rejectionReason ? `
                <div class="patient-view-section" style="margin-top: 1rem; background: var(--danger-light);">
                    <h4 style="color: var(--danger);">Rejection Details</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Reason</span>
                        <span class="patient-view-value">${sample.rejectionReason}</span>
                    </div>
                    ${sample.rejectionComment ? `
                        <div class="patient-view-item">
                            <span class="patient-view-label">Comment</span>
                            <span class="patient-view-value">${sample.rejectionComment}</span>
                        </div>
                    ` : ''}
                    <div class="patient-view-item">
                        <span class="patient-view-label">Rejected On</span>
                        <span class="patient-view-value">${sample.rejectionDate ? Utils.formatDate(sample.rejectionDate) : 'N/A'}</span>
                    </div>
                </div>
            ` : ''}

            ${timelineHtml ? `
                <div class="sample-timeline">
                    <h4>Sample Timeline</h4>
                    ${timelineHtml}
                </div>
            ` : ''}

            <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeSampleView()">Close</button>
                ${sample.status !== 'Rejected' && sample.status !== 'Cancelled' ? `
                    <button class="btn btn-primary" onclick="sampleManager.openSampleModal(storage.getById('samples', '${sample.id}')); closeSampleView();">
                        Edit Sample
                    </button>
                ` : ''}
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeSampleView() {
        const modal = document.getElementById('sampleViewModal');
        if (modal) modal.style.display = 'none';
    }
}

// Make sample manager globally available
let sampleManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    sampleManager = new SampleManager();
});

// Global functions
function closeSampleModal() {
    if (sampleManager) sampleManager.closeSampleModal();
}

function closeSampleView() {
    if (sampleManager) sampleManager.closeSampleView();
}

function closeRejectModal() {
    if (sampleManager) sampleManager.closeRejectModal();
}