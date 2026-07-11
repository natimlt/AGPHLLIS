/**
 * ======================================================
 * AGPHL LIS - Reports Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class ReportManager {
    constructor() {
        this.reportTypes = [
            { id: 'patient', name: 'Patient Report', icon: '👤', description: 'Generate patient lists and demographics' },
            { id: 'sample', name: 'Sample Report', icon: '🧪', description: 'Sample tracking and status reports' },
            { id: 'result', name: 'Result Report', icon: '📊', description: 'Test results and interpretations' },
            { id: 'quality', name: 'Quality Report', icon: '📈', description: 'IQC, EQA, and quality metrics' },
            { id: 'inventory', name: 'Inventory Report', icon: '📦', description: 'Stock levels and usage reports' },
            { id: 'equipment', name: 'Equipment Report', icon: '🔬', description: 'Equipment status and maintenance' }
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDepartments();
        this.renderReportTypes();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'reports') {
                const type = document.getElementById('reportTypeSelect')?.value || 'patient';
                this.generateReport(type);
            }
        });
    }

    renderReportTypes() {
        const container = document.getElementById('reportTypesContainer');
        if (!container) return;

        container.innerHTML = this.reportTypes.map(type => `
            <div class="report-type-card" onclick="reportManager.generateReport('${type.id}')">
                <div class="report-icon">${type.icon}</div>
                <h4>${type.name}</h4>
                <p>${type.description}</p>
            </div>
        `).join('');
    }

    loadDepartments() {
        const departments = storage.getAll('departments') || [];
        const select = document.getElementById('reportDepartment');
        if (!select) return;

        let deptList = departments;
        if (deptList.length === 0) {
            deptList = DefaultData.departments.map(name => ({ name, id: Utils.generateId('departments') }));
        }

        select.innerHTML = '<option value="">All Departments</option>';
        deptList.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.name;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        const dateFrom = document.getElementById('reportDateFrom');
        const dateTo = document.getElementById('reportDateTo');
        const department = document.getElementById('reportDepartment');
        const status = document.getElementById('reportStatus');

        if (dateFrom) dateFrom.addEventListener('change', () => this.updateReportPreview());
        if (dateTo) dateTo.addEventListener('change', () => this.updateReportPreview());
        if (department) department.addEventListener('change', () => this.updateReportPreview());
        if (status) status.addEventListener('change', () => this.updateReportPreview());

        const periodMode = document.getElementById('reportPeriodMode');
        const periodAnchor = document.getElementById('reportPeriodAnchor');
        if (periodAnchor) periodAnchor.value = new Date().toISOString().split('T')[0];
        this.applyPeriodMode();
        if (periodMode) periodMode.addEventListener('change', () => this.applyPeriodMode());
        if (periodAnchor) periodAnchor.addEventListener('change', () => this.applyPeriodMode());

        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const type = document.getElementById('reportTypeSelect')?.value;
                if (type) {
                    this.generateReport(type);
                } else {
                    showToast('Please select a report type', 'warning');
                }
            });
        }

        const printBtn = document.getElementById('printReportBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printReport();
            });
        }

        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReport();
            });
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                this.exportReportExcel();
            });
        }

        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                this.exportReportPDF();
            });
        }
    }

    generateReport(type) {
        const preview = document.getElementById('reportPreview');
        if (!preview) return;

        preview.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div class="spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto;"></div>
                <p style="margin-top: 1rem; color: var(--gray-500);">Generating report...</p>
            </div>
        `;

        setTimeout(() => {
            const reportHTML = this.generateReportHTML(type);
            preview.innerHTML = reportHTML;
            this.setReportType(type);
        }, 800);
    }

    generateReportHTML(type) {
        const hospitalName = this.getHospitalName();
        const logo = this.getHospitalLogo();
        const issueDate = new Date().toISOString().split('T')[0];
        const documentNumber = `RPT-${type.toUpperCase()}-${Utils.generateId(6)}`;
        const version = '1.0';

        let content = this.getReportContent(type);

        return `
            <div class="report-header">
                <div class="report-header-content">
                    ${logo ? `<img src="${logo}" alt="Hospital Logo" class="report-logo">` : ''}
                    <div class="report-header-text">
                        <h2>${document.querySelector('.sidebar-brand')?.textContent || 'AGPHL LIS'}</h2>
                        <p class="hospital-name">${hospitalName}</p>
                        <p class="report-subtitle">Laboratory Information System - ${this.getReportTitle(type)}</p>
                    </div>
                </div>
                <div class="report-meta">
                    <span class="report-meta-item"><strong>Report Type:</strong> ${this.getReportTitle(type)}</span>
                    <span class="report-meta-item"><strong>Reporting Period:</strong> ${this.getPeriodLabel()}</span>
                    <span class="report-meta-item"><strong>Document No:</strong> ${documentNumber}</span>
                    <span class="report-meta-item"><strong>Version:</strong> ${version}</span>
                    <span class="report-meta-item"><strong>Issue Date:</strong> ${issueDate}</span>
                    <span class="report-meta-item"><strong>Generated By:</strong> ${auth.getCurrentUser()?.fullName || 'System'}</span>
                </div>
            </div>
            <div class="report-body">
                ${content}
            </div>
            <div class="report-footer">
                <div class="footer-divider"></div>
                <p><em>This is a controlled document for internal use only.</em></p>
                <p style="font-style: normal; font-size: var(--text-xs); margin-top: 0.5rem;">
                    © ${new Date().getFullYear()} ${hospitalName}. All Rights Reserved.
                </p>
                <p style="font-style: normal; font-size: var(--text-xs); color: var(--gray-400);">
                    AGPHL LIS v1.0 | Developed by Asrat Genet | Medical Laboratory Science Professional & Laboratory Quality Officer
                </p>
            </div>
        `;
    }

    getHospitalName() {
        const settings = storage.getById('settings', 'system');
        return settings?.hospitalName || 'Agew Gimjabet Primary Hospital';
    }

    getHospitalLogo() {
        return localStorage.getItem('hospitalLogo') || null;
    }

    getReportTitle(type) {
        const titles = {
            patient: 'Patient Report',
            sample: 'Sample Report',
            result: 'Result Report',
            quality: 'Quality Report',
            inventory: 'Inventory Report',
            equipment: 'Equipment Report'
        };
        return titles[type] || 'Report';
    }

    getReportContent(type) {
        const dateFrom = document.getElementById('reportDateFrom')?.value;
        const dateTo = document.getElementById('reportDateTo')?.value;
        const department = document.getElementById('reportDepartment')?.value;
        const status = document.getElementById('reportStatus')?.value;

        switch(type) {
            case 'patient':
                return this.getPatientReportContent(dateFrom, dateTo, department, status);
            case 'sample':
                return this.getSampleReportContent(dateFrom, dateTo, department, status);
            case 'result':
                return this.getResultReportContent(dateFrom, dateTo, department, status);
            case 'quality':
                return this.getQualityReportContent();
            case 'inventory':
                return this.getInventoryReportContent();
            case 'equipment':
                return this.getEquipmentReportContent();
            default:
                return '<p>No data available for this report type.</p>';
        }
    }

    getPatientReportContent(dateFrom, dateTo, department, status) {
        let patients = storage.getAllScoped('patients') || [];
        
        if (dateFrom) {
            patients = patients.filter(p => p.createdAt && p.createdAt >= dateFrom);
        }
        if (dateTo) {
            patients = patients.filter(p => p.createdAt && p.createdAt <= dateTo);
        }
        if (department) {
            patients = patients.filter(p => p.department === department);
        }
        if (status) {
            patients = patients.filter(p => p.status === status);
        }

        if (patients.length === 0) {
            return '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">No patients found matching the criteria.</p>';
        }

        return `
            <h3>Patient List</h3>
            <p>Total Patients: <strong>${patients.length}</strong></p>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>MRN</th>
                        <th>Name</th>
                        <th>Age/Sex</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Registered</th>
                    </tr>
                </thead>
                <tbody>
                    ${patients.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${p.mrn || 'N/A'}</td>
                            <td>${p.firstName || ''} ${p.lastName || ''}</td>
                            <td>${p.birthDate ? Utils.getAge(p.birthDate) : 'N/A'}/${p.sex || 'N/A'}</td>
                            <td>${p.phone || 'N/A'}</td>
                            <td>${p.department || 'N/A'}</td>
                            <td><span class="status-badge ${p.status === 'Active' ? 'active' : 'inactive'}">${p.status || 'Active'}</span></td>
                            <td>${p.createdAt ? Utils.formatDate(p.createdAt, 'MM/DD/YYYY') : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getSampleReportContent(dateFrom, dateTo, department, status) {
        let samples = storage.getAllScoped('samples') || [];
        
        if (dateFrom) {
            samples = samples.filter(s => s.collectionDate && s.collectionDate >= dateFrom);
        }
        if (dateTo) {
            samples = samples.filter(s => s.collectionDate && s.collectionDate <= dateTo);
        }
        if (department) {
            samples = samples.filter(s => s.department === department);
        }
        if (status) {
            samples = samples.filter(s => s.status === status);
        }

        if (samples.length === 0) {
            return '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">No samples found matching the criteria.</p>';
        }

        return `
            <h3>Sample Report</h3>
            <p>Total Samples: <strong>${samples.length}</strong></p>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Lab Number</th>
                        <th>Patient</th>
                        <th>Specimen</th>
                        <th>Priority</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Collected</th>
                    </tr>
                </thead>
                <tbody>
                    ${samples.map((s, i) => {
                        const patient = s.patientId ? storage.getById('patients', s.patientId) : null;
                        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${s.labNumber || 'N/A'}</strong></td>
                                <td>${patientName}</td>
                                <td>${s.specimenType || 'N/A'}</td>
                                <td><span class="priority-badge ${(s.priority || 'routine').toLowerCase()}">${s.priority || 'Routine'}</span></td>
                                <td>${s.department || 'N/A'}</td>
                                <td><span class="status-badge ${(s.status || 'registered').toLowerCase().replace(' ', '-')}">${s.status || 'Registered'}</span></td>
                                <td>${s.collectionDate ? Utils.formatDate(s.collectionDate, 'MM/DD/YYYY HH:mm') : 'N/A'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    getResultReportContent(dateFrom, dateTo, department, status) {
        let results = storage.getAllScoped('results') || [];
        
        if (dateFrom) {
            results = results.filter(r => r.enteredAt && r.enteredAt >= dateFrom);
        }
        if (dateTo) {
            results = results.filter(r => r.enteredAt && r.enteredAt <= dateTo);
        }
        if (department) {
            results = results.filter(r => r.department === department);
        }
        if (status) {
            results = results.filter(r => r.status === status);
        }

        if (results.length === 0) {
            return '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">No results found matching the criteria.</p>';
        }

        const critical = results.filter(r => r.isCritical).length;
        const abnormal = results.filter(r => r.hasAbnormal && !r.isCritical).length;

        return `
            <h3>Result Report</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${results.length}</span>
                    <span class="stat-mini-label">Total Results</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--danger);">${critical}</span>
                    <span class="stat-mini-label">Critical</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: #856404;">${abnormal}</span>
                    <span class="stat-mini-label">Abnormal</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--success);">${results.length - critical - abnormal}</span>
                    <span class="stat-mini-label">Normal</span>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Lab Number</th>
                        <th>Patient</th>
                        <th>Test</th>
                        <th>Result</th>
                        <th>Status</th>
                        <th>Flag</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((r, i) => {
                        const sample = r.sampleId ? storage.getById('samples', r.sampleId) : null;
                        const patient = sample?.patientId ? storage.getById('patients', sample.patientId) : null;
                        const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${r.labNumber || 'N/A'}</td>
                                <td>${patientName}</td>
                                <td>${r.testName || 'N/A'}</td>
                                <td><strong>${r.result || 'N/A'}</strong> ${r.unit || ''}</td>
                                <td><span class="result-status-badge ${(r.status || 'pending').toLowerCase()}">${r.status || 'Pending'}</span></td>
                                <td>${r.isCritical ? '<span class="flag-critical">CRITICAL</span>' : r.hasAbnormal ? '<span class="flag-high">Abnormal</span>' : '<span class="flag-normal">Normal</span>'}</td>
                                <td>${r.enteredAt ? Utils.formatDate(r.enteredAt, 'MM/DD/YYYY') : 'N/A'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    getQualityReportContent() {
        const iqcData = storage.getAll('iqc') || [];
        const eqaData = storage.getAll('eqa') || [];
        const sopData = storage.getAll('sop') || [];
        const auditData = storage.getAll('audit') || [];

        const inControl = iqcData.filter(i => i.inControl).length;
        const eqaPassed = eqaData.filter(e => e.status === 'Passed').length;
        const activeSOP = sopData.filter(s => s.status === 'Active').length;
        const completedAudits = auditData.filter(a => a.status === 'Completed').length;

        return `
            <h3>Quality Management Report</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; margin: 1rem 0;">
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: ${iqcData.length > 0 && (inControl/iqcData.length * 100) >= 80 ? 'var(--success)' : 'var(--danger)'}">
                        ${iqcData.length > 0 ? Math.round((inControl/iqcData.length) * 100) : 0}%
                    </span>
                    <span class="stat-mini-label">IQC Performance</span>
                    <span style="font-size: var(--text-xs); color: var(--gray-400);">${inControl}/${iqcData.length} in control</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: ${eqaData.length > 0 && (eqaPassed/eqaData.length * 100) >= 80 ? 'var(--success)' : 'var(--danger)'}">
                        ${eqaData.length > 0 ? Math.round((eqaPassed/eqaData.length) * 100) : 0}%
                    </span>
                    <span class="stat-mini-label">EQA Performance</span>
                    <span style="font-size: var(--text-xs); color: var(--gray-400);">${eqaPassed}/${eqaData.length} passed</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: ${sopData.length > 0 && (activeSOP/sopData.length * 100) >= 80 ? 'var(--success)' : 'var(--danger)'}">
                        ${sopData.length > 0 ? Math.round((activeSOP/sopData.length) * 100) : 0}%
                    </span>
                    <span class="stat-mini-label">SOP Compliance</span>
                    <span style="font-size: var(--text-xs); color: var(--gray-400);">${activeSOP}/${sopData.length} active</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: ${auditData.length > 0 && (completedAudits/auditData.length * 100) >= 80 ? 'var(--success)' : 'var(--danger)'}">
                        ${auditData.length > 0 ? Math.round((completedAudits/auditData.length) * 100) : 0}%
                    </span>
                    <span class="stat-mini-label">Audit Completion</span>
                    <span style="font-size: var(--text-xs); color: var(--gray-400);">${completedAudits}/${auditData.length} completed</span>
                </div>
            </div>

            <h4 style="margin-top: 1.5rem;">Recent IQC Data</h4>
            ${iqcData.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Value</th>
                            <th>Mean</th>
                            <th>SD</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${iqcData.slice(-5).reverse().map(i => `
                            <tr>
                                <td>${i.testName}</td>
                                <td>${i.value} ${i.unit || ''}</td>
                                <td>${i.mean || 'N/A'}</td>
                                <td>${i.sd || 'N/A'}</td>
                                <td><span class="status-badge ${i.inControl ? 'active' : 'inactive'}">${i.inControl ? 'In Control' : 'Out of Control'}</span></td>
                                <td>${i.date || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--gray-500);">No IQC data available</p>'}

            <h4 style="margin-top: 1.5rem;">Recent EQA Results</h4>
            ${eqaData.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Facility</th>
                            <th>Type</th>
                            <th>Result</th>
                            <th>Expected</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eqaData.slice(-5).reverse().map(e => `
                            <tr>
                                <td>${e.facilityName}</td>
                                <td>${e.eqaType}</td>
                                <td>${e.result}</td>
                                <td>${e.expectedResult}</td>
                                <td><span class="facility-status ${e.status.toLowerCase()}">${e.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--gray-500);">No EQA data available</p>'}
        `;
    }

    getInventoryReportContent() {
        const inventory = storage.getAll('inventory') || [];
        const totalItems = inventory.length;
        const lowStock = inventory.filter(i => i.status === 'Low').length;
        const critical = inventory.filter(i => i.status === 'Critical').length;
        const outOfStock = inventory.filter(i => i.status === 'Out of Stock').length;

        return `
            <h3>Inventory Report</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${totalItems}</span>
                    <span class="stat-mini-label">Total Items</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: #856404;">${lowStock}</span>
                    <span class="stat-mini-label">Low Stock</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--danger);">${critical}</span>
                    <span class="stat-mini-label">Critical</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--gray-500);">${outOfStock}</span>
                    <span class="stat-mini-label">Out of Stock</span>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Expiry</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${item.name}</td>
                            <td><span class="inventory-category ${(item.category || 'other').toLowerCase()}">${item.category || 'Other'}</span></td>
                            <td>${item.quantity || 0}</td>
                            <td>${item.unit || 'pcs'}</td>
                            <td>${item.location || 'N/A'}</td>
                            <td><span class="stock-status ${(item.status || 'available').toLowerCase()}">${item.status || 'Available'}</span></td>
                            <td>${item.expiryDate ? Utils.formatDate(item.expiryDate, 'MM/DD/YYYY') : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getEquipmentReportContent() {
        const equipment = storage.getAll('equipment') || [];
        const operational = equipment.filter(e => e.status === 'Operational').length;
        const needsMaintenance = equipment.filter(e => e.status === 'Maintenance Needed').length;
        const outOfService = equipment.filter(e => e.status === 'Out of Service').length;

        return `
            <h3>Equipment Report</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-mini">
                    <span class="stat-mini-value">${equipment.length}</span>
                    <span class="stat-mini-label">Total Equipment</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--success);">${operational}</span>
                    <span class="stat-mini-label">Operational</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: #856404;">${needsMaintenance}</span>
                    <span class="stat-mini-label">Needs Maintenance</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" style="color: var(--danger);">${outOfService}</span>
                    <span class="stat-mini-label">Out of Service</span>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Equipment Name</th>
                        <th>Serial Number</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Last Calibration</th>
                        <th>Next Calibration</th>
                    </tr>
                </thead>
                <tbody>
                    ${equipment.map((e, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${e.name}</td>
                            <td>${e.serialNumber || 'N/A'}</td>
                            <td>${e.department || 'N/A'}</td>
                            <td><span class="status-badge ${e.status === 'Operational' ? 'active' : e.status === 'Maintenance Needed' ? 'pending' : 'inactive'}">${e.status || 'Unknown'}</span></td>
                            <td>${e.lastCalibration ? Utils.formatDate(e.lastCalibration, 'MM/DD/YYYY') : 'N/A'}</td>
                            <td>${e.nextCalibration ? Utils.formatDate(e.nextCalibration, 'MM/DD/YYYY') : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    setReportType(type) {
        const select = document.getElementById('reportTypeSelect');
        if (select) {
            select.value = type;
        }
    }

    /** Human-readable label for the currently selected reporting period, shown in the report header. */
    getPeriodLabel() {
        const mode = document.getElementById('reportPeriodMode')?.value || 'custom';
        const from = document.getElementById('reportDateFrom')?.value;
        const to = document.getElementById('reportDateTo')?.value;
        const modeLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom Range' };
        const label = modeLabels[mode] || 'Custom Range';
        if (!from && !to) return label;
        return `${label} (${from || '...'} to ${to || '...'})`;
    }

    updateReportPreview() {
        const type = document.getElementById('reportTypeSelect')?.value;
        if (type) {
            this.generateReport(type);
        }
    }

    /**
     * Compute the From/To date range for the selected period mode
     * (Daily/Weekly/Monthly/Quarterly/Yearly), anchored on the chosen
     * reference date, and populate the date fields - applies to every
     * report type since they all read from reportDateFrom/reportDateTo.
     * "Custom Range" leaves the date fields as the person set them.
     */
    applyPeriodMode() {
        const mode = document.getElementById('reportPeriodMode')?.value || 'monthly';
        const dateFromEl = document.getElementById('reportDateFrom');
        const dateToEl = document.getElementById('reportDateTo');
        if (!dateFromEl || !dateToEl) return;
        if (mode === 'custom') {
            this.updateReportPreview();
            return;
        }

        const anchor = new Date(document.getElementById('reportPeriodAnchor')?.value || new Date());
        let from, to;

        switch (mode) {
            case 'daily':
                from = new Date(anchor);
                to = new Date(anchor);
                break;
            case 'weekly': {
                const day = anchor.getDay();
                const diffToMonday = day === 0 ? -6 : 1 - day;
                from = new Date(anchor);
                from.setDate(anchor.getDate() + diffToMonday);
                to = new Date(from);
                to.setDate(from.getDate() + 6);
                break;
            }
            case 'monthly':
                from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
                to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
                break;
            case 'quarterly': {
                const quarter = Math.floor(anchor.getMonth() / 3);
                from = new Date(anchor.getFullYear(), quarter * 3, 1);
                to = new Date(anchor.getFullYear(), quarter * 3 + 3, 0);
                break;
            }
            case 'yearly':
                from = new Date(anchor.getFullYear(), 0, 1);
                to = new Date(anchor.getFullYear(), 11, 31);
                break;
            default:
                from = anchor;
                to = anchor;
        }

        dateFromEl.value = from.toISOString().split('T')[0];
        dateToEl.value = to.toISOString().split('T')[0];
        this.updateReportPreview();
    }

    printReport() {
        const preview = document.getElementById('reportPreview');
        if (!preview) return;
        if (!preview.querySelector('.report-header')) {
            showToast('Please click "Generate" to build the report first', 'warning');
            return;
        }

        const content = preview.innerHTML;
        const html = this.wrapReportHTML(content, document.getElementById('reportTypeSelect')?.value || 'Report');

        // Print via a hidden iframe instead of window.open(). window.open()
        // is silently blocked by most browsers' popup blockers with no
        // visible error beyond a toast the person may miss, which made
        // printing look broken. An iframe needs no popup permission at all.
        let iframe = document.getElementById('reportPrintFrame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'reportPrintFrame';
            // A 0x0 iframe can render blank when printed in some browsers -
            // give it real dimensions but push it off-screen instead.
            iframe.style.position = 'absolute';
            iframe.style.top = '-10000px';
            iframe.style.left = '-10000px';
            iframe.style.width = '800px';
            iframe.style.height = '1000px';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        // Give the iframe a moment to lay out the content before printing.
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 300);
    }

    /**
     * Wrap report body content in a standalone, print-ready HTML document.
     * Shared by printReport() (print / Save as PDF) and any future export.
     */
    wrapReportHTML(content, type) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${this.getReportTitle(type)}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .table th, .table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                    .table th { background: #f5f5f5; }
                    .report-header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 20px; }
                    .report-footer { border-top: 2px solid #333; margin-top: 20px; padding-top: 20px; text-align: center; font-style: italic; }
                    .stat-mini { text-align: center; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                    .stat-mini-value { display: block; font-size: 24px; font-weight: 700; }
                    .stat-mini-label { font-size: 12px; color: #666; }
                    .status-badge, .priority-badge, .stock-status { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
                    .status-badge.active { background: #d4edda; color: #155724; }
                    .status-badge.inactive { background: #f8d7da; color: #721c24; }
                    .priority-badge.routine { background: #e9ecef; color: #495057; }
                    .priority-badge.urgent { background: #fff3cd; color: #856404; }
                    .priority-badge.stat { background: #f8d7da; color: #721c24; }
                    .flag-critical { background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
                    .flag-high { background: #ffc107; color: #856404; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
                    .flag-normal { background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
                    .facility-status.passed { background: #d4edda; color: #155724; }
                    .facility-status.failed { background: #f8d7da; color: #721c24; }
                    .facility-status.pending { background: #fff3cd; color: #856404; }
                    .inventory-category { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
                    .inventory-category.reagent { background: #cce5ff; color: #004085; }
                    .inventory-category.consumable { background: #d4edda; color: #155724; }
                    .inventory-category.other { background: #e9ecef; color: #495057; }
                    .result-status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
                    .result-status-badge.pending { background: #fff3cd; color: #856404; }
                    .result-status-badge.complete { background: #d4edda; color: #155724; }
                    .result-status-badge.verified { background: #cce5ff; color: #004085; }
                    @media print {
                        @page { margin: 1.5cm; }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>`;
    }

    /**
     * Export the currently rendered report as an Excel-compatible file.
     * Wraps the report's actual HTML (tables, headers, styling) in the
     * MIME type Excel recognizes, so formatting survives - unlike plain
     * CSV, which loses headers/sections/badges.
     */
    /**
     * Download the report as a real .pdf file using jsPDF (loaded via
     * CDN in dashboard.html). This produces an actual file the browser
     * saves to disk - no print dialog, no "Save as PDF" step required.
     * If jsPDF failed to load (most commonly: no internet connection),
     * falls back to the print-dialog approach automatically so the
     * person can still get a PDF via "Save as PDF" in that dialog.
     */
    exportReportPDF() {
        const preview = document.getElementById('reportPreview');
        const type = document.getElementById('reportTypeSelect')?.value;
        if (!preview || !type) {
            showToast('Please generate a report first', 'warning');
            return;
        }
        if (!preview.querySelector('.report-header')) {
            showToast('Please click "Generate" to build the report first', 'warning');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast('PDF library unavailable (likely no internet connection) - opening the print dialog instead. Choose "Save as PDF" there.', 'warning');
            this.printReport();
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const title = this.getReportTitle(type);
            const hospitalName = this.getHospitalName();

            doc.setFontSize(14);
            doc.text(hospitalName, 40, 40);
            doc.setFontSize(11);
            doc.text(title, 40, 58);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`Reporting Period: ${this.getPeriodLabel()}`, 40, 74);
            doc.text(`Generated: ${new Date().toLocaleString()} by ${auth.getCurrentUser()?.fullName || 'System'}`, 40, 88);
            doc.setTextColor(0);

            let startY = 105;
            const tables = preview.querySelectorAll('table');

            if (tables.length === 0) {
                doc.text('No tabular data in this report.', 40, startY);
            }

            tables.forEach((table) => {
                doc.autoTable({
                    html: table,
                    startY,
                    margin: { left: 40, right: 40 },
                    styles: { fontSize: 8, cellPadding: 4 },
                    headStyles: { fillColor: [26, 102, 245] },
                    didParseCell: (data) => {
                        // Strip inline SVG/badge markup down to plain text so
                        // the PDF shows readable values instead of raw tags.
                        if (data.cell.raw && data.cell.raw.querySelector) {
                            data.cell.text = [data.cell.raw.textContent.trim()];
                        }
                    }
                });
                startY = doc.lastAutoTable.finalY + 20;
            });

            doc.save(`${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('PDF downloaded', 'success');
        } catch (err) {
            showToast('PDF generation failed, opening print dialog instead: ' + err.message, 'warning');
            this.printReport();
        }
    }

    exportReportExcel() {
        const preview = document.getElementById('reportPreview');
        const type = document.getElementById('reportTypeSelect')?.value;
        if (!preview || !type) {
            showToast('Please generate a report first', 'warning');
            return;
        }
        if (!preview.querySelector('.report-header')) {
            showToast('Please click "Generate" to build the report first', 'warning');
            return;
        }

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
                <x:Name>${this.getReportTitle(type)}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                <style>
                    table { border-collapse: collapse; }
                    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    th { background: #f0f0f0; font-weight: bold; }
                </style>
            </head>
            <body>${preview.innerHTML}</body>
            </html>`;

        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Excel file downloaded', 'success');
    }

    exportReport() {
        const type = document.getElementById('reportTypeSelect')?.value;
        if (!type) {
            showToast('Please select a report type', 'warning');
            return;
        }

        let data = [];
        let headers = [];

        switch(type) {
            case 'patient':
                data = storage.getAllScoped('patients') || [];
                headers = ['MRN', 'Name', 'Age', 'Sex', 'Phone', 'Email', 'Department', 'Status', 'Registered'];
                break;
            case 'sample':
                data = storage.getAllScoped('samples') || [];
                headers = ['Lab Number', 'Patient', 'Specimen', 'Priority', 'Department', 'Status', 'Collected'];
                break;
            case 'result':
                data = storage.getAllScoped('results') || [];
                headers = ['Lab Number', 'Patient', 'Test', 'Result', 'Unit', 'Status', 'Flag', 'Date'];
                break;
            case 'inventory':
                data = storage.getAll('inventory') || [];
                headers = ['Item', 'Category', 'Quantity', 'Unit', 'Location', 'Status', 'Expiry'];
                break;
            case 'equipment':
                data = storage.getAll('equipment') || [];
                headers = ['Equipment', 'Serial Number', 'Department', 'Status', 'Install Date', 'Warranty Expiry'];
                break;
            case 'quality':
                data = storage.getAll('nonconformities') || [];
                headers = ['Title', 'Source', 'Department', 'Severity', 'Status', 'Date'];
                break;
            default:
                showToast('Export not supported for this report type', 'warning');
                return;
        }

        if (data.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        let csv = headers.join(',') + '\n';
        
        data.forEach(item => {
            const row = headers.map(h => {
                let value = '';
                switch(h) {
                    case 'MRN': value = item.mrn || 'N/A'; break;
                    case 'Name': value = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A'; break;
                    case 'Patient': 
                        const patient = item.patientId ? storage.getById('patients', item.patientId) : null;
                        value = patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : 'Unknown';
                        break;
                    case 'Age': value = item.birthDate ? Utils.getAge(item.birthDate) : 'N/A'; break;
                    case 'Sex': value = item.sex || 'N/A'; break;
                    case 'Phone': value = item.phone || 'N/A'; break;
                    case 'Email': value = item.email || 'N/A'; break;
                    case 'Department': value = item.department || 'N/A'; break;
                    case 'Status': value = item.status || 'N/A'; break;
                    case 'Registered': value = item.createdAt ? Utils.formatDate(item.createdAt, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Lab Number': value = item.labNumber || 'N/A'; break;
                    case 'Specimen': value = item.specimenType || 'N/A'; break;
                    case 'Priority': value = item.priority || 'N/A'; break;
                    case 'Collected': value = item.collectionDate ? Utils.formatDate(item.collectionDate, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Test': value = item.testName || 'N/A'; break;
                    case 'Result': value = item.result || 'N/A'; break;
                    case 'Unit': value = item.unit || ''; break;
                    case 'Flag': 
                        value = item.isCritical ? 'CRITICAL' : item.hasAbnormal ? 'Abnormal' : 'Normal';
                        break;
                    case 'Date': value = item.enteredAt ? Utils.formatDate(item.enteredAt, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Item': value = item.name || 'N/A'; break;
                    case 'Category': value = item.category || 'Other'; break;
                    case 'Quantity': value = item.quantity || 0; break;
                    case 'Location': value = item.location || 'N/A'; break;
                    case 'Expiry': value = item.expiryDate ? Utils.formatDate(item.expiryDate, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Equipment': value = item.name || 'N/A'; break;
                    case 'Serial Number': value = item.serialNumber || 'N/A'; break;
                    case 'Install Date': value = item.installDate ? Utils.formatDate(item.installDate, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Warranty Expiry': value = item.warrantyExpiry ? Utils.formatDate(item.warrantyExpiry, 'MM/DD/YYYY') : 'N/A'; break;
                    case 'Title': value = item.title || 'N/A'; break;
                    case 'Source': value = item.source || 'N/A'; break;
                    case 'Severity': value = item.severity || 'N/A'; break;
                    case 'Date': value = item.dateIdentified || item.enteredAt ? Utils.formatDate(item.dateIdentified || item.enteredAt, 'MM/DD/YYYY') : 'N/A'; break;
                    default: value = 'N/A';
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csv += row.join(',') + '\n';
        });

        const filename = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        Utils.downloadFile(csv, filename, 'text/csv');
        showToast('Report exported successfully', 'success');
    }
}

let reportManager;

document.addEventListener('DOMContentLoaded', function() {
    reportManager = new ReportManager();
});

function generateReport(type) {
    if (reportManager) reportManager.generateReport(type);
}