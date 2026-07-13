/**
 * ======================================================
 * AGPHL LIS - Customer Satisfaction Monitoring Module
 * Version: 2.0
 *
 * Implements the lab's own standardized survey instruments:
 *   - CL8_8-004: Customer survey tool for Patients/Clients
 *   - CL8_8-003: Customer survey tool for Health Care Providers
 * Both use a 5-point scale (5=Excellent down to 1=Very Poor).
 * Also tracks complaints, feeding ISO 15189:2022 clause 4.14
 * "customer feedback" and QI-12 (complaint rate).
 * ======================================================
 */

/**
 * Question definitions transcribed from the lab's actual paper survey
 * forms (CL8_8-003 and CL8_8-004), so the digital survey matches what
 * staff already collect on paper. Keys are stored under `ratings` on
 * each saved survey record; demographic keys under `demographics`.
 */
const SURVEY_DEFINITIONS = {
    'Patient/Client': {
        code: 'CL8_8-004',
        introTitle: 'Patient / Client Satisfaction Survey',
        demographics: [
            { key: 'age', label: 'Age (years)', type: 'number' },
            { key: 'sex', label: 'Sex', type: 'select', options: ['Female', 'Male'] },
            { key: 'occupation', label: 'Occupation', type: 'select', options: ['Government employee', 'Private employee', 'Farmer', 'Housewife', 'Other'] },
            { key: 'residence', label: 'Residence', type: 'select', options: ['Urban', 'Rural'] },
            { key: 'education', label: 'Education Level', type: 'select', options: ['Illiterate', 'Literate (no formal schooling)', 'Primary (1-8)', 'Secondary (9-12)', 'College and above'] }
        ],
        sections: [
            {
                title: "II. Laboratory Professionals' Ethics",
                questions: [
                    { key: 'politeness', label: 'Politeness in receiving and handling clients' },
                    { key: 'professionalEthics', label: 'Professional ethics (principles and client safety/privacy)' },
                    { key: 'cooperation', label: 'Cooperation in giving appropriate answers to questions raised' },
                    { key: 'staffAvailability', label: 'Laboratory staff presence/availability during working hours' }
                ]
            },
            {
                title: 'III. Laboratory Service',
                questions: [
                    { key: 'easeOfFindingLab', label: 'Ease of finding the laboratory service area' },
                    { key: 'availability247', label: 'Laboratory service open 7 days / 24 hours' },
                    { key: 'easeOfFindingReception', label: 'Ease of finding the sample reception room' },
                    { key: 'waitingAreaCleanliness', label: 'Cleanliness of the client waiting/resting area' },
                    { key: 'seatingComfort', label: 'Adequate and comfortable client seating' },
                    { key: 'tatDisplayed', label: 'Turnaround time clearly displayed/communicated to clients' },
                    { key: 'sampleCollectionInfo', label: 'Information given on sample collection (purpose, location, timing, amount)' },
                    { key: 'accessToOrderedTests', label: 'Access to laboratory tests ordered by the doctor' },
                    { key: 'easeOfFindingPayment', label: 'Ease of finding the payment location' },
                    { key: 'easeOfFindingToilet', label: 'Ease of finding the toilet' },
                    { key: 'toiletCleanliness', label: 'Toilet cleanliness' },
                    { key: 'resultsOnTime', label: 'Results arriving at the promised/stated time' },
                    { key: 'resultCollectionInfo', label: 'Information on where to collect results when ready' },
                    { key: 'confidentiality', label: 'Confidentiality and security of client information' },
                    { key: 'complaintResolution', label: 'Complaint resolution system' },
                    { key: 'alternativeReferral', label: 'Alternative referral options when a test is unavailable/interrupted' }
                ]
            }
        ],
        commentFields: [
            { key: 'generalComments', label: 'General comments' },
            { key: 'improvementAreas', label: 'Services that need improvement' },
            { key: 'additionalTestsWanted', label: 'Additional test types you would like to see offered' }
        ]
    },
    'Health Care Provider': {
        code: 'CL8_8-003',
        introTitle: 'Health Care Provider (Physician/Clinician) Satisfaction Survey',
        allowNotApplicable: true,
        demographics: [
            { key: 'profession', label: 'Profession', type: 'text' },
            { key: 'qualification', label: 'Qualification', type: 'select', options: ['Diploma', 'BSc', 'MSc', 'MD', 'Other'] },
            { key: 'age', label: 'Age (years)', type: 'number' },
            { key: 'sex', label: 'Sex', type: 'select', options: ['Male', 'Female'] },
            { key: 'yearsOfService', label: 'Years of Service', type: 'number' }
        ],
        sections: [
            {
                title: "II. Laboratory Professionals' Ethics",
                questions: [
                    { key: 'politeness', label: 'Politeness and friendliness of laboratory staff' },
                    { key: 'professionalism', label: 'Professionalism (safety and ethical code) of laboratory staff' },
                    { key: 'helpfulness', label: 'Helpfulness of laboratory staff when questions arise' },
                    { key: 'staffAvailability', label: 'Availability of laboratory staff in the working place' }
                ]
            },
            {
                title: 'III. Laboratory Service',
                questions: [
                    { key: 'handbookHelpfulness', label: 'Helpfulness of the laboratory handbook' },
                    { key: 'specimenCollection', label: 'Laboratory specimen collection services' },
                    { key: 'requestFormsEase', label: 'Ease of use of laboratory request forms' },
                    { key: 'testsForPractice', label: 'Laboratory provides tests needed for your practice of medicine' },
                    { key: 'testAvailability', label: 'Laboratory tests availability' },
                    { key: 'resultQuality', label: 'Quality and reliability of laboratory test results' },
                    { key: 'criticalValueNotification', label: 'Critical value notification' },
                    { key: 'reportClarity', label: 'Laboratory reports are clear and easy to read' },
                    { key: 'tatCompliance', label: 'Turnaround time (TAT) as per established TAT' },
                    { key: 'interruptionNotification', label: 'Immediate notification of service interruption and resumption' },
                    { key: 'referralServices', label: 'Referral laboratory services (GeneXpert, Viral Load, EID, CD4, etc.)' }
                ]
            },
            {
                title: 'IV. Hospital Laboratory Service (applicable only for hospital lab service)',
                questions: [
                    { key: 'labFunctionality', label: 'Functionality of laboratory service (central, emergency, inpatient)' },
                    { key: 'bloodBankService', label: 'Blood bank service' }
                ]
            }
        ],
        commentFields: [
            { key: 'improvementAreas', label: 'Laboratory service areas to be improved' },
            { key: 'newTestsWanted', label: 'New laboratory test services to be started' }
        ]
    }
};

class SatisfactionManager {
    constructor() {
        this.activeTab = 'surveys';
        this.editingSurveyId = null;
        this.editingComplaintId = null;
        this.complaintStatusFilter = '';
        this.currentSurveyType = 'Patient/Client';
        this.init();
    }

    init() {
        if (!document.getElementById('satisfactionPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'satisfaction') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_satisfaction');
        const canResolve = window.auth?.hasPermission('resolve_complaints');
        document.querySelectorAll('.satisfaction-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
        document.querySelectorAll('.satisfaction-resolve-only').forEach(el => {
            el.style.display = canResolve ? '' : 'none';
        });
    }

    setupEventListeners() {
        document.querySelectorAll('#satisfactionPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        document.getElementById('surveyAddPatientBtn')?.addEventListener('click', () => this.openSurveyModal('Patient/Client'));
        document.getElementById('surveyAddHcpBtn')?.addEventListener('click', () => this.openSurveyModal('Health Care Provider'));
        document.getElementById('surveyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSurvey();
        });
        document.getElementById('surveyTypeFilter')?.addEventListener('change', () => this.renderSurveys());

        document.getElementById('complaintAddBtn')?.addEventListener('click', () => this.openComplaintModal());
        document.getElementById('complaintForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveComplaint();
        });
        document.getElementById('complaintStatusFilter')?.addEventListener('change', (e) => {
            this.complaintStatusFilter = e.target.value;
            this.renderComplaints();
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#satisfactionPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#satisfactionPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `satisfaction-${tab}-panel`));
        this.render();
    }

    render() {
        this.renderSummary();
        if (this.activeTab === 'surveys') this.renderSurveys();
        else this.renderComplaints();
    }

    getSurveys() {
        return storage.getAll('satisfactionSurveys') || [];
    }

    getComplaints() {
        return storage.getAll('complaints') || [];
    }

    /** Average of every numeric rating on a survey record (0-5 scale). */
    surveyAverage(survey) {
        const values = Object.values(survey.ratings || {}).filter(v => typeof v === 'number' && v > 0);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    renderSummary() {
        const surveys = this.getSurveys();
        const complaints = this.getComplaints();
        const container = document.getElementById('satisfactionSummary');
        if (!container) return;

        const averages = surveys.map(s => this.surveyAverage(s)).filter(a => a > 0);
        const avgOverall = averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1) : '-';
        const patientSurveys = surveys.filter(s => s.respondentType === 'Patient/Client').length;
        const hcpSurveys = surveys.filter(s => s.respondentType === 'Health Care Provider').length;
        const openComplaints = complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length;
        const complaintRate = surveys.length ? (complaints.length / Math.max(surveys.length, 1) * 100).toFixed(1) : '0.0';

        const block = (value, label, sub, color) => `
            <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                <div style="font-size:var(--text-3xl); font-weight:700; color:${color};">${value}</div>
                <div style="font-size:var(--text-sm); color:var(--gray-600);">${label}</div>
                <div style="font-size:var(--text-xs); color:var(--gray-400);">${sub}</div>
            </div>`;

        container.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    ${block(avgOverall + ' / 5', 'Average Satisfaction', `${surveys.length} surveys collected`, avgOverall >= 4 ? 'var(--success)' : avgOverall >= 3 ? '#856404' : 'var(--danger)')}
                    ${block(patientSurveys, 'Patient/Client Surveys', 'CL8_8-004', 'var(--primary-500)')}
                    ${block(hcpSurveys, 'Health Care Provider Surveys', 'CL8_8-003', 'var(--info)')}
                    ${block(openComplaints, 'Open Complaints', `${complaints.length} total logged`, openComplaints > 0 ? 'var(--danger)' : 'var(--success)')}
                    ${block(complaintRate + '%', 'Complaint Rate', 'complaints per survey response', 'var(--gray-700)')}
                </div>
            </div>`;
    }

    // ==================== SURVEYS ====================
    renderSurveys() {
        const tbody = document.getElementById('surveyTableBody');
        if (!tbody) return;
        const typeFilter = document.getElementById('surveyTypeFilter')?.value || '';
        let surveys = [...this.getSurveys()];
        if (typeFilter) surveys = surveys.filter(s => s.respondentType === typeFilter);
        surveys = surveys.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);

        if (surveys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No satisfaction surveys recorded yet</td></tr>`;
            return;
        }

        tbody.innerHTML = surveys.map(s => {
            const avg = this.surveyAverage(s);
            return `
            <tr>
                <td>${Utils.formatDate(s.date, 'MM/DD/YYYY')}</td>
                <td><span class="badge badge-secondary">${Utils.escapeHtml(s.respondentType)}</span></td>
                <td>${Utils.escapeHtml(s.department || '-')}</td>
                <td><span class="rating-display">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span> ${avg.toFixed(1)}</td>
                <td>${Utils.escapeHtml(Utils.truncate(s.comments?.generalComments || s.comments?.improvementAreas || '-', 40))}</td>
                <td class="actions">
                    <button class="edit-btn" title="View" onclick="satisfactionManager.viewSurvey('${s.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="delete-btn satisfaction-manage-only" title="Delete" onclick="satisfactionManager.deleteSurvey('${s.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    starInputHTML(key, currentValue = 0) {
        return `
            <span class="star-input" data-rating-key="${key}" data-value="${currentValue}">
                ${[1, 2, 3, 4, 5].map(n => `<span class="star ${n <= currentValue ? 'filled' : ''}" data-star="${n}">★</span>`).join('')}
            </span>`;
    }

    /** Build the full dynamic form body (demographics + rating sections + comments) for a survey type. */
    buildSurveyFormHTML(type, existing = null) {
        const def = SURVEY_DEFINITIONS[type];
        const demo = existing?.demographics || {};
        const ratings = existing?.ratings || {};
        const comments = existing?.comments || {};

        let html = `<p style="color:var(--gray-500); font-size:var(--text-sm); margin:0 0 1rem;">
            Based on the lab's standardized instrument <strong>${def.code}</strong>. Scale: 5=Excellent, 4=Very Good, 3=Good, 2=Poor, 1=Very Poor.
        </p>`;

        html += `<h4 style="margin:1rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">I. Demographics</h4>`;
        html += `<div class="form-row" style="flex-wrap:wrap;">`;
        def.demographics.forEach(f => {
            html += `<div class="form-group" style="min-width:160px; flex:1;">
                <label for="demo_${f.key}">${Utils.escapeHtml(f.label)}</label>
                ${f.type === 'select'
                    ? `<select id="demo_${f.key}" data-demo-key="${f.key}">${f.options.map(o => `<option value="${Utils.escapeHtml(o)}" ${demo[f.key] === o ? 'selected' : ''}>${Utils.escapeHtml(o)}</option>`).join('')}</select>`
                    : `<input type="${f.type}" id="demo_${f.key}" data-demo-key="${f.key}" value="${Utils.escapeHtml(demo[f.key] || '')}">`}
            </div>`;
        });
        html += `</div>`;

        def.sections.forEach(section => {
            html += `<h4 style="margin:1.25rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">${Utils.escapeHtml(section.title)}</h4>`;
            section.questions.forEach(q => {
                const isNA = ratings[q.key] === 'N/A';
                html += `<div class="form-group" style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; border-bottom:1px solid var(--gray-100); padding-bottom:0.5rem;">
                    <label style="margin:0; flex:1; min-width:220px;">${Utils.escapeHtml(q.label)}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        ${this.starInputHTML(q.key, typeof ratings[q.key] === 'number' ? ratings[q.key] : 0)}
                        ${def.allowNotApplicable ? `
                        <label class="checkbox-label" style="margin:0;">
                            <input type="checkbox" class="na-toggle" data-na-for="${q.key}" ${isNA ? 'checked' : ''}>
                            <span class="checkmark"></span> N/A
                        </label>` : ''}
                    </div>
                </div>`;
            });
        });

        html += `<h4 style="margin:1.25rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">Additional Comments</h4>`;
        def.commentFields.forEach(f => {
            html += `<div class="form-group">
                <label for="comment_${f.key}">${Utils.escapeHtml(f.label)}</label>
                <textarea id="comment_${f.key}" data-comment-key="${f.key}" rows="2">${Utils.escapeHtml(comments[f.key] || '')}</textarea>
            </div>`;
        });

        return html;
    }

    wireDynamicSurveyInputs() {
        document.querySelectorAll('#surveyDynamicBody .star-input').forEach(group => {
            group.addEventListener('click', (e) => {
                if (!e.target.dataset.star) return;
                if (group.dataset.naDisabled === 'true') return;
                const value = parseInt(e.target.dataset.star);
                group.dataset.value = value;
                group.querySelectorAll('.star').forEach(star => {
                    star.classList.toggle('filled', parseInt(star.dataset.star) <= value);
                });
            });
        });
        document.querySelectorAll('#surveyDynamicBody .na-toggle').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.naFor;
                const group = document.querySelector(`#surveyDynamicBody .star-input[data-rating-key="${key}"]`);
                if (!group) return;
                group.dataset.naDisabled = e.target.checked ? 'true' : 'false';
                group.style.opacity = e.target.checked ? '0.35' : '1';
            });
        });
    }

    openSurveyModal(type, existing = null) {
        this.editingSurveyId = existing?.id || null;
        this.currentSurveyType = type;
        const def = SURVEY_DEFINITIONS[type];

        document.getElementById('surveyModalTitle').textContent = existing ? `Edit Survey - ${def.introTitle}` : def.introTitle;
        document.getElementById('surveyDate').value = existing?.date || new Date().toISOString().split('T')[0];
        document.getElementById('surveyDepartment').value = existing?.department || '';
        document.getElementById('surveyDynamicBody').innerHTML = this.buildSurveyFormHTML(type, existing);
        this.wireDynamicSurveyInputs();

        if (def.allowNotApplicable && existing) {
            document.querySelectorAll('#surveyDynamicBody .na-toggle:checked').forEach(cb => {
                cb.dispatchEvent(new Event('change'));
            });
        }

        document.querySelectorAll('#surveyDynamicBody input, #surveyDynamicBody select, #surveyDynamicBody textarea').forEach(el => el.disabled = false);
        document.querySelectorAll('#surveyDynamicBody .star-input').forEach(g => g.style.pointerEvents = '');

        document.getElementById('surveyModal').style.display = 'flex';
    }

    closeSurveyModal() {
        document.getElementById('surveyModal').style.display = 'none';
        this.editingSurveyId = null;
    }

    viewSurvey(id) {
        const survey = storage.getById('satisfactionSurveys', id);
        if (!survey) return;
        this.openSurveyModal(survey.respondentType, survey);
        if (!window.auth?.hasPermission('manage_satisfaction')) {
            document.querySelectorAll('#surveyDynamicBody input, #surveyDynamicBody select, #surveyDynamicBody textarea').forEach(el => el.disabled = true);
            document.querySelectorAll('#surveyDynamicBody .star-input').forEach(g => g.style.pointerEvents = 'none');
        }
    }

    saveSurvey() {
        const def = SURVEY_DEFINITIONS[this.currentSurveyType];
        const demographics = {};
        document.querySelectorAll('#surveyDynamicBody [data-demo-key]').forEach(el => {
            demographics[el.dataset.demoKey] = el.value;
        });

        const ratings = {};
        let answeredCount = 0;
        document.querySelectorAll('#surveyDynamicBody .star-input').forEach(g => {
            if (g.dataset.naDisabled === 'true') {
                ratings[g.dataset.ratingKey] = 'N/A';
            } else {
                const value = parseInt(g.dataset.value) || 0;
                ratings[g.dataset.ratingKey] = value;
                if (value > 0) answeredCount++;
            }
        });

        if (answeredCount === 0) {
            showToast('Please rate at least one question', 'error');
            return;
        }

        const comments = {};
        document.querySelectorAll('#surveyDynamicBody [data-comment-key]').forEach(el => {
            comments[el.dataset.commentKey] = el.value.trim();
        });

        const data = {
            date: document.getElementById('surveyDate').value || new Date().toISOString().split('T')[0],
            respondentType: this.currentSurveyType,
            surveyCode: def.code,
            department: document.getElementById('surveyDepartment').value,
            demographics,
            ratings,
            comments,
            recordedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown'
        };

        try {
            if (this.editingSurveyId) {
                storage.update('satisfactionSurveys', this.editingSurveyId, data);
                showToast('Survey updated', 'success');
            } else {
                storage.create('satisfactionSurveys', data);
                showToast('Survey recorded', 'success');
            }
            this.closeSurveyModal();
            this.render();
        } catch (err) {
            showToast('Failed to save survey: ' + err.message, 'error');
        }
    }

    deleteSurvey(id) {
        if (!confirm('Delete this survey record?')) return;
        storage.delete('satisfactionSurveys', id);
        showToast('Survey deleted', 'success');
        this.render();
    }

    // ==================== COMPLAINTS ====================
    renderComplaints() {
        const tbody = document.getElementById('complaintTableBody');
        if (!tbody) return;
        let complaints = [...this.getComplaints()];
        if (this.complaintStatusFilter) complaints = complaints.filter(c => c.status === this.complaintStatusFilter);
        complaints.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (complaints.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No complaints match the selected filter</td></tr>`;
            return;
        }

        const statusBadge = { 'Open': 'badge-danger', 'In Progress': 'badge-warning', 'Resolved': 'badge-success', 'Closed': 'badge-secondary' };
        const canResolve = window.auth?.hasPermission('resolve_complaints');

        tbody.innerHTML = complaints.map(c => `
            <tr>
                <td>${Utils.formatDate(c.date, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(c.source)}</td>
                <td>${Utils.escapeHtml(c.category)}</td>
                <td>${Utils.escapeHtml(c.department || '-')}</td>
                <td><span class="badge ${c.severity === 'High' ? 'badge-danger' : c.severity === 'Medium' ? 'badge-warning' : 'badge-secondary'}">${Utils.escapeHtml(c.severity)}</span></td>
                <td><span class="badge ${statusBadge[c.status] || 'badge-secondary'}">${Utils.escapeHtml(c.status)}</span></td>
                <td class="actions">
                    <button class="edit-btn" title="View / Update" onclick="satisfactionManager.openComplaintModal('${c.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    ${canResolve ? `<button class="delete-btn" title="Delete" onclick="satisfactionManager.deleteComplaint('${c.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>` : ''}
                </td>
            </tr>`).join('');
    }

    openComplaintModal(id = null) {
        this.editingComplaintId = id;
        const form = document.getElementById('complaintForm');
        form.reset();
        const canResolve = window.auth?.hasPermission('resolve_complaints');

        if (id) {
            const c = storage.getById('complaints', id);
            if (!c) return;
            document.getElementById('complaintModalTitle').textContent = 'Update Complaint';
            document.getElementById('complaintDate').value = c.date;
            document.getElementById('complaintSource').value = c.source;
            document.getElementById('complaintCategory').value = c.category;
            document.getElementById('complaintDepartment').value = c.department || '';
            document.getElementById('complaintSeverity').value = c.severity;
            document.getElementById('complaintDescription').value = c.description;
            document.getElementById('complaintStatus').value = c.status;
            document.getElementById('complaintResolution').value = c.resolutionNotes || '';
        } else {
            document.getElementById('complaintModalTitle').textContent = 'Log Complaint';
            document.getElementById('complaintDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('complaintStatus').value = 'Open';
        }

        document.getElementById('complaintStatus').disabled = !canResolve && !!id;
        document.getElementById('complaintResolution').disabled = !canResolve;
        document.getElementById('complaintModal').style.display = 'flex';
    }

    closeComplaintModal() {
        document.getElementById('complaintModal').style.display = 'none';
        this.editingComplaintId = null;
    }

    saveComplaint() {
        const data = {
            date: document.getElementById('complaintDate').value,
            source: document.getElementById('complaintSource').value,
            category: document.getElementById('complaintCategory').value,
            department: document.getElementById('complaintDepartment').value,
            severity: document.getElementById('complaintSeverity').value,
            description: document.getElementById('complaintDescription').value.trim(),
            status: document.getElementById('complaintStatus').value,
            resolutionNotes: document.getElementById('complaintResolution').value.trim()
        };

        if (!data.description) {
            showToast('Please describe the complaint', 'error');
            return;
        }

        if (data.status === 'Resolved' && !data.resolutionNotes) {
            showToast('Please add resolution notes before marking as Resolved', 'error');
            return;
        }

        try {
            if (this.editingComplaintId) {
                if (data.status === 'Resolved') data.resolvedDate = new Date().toISOString();
                storage.update('complaints', this.editingComplaintId, data);
                showToast('Complaint updated', 'success');
            } else {
                data.recordedBy = window.auth?.getCurrentUser()?.fullName || 'Unknown';
                storage.create('complaints', data);
                showToast('Complaint logged', 'success');
            }
            this.closeComplaintModal();
            this.render();
        } catch (err) {
            showToast('Failed to save complaint: ' + err.message, 'error');
        }
    }

    deleteComplaint(id) {
        if (!confirm('Delete this complaint record? This cannot be undone.')) return;
        storage.delete('complaints', id);
        showToast('Complaint deleted', 'success');
        this.render();
    }
}

let satisfactionManager;
document.addEventListener('DOMContentLoaded', function () {
    satisfactionManager = new SatisfactionManager();
    window.satisfactionManager = satisfactionManager;
});
