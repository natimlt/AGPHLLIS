/**
 * ======================================================
 * AGPHL LIS - Patient Management Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class PatientManager {
    constructor() {
        this.patients = [];
        this.filteredPatients = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.editingId = null;
        this.searchTerm = '';
        this.departmentFilters = [];
        this.statusFilter = '';
        this.init();
    }

    init() {
        this.loadPatients();
        this.setupEventListeners();
        this.loadDepartments();
        this.renderTable();
        this.updateStats();
    }

    loadPatients() {
        this.patients = storage.getAllScoped('patients') || [];
        this.applyFilters();
    }

    loadDepartments() {
        const departments = storage.getAll('departments') || [];
        // If no departments, use defaults
        let deptList = departments;
        if (deptList.length === 0) {
            deptList = DefaultData.departments.map(name => ({ name, id: Utils.generateId('departments') }));
            deptList.forEach(d => storage.create('departments', d));
        }

        const departmentSelect = document.getElementById('patientDepartment');

        if (departmentSelect) {
            departmentSelect.innerHTML = '<option value="">Select Department</option>';
            deptList.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.name;
                option.textContent = dept.name;
                departmentSelect.appendChild(option);
            });
        }

        this.departmentMultiSelect = new MultiSelectDropdown(
            'departmentFilterContainer',
            'All Departments',
            deptList.map(d => ({ value: d.name, label: d.name })),
            (selected) => {
                this.departmentFilters = selected;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            }
        );
    }

    setupEventListeners() {
        // Add patient button
        const addBtn = document.getElementById('addPatientBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openPatientModal());
        }

        // Search input
        const searchInput = document.getElementById('patientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            }, 300));
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        // Clear filters
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Patient form submission
        const form = document.getElementById('patientForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePatient();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openPatientModal();
            }
        });
    }

    applyFilters() {
        this.filteredPatients = this.patients.filter(patient => {
            const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
            const searchLower = this.searchTerm.toLowerCase();

            const searchMatch = this.searchTerm === '' ||
                fullName.includes(searchLower) ||
                (patient.mrn || '').toLowerCase().includes(searchLower) ||
                (patient.labNumber || '').toLowerCase().includes(searchLower) ||
                (patient.phone || '').includes(this.searchTerm);

            const deptMatch = this.departmentFilters.length === 0 || this.departmentFilters.includes(patient.department);
            const statusMatch = this.statusFilter === '' || patient.status === this.statusFilter;

            return searchMatch && deptMatch && statusMatch;
        });

        this.filteredPatients.sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        this.updateStats();
        this.updateCount();
    }

    clearFilters() {
        const searchInput = document.getElementById('patientSearch');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (this.departmentMultiSelect) this.departmentMultiSelect.clear();

        this.searchTerm = '';
        this.departmentFilters = [];
        this.statusFilter = '';
        this.currentPage = 1;
        this.applyFilters();
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('patientTableBody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pagePatients = this.filteredPatients.slice(start, end);

        if (pagePatients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-icon">👤</div>
                            <h3>No Patients Found</h3>
                            <p>${this.searchTerm ? 'Try adjusting your search criteria' : 'Start by registering a new patient'}</p>
                            ${!this.searchTerm ? '<button class="btn btn-primary btn-sm" onclick="patientManager.openPatientModal()">Register Patient</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        tbody.innerHTML = pagePatients.map((patient, index) => {
            const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
            const age = patient.birthDate ? Utils.getAge(patient.birthDate) : 'N/A';
            const sex = patient.sex || 'N/A';
            
            return `
                <tr>
                    <td>${start + index + 1}</td>
                    <td><strong>${patient.mrn || 'N/A'}</strong></td>
                    <td>${patient.labNumber || 'N/A'}</td>
                    <td>${Utils.truncate(fullName, 25)}</td>
                    <td>${age} / ${sex}</td>
                    <td>${patient.phone || 'N/A'}</td>
                    <td>${patient.department || 'N/A'}</td>
                    <td>
                        <span class="status-badge ${patient.status === 'Active' ? 'active' : 'inactive'}">
                            ${patient.status || 'Active'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" onclick="patientManager.viewPatient('${patient.id}')" title="View">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            <button class="action-btn edit-btn" onclick="patientManager.editPatient('${patient.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="action-btn delete-btn" onclick="patientManager.deletePatient('${patient.id}')" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const container = document.getElementById('patientPagination');
        const info = document.getElementById('patientPaginationInfo');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            if (info) info.textContent = `Showing ${this.filteredPatients.length} patients`;
            return;
        }

        const pages = Utils.generatePagination(this.currentPage, totalPages);
        
        container.innerHTML = `
            <button onclick="patientManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                ←
            </button>
            ${pages.map(page => `
                <button class="${page === this.currentPage ? 'active' : ''}" 
                        onclick="${page === '...' ? '' : `patientManager.goToPage(${page})`}"
                        ${page === '...' ? 'disabled' : ''}>
                    ${page}
                </button>
            `).join('')}
            <button onclick="patientManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                →
            </button>
        `;

        if (info) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.filteredPatients.length);
            info.textContent = `Showing ${start}-${end} of ${this.filteredPatients.length} patients`;
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderTable();
    }

    updateStats() {
        const total = document.getElementById('totalPatientsCount');
        const active = document.getElementById('activePatientsCount');
        const today = document.getElementById('todayPatientsCount');
        const withSamples = document.getElementById('patientsWithSamples');

        if (total) total.textContent = this.patients.length;
        
        if (active) {
            const activeCount = this.patients.filter(p => p.status === 'Active').length;
            active.textContent = activeCount;
        }

        if (today) {
            const todayDate = new Date().toISOString().split('T')[0];
            const todayCount = this.patients.filter(p => p.createdAt?.startsWith(todayDate)).length;
            today.textContent = todayCount;
        }

        if (withSamples) {
            const samples = storage.getAllScoped('samples') || [];
            const patientIds = new Set(samples.map(s => s.patientId));
            withSamples.textContent = patientIds.size;
        }
    }

    updateCount() {
        const countEl = document.getElementById('patientCount');
        if (countEl) {
            const total = this.filteredPatients.length;
            countEl.textContent = `Showing ${total} patient${total !== 1 ? 's' : ''}`;
        }
    }

    openPatientModal(patient = null) {
        const modal = document.getElementById('patientModal');
        const title = document.getElementById('patientModalTitle');
        const form = document.getElementById('patientForm');
        
        if (!modal) return;

        form.reset();
        this.clearErrors();
        this.editingId = null;

        document.getElementById('patientMRN').value = Utils.generateMRN();
        document.getElementById('patientLabNumber').value = Utils.generateLabNumber();

        if (patient) {
            title.textContent = 'Edit Patient';
            document.getElementById('savePatientBtn').innerHTML = '<span class="btn-text">Update Patient</span><span class="btn-loader" style="display: none;"><span class="spinner"></span></span>';
            this.editingId = patient.id;
            this.fillForm(patient);
        } else {
            title.textContent = 'Register New Patient';
            document.getElementById('savePatientBtn').innerHTML = '<span class="btn-text">Save Patient</span><span class="btn-loader" style="display: none;"><span class="spinner"></span></span>';
        }

        modal.style.display = 'flex';
        document.getElementById('patientFirstName').focus();
    }

    fillForm(patient) {
        document.getElementById('patientFirstName').value = patient.firstName || '';
        document.getElementById('patientLastName').value = patient.lastName || '';
        document.getElementById('patientBirthDate').value = patient.birthDate || '';
        document.getElementById('patientSex').value = patient.sex || '';
        document.getElementById('patientPhone').value = patient.phone || '';
        document.getElementById('patientEmail').value = patient.email || '';
        document.getElementById('patientAddress').value = patient.address || '';
        document.getElementById('patientDepartment').value = patient.department || '';
        document.getElementById('patientClinician').value = patient.clinician || '';
        document.getElementById('patientVisitType').value = patient.visitType || '';
        document.getElementById('patientStatus').value = patient.status || 'Active';
        document.getElementById('patientNotes').value = patient.notes || '';
        document.getElementById('patientMRN').value = patient.mrn || '';
        document.getElementById('patientLabNumber').value = patient.labNumber || '';
    }

    savePatient() {
        const submitBtn = document.getElementById('savePatientBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        const data = {
            firstName: document.getElementById('patientFirstName').value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            birthDate: document.getElementById('patientBirthDate').value,
            sex: document.getElementById('patientSex').value,
            phone: document.getElementById('patientPhone').value.trim(),
            email: document.getElementById('patientEmail').value.trim(),
            address: document.getElementById('patientAddress').value.trim(),
            department: document.getElementById('patientDepartment').value,
            clinician: document.getElementById('patientClinician').value.trim(),
            visitType: document.getElementById('patientVisitType').value,
            status: document.getElementById('patientStatus').value || 'Active',
            notes: document.getElementById('patientNotes').value.trim(),
            mrn: document.getElementById('patientMRN').value,
            labNumber: document.getElementById('patientLabNumber').value
        };

        const errors = this.validatePatient(data);
        if (Object.keys(errors).length > 0) {
            this.showFieldErrors(errors);
            return;
        }

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';

        try {
            if (this.editingId) {
                storage.update('patients', this.editingId, data);
                showToast('Patient updated successfully!', 'success');
            } else {
                storage.create('patients', data);
                showToast('Patient registered successfully!', 'success');
            }

            this.loadPatients();
            this.renderTable();
            this.updateStats();
            this.closePatientModal();

        } catch (error) {
            showToast('Error saving patient: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    validatePatient(data) {
        const errors = {};

        if (!data.firstName) {
            errors.firstName = 'First name is required';
        } else if (data.firstName.length < 2) {
            errors.firstName = 'First name must be at least 2 characters';
        }

        if (!data.lastName) {
            errors.lastName = 'Last name is required';
        } else if (data.lastName.length < 2) {
            errors.lastName = 'Last name must be at least 2 characters';
        }

        if (!data.birthDate) {
            errors.birthDate = 'Date of birth is required';
        } else {
            const age = Utils.getAge(data.birthDate);
            if (age < 0 || age > 120) {
                errors.birthDate = 'Please enter a valid date of birth';
            }
        }

        if (!data.sex) {
            errors.sex = 'Sex is required';
        }

        if (!data.phone) {
            errors.phone = 'Phone number is required';
        } else if (!Validator.isPhone(data.phone)) {
            errors.phone = 'Please enter a valid Ethiopian phone number (e.g., +251-900-000-000)';
        }

        if (data.email && !Validator.isEmail(data.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!data.department) {
            errors.department = 'Department is required';
        }

        if (!data.visitType) {
            errors.visitType = 'Visit type is required';
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
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('.form-group input, .form-group select').forEach(el => {
            el.classList.remove('error');
        });
    }

    closePatientModal() {
        const modal = document.getElementById('patientModal');
        if (modal) modal.style.display = 'none';
        this.clearErrors();
    }

    editPatient(id) {
        const patient = storage.getById('patients', id);
        if (patient) {
            this.openPatientModal(patient);
        }
    }

    viewPatient(id) {
        const patient = storage.getById('patients', id);
        if (!patient) {
            showToast('Patient not found', 'error');
            return;
        }

        const modal = document.getElementById('patientViewModal');
        const content = document.getElementById('patientViewContent');
        
        if (!modal || !content) return;

        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
        const age = patient.birthDate ? Utils.getAge(patient.birthDate) : 'N/A';
        
        const samples = storage.getAllScoped('samples') || [];
        const patientSamples = samples.filter(s => s.patientId === patient.id);

        content.innerHTML = `
            <div class="patient-view-grid">
                <div class="patient-view-section">
                    <h4>Personal Information</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Full Name</span>
                        <span class="patient-view-value">${fullName}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">MRN</span>
                        <span class="patient-view-value"><strong>${patient.mrn || 'N/A'}</strong></span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Lab Number</span>
                        <span class="patient-view-value">${patient.labNumber || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Age</span>
                        <span class="patient-view-value">${age} years</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Sex</span>
                        <span class="patient-view-value">${patient.sex || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Status</span>
                        <span class="patient-view-value">
                            <span class="status-badge ${patient.status === 'Active' ? 'active' : 'inactive'}">
                                ${patient.status || 'Active'}
                            </span>
                        </span>
                    </div>
                </div>

                <div class="patient-view-section">
                    <h4>Contact & Medical</h4>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Phone</span>
                        <span class="patient-view-value">${patient.phone || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Email</span>
                        <span class="patient-view-value">${patient.email || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Address</span>
                        <span class="patient-view-value">${patient.address || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Department</span>
                        <span class="patient-view-value">${patient.department || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Clinician</span>
                        <span class="patient-view-value">${patient.clinician || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Visit Type</span>
                        <span class="patient-view-value">${patient.visitType || 'N/A'}</span>
                    </div>
                    <div class="patient-view-item">
                        <span class="patient-view-label">Samples</span>
                        <span class="patient-view-value">${patientSamples.length}</span>
                    </div>
                </div>
            </div>

            ${patient.notes ? `
                <div class="patient-view-section" style="margin-top: 1rem;">
                    <h4>Notes</h4>
                    <p style="margin: 0; color: var(--gray-700); font-size: var(--text-sm);">${patient.notes}</p>
                </div>
            ` : ''}

            <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closePatientView()">Close</button>
                <button class="btn btn-primary" onclick="patientManager.editPatient('${patient.id}'); closePatientView();">
                    Edit Patient
                </button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    closePatientView() {
        const modal = document.getElementById('patientViewModal');
        if (modal) modal.style.display = 'none';
    }

    deletePatient(id) {
        const patient = storage.getById('patients', id);
        if (!patient) {
            showToast('Patient not found', 'error');
            return;
        }

        const samples = storage.getAllScoped('samples') || [];
        const hasSamples = samples.some(s => s.patientId === id);
        
        if (hasSamples) {
            showToast('Cannot delete patient with existing samples. Archive instead.', 'warning');
            return;
        }

        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
        
        const confirmModal = document.getElementById('confirmModal');
        const confirmMsg = document.getElementById('confirmMessage');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmBtn = document.getElementById('confirmBtn');

        if (confirmModal) {
            confirmTitle.textContent = 'Delete Patient';
            confirmMsg.textContent = `Are you sure you want to delete ${fullName}? This action cannot be undone.`;
            confirmModal.style.display = 'flex';

            confirmBtn.onclick = () => {
                try {
                    storage.delete('patients', id);
                    showToast('Patient deleted successfully', 'success');
                    this.loadPatients();
                    this.renderTable();
                    this.updateStats();
                    closeConfirm();
                } catch (error) {
                    showToast('Error deleting patient: ' + error.message, 'error');
                }
            };
        }
    }
}

// Make patient manager globally available
let patientManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    patientManager = new PatientManager();
});

// Global functions
function closePatientModal() {
    if (patientManager) patientManager.closePatientModal();
}

function closePatientView() {
    if (patientManager) patientManager.closePatientView();
}