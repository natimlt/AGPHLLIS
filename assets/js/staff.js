/**
 * ======================================================
 * AGPHL LIS - Staff Management & Duty Roster Module
 * Version: 2.0
 *
 * Supports ISO 15189:2022 clause 6.2 (Personnel):
 * staff directory & profiles, training schedule,
 * competency assessment, performance review, leave
 * management, and a duty roster with shift swapping,
 * conflict prevention, and print support.
 * ======================================================
 */

class StaffManager {
    constructor() {
        this.activeTab = 'directory';
        this.editingStaffId = null;
        this.editingTrainingId = null;
        this.editingCompetencyId = null;
        this.editingReviewId = null;
        this.editingLeaveId = null;
        this.rosterView = 'weekly';
        this.rosterWeekStart = this.getMonday(new Date());
        this.rosterDay = new Date().toISOString().split('T')[0];
        this.rosterMonth = new Date().toISOString().slice(0, 7);
        this.viewingStaffId = null;
        this.init();
    }

    init() {
        if (!document.getElementById('staffPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'staff') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_staff');
        document.querySelectorAll('.staff-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
    }

    setupEventListeners() {
        document.querySelectorAll('#staffPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('staffAddBtn')?.addEventListener('click', () => this.openStaffModal());
        document.getElementById('staffForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStaff();
        });
        document.getElementById('staffDeptFilter')?.addEventListener('change', () => this.renderDirectory());
        document.getElementById('staffSearchInput')?.addEventListener('input', Utils.debounce(() => this.renderDirectory(), 250));

        document.getElementById('trainingAddBtn')?.addEventListener('click', () => this.openTrainingModal());
        document.getElementById('trainingForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTraining();
        });
        document.getElementById('attendanceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAttendance();
        });

        document.getElementById('competencyAddBtn')?.addEventListener('click', () => this.openCompetencyModal());
        document.getElementById('competencyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCompetency();
        });

        document.getElementById('reviewAddBtn')?.addEventListener('click', () => this.openReviewModal());
        document.getElementById('reviewForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReview();
        });

        document.getElementById('leaveAddBtn')?.addEventListener('click', () => this.openLeaveModal());
        document.getElementById('leaveForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLeave();
        });
        document.getElementById('leaveStatusFilter')?.addEventListener('change', () => this.renderLeave());

        document.querySelectorAll('.roster-view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchRosterView(btn.dataset.view));
        });
        document.getElementById('rosterPrevBtn')?.addEventListener('click', () => this.rosterStep(-1));
        document.getElementById('rosterNextBtn')?.addEventListener('click', () => this.rosterStep(1));
        document.getElementById('rosterPrintBtn')?.addEventListener('click', () => window.print());
        document.getElementById('rosterSwapBtn')?.addEventListener('click', () => this.openSwapModal());
        document.getElementById('rosterCellForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRosterCell();
        });
        document.getElementById('swapRequestForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSwapRequest();
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#staffPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#staffPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `staff-${tab}-panel`));
        this.render();
    }

    render() {
        if (this.activeTab === 'directory') this.renderDirectory();
        else if (this.activeTab === 'training') this.renderTraining();
        else if (this.activeTab === 'competency') this.renderCompetency();
        else if (this.activeTab === 'performance') this.renderPerformance();
        else if (this.activeTab === 'leave') this.renderLeave();
        else this.renderRoster();
    }

    getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    // ==================== STAFF DIRECTORY ====================
    getStaff() {
        return storage.getAll('staffMembers') || [];
    }

    renderDirectory() {
        this.populateStaffDeptFilter();
        const tbody = document.getElementById('staffDirectoryBody');
        if (!tbody) return;

        let staff = this.getStaff();
        const dept = document.getElementById('staffDeptFilter')?.value;
        const term = document.getElementById('staffSearchInput')?.value.toLowerCase() || '';
        if (dept) staff = staff.filter(s => s.department === dept);
        if (term) staff = staff.filter(s => s.fullName.toLowerCase().includes(term) || (s.staffCode || '').toLowerCase().includes(term));
        staff = staff.sort((a, b) => a.fullName.localeCompare(b.fullName));

        const now = new Date();
        const soon = new Date(now.getTime() + 60 * 86400000);

        const container = document.getElementById('staffDirectoryStats');
        if (container) {
            const expiring = this.getStaff().filter(s => s.licenseExpiry && new Date(s.licenseExpiry) <= soon && new Date(s.licenseExpiry) >= now).length;
            const expired = this.getStaff().filter(s => s.licenseExpiry && new Date(s.licenseExpiry) < now).length;
            container.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--primary-500);">${this.getStaff().length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Staff</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${this.getStaff().filter(s => s.employmentStatus === 'Active').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Active</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${expiring}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Licenses Expiring (60d)</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${expired}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Licenses Expired</div></div>
                    </div>
                </div>`;
        }

        if (staff.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No staff members found</td></tr>`;
            return;
        }

        const statusBadge = { 'Active': 'badge-success', 'On Leave': 'badge-warning', 'Inactive': 'badge-secondary', 'Terminated': 'badge-danger' };
        tbody.innerHTML = staff.map(s => {
            let licenseFlag = '';
            if (s.licenseExpiry) {
                const exp = new Date(s.licenseExpiry);
                if (exp < now) licenseFlag = '<span class="badge badge-danger" title="License expired">Expired</span>';
                else if (exp <= soon) licenseFlag = '<span class="badge badge-warning" title="License expiring soon">Expiring</span>';
            }
            return `
            <tr>
                <td><a href="#" onclick="staffManager.openProfileModal('${s.id}'); return false;"><strong>${Utils.escapeHtml(s.fullName)}</strong></a><br><span style="font-size:var(--text-xs); color:var(--gray-400);">${Utils.escapeHtml(s.staffCode || '')}</span></td>
                <td>${Utils.escapeHtml(s.department || '-')}</td>
                <td>${Utils.escapeHtml(s.position || '-')}</td>
                <td>${s.licenseExpiry ? Utils.formatDate(s.licenseExpiry, 'MM/DD/YYYY') : '-'} ${licenseFlag}</td>
                <td><span class="badge ${statusBadge[s.employmentStatus] || 'badge-secondary'}">${Utils.escapeHtml(s.employmentStatus || 'Active')}</span></td>
                <td>${Utils.escapeHtml(s.phone || '-')}</td>
                <td class="actions">
                    <button class="edit-btn" title="View Profile" onclick="staffManager.openProfileModal('${s.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>
                    </button>
                    <button class="edit-btn staff-manage-only" title="Edit" onclick="staffManager.openStaffModal('${s.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn staff-manage-only" title="Remove" onclick="staffManager.deleteStaff('${s.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    populateStaffDeptFilter() {
        const select = document.getElementById('staffDeptFilter');
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

    openStaffModal(id = null) {
        this.editingStaffId = id;
        const form = document.getElementById('staffForm');
        form.reset();
        if (id) {
            const s = storage.getById('staffMembers', id);
            if (!s) return;
            document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
            document.getElementById('staffFullName').value = s.fullName;
            document.getElementById('staffCode').value = s.staffCode || '';
            document.getElementById('staffDepartment').value = s.department || '';
            document.getElementById('staffPosition').value = s.position || '';
            document.getElementById('staffQualification').value = s.qualification || '';
            document.getElementById('staffLicenseNumber').value = s.licenseNumber || '';
            document.getElementById('staffLicenseExpiry').value = s.licenseExpiry || '';
            document.getElementById('staffEmploymentStatus').value = s.employmentStatus || 'Active';
            document.getElementById('staffPhone').value = s.phone || '';
            document.getElementById('staffEmail').value = s.email || '';
            document.getElementById('staffAddress').value = s.address || '';
            document.getElementById('staffHireDate').value = s.hireDate || '';
        } else {
            document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
            document.getElementById('staffEmploymentStatus').value = 'Active';
        }
        document.getElementById('staffModal').style.display = 'flex';
    }

    closeStaffModal() {
        document.getElementById('staffModal').style.display = 'none';
        this.editingStaffId = null;
    }

    saveStaff() {
        const data = {
            fullName: document.getElementById('staffFullName').value.trim(),
            staffCode: document.getElementById('staffCode').value.trim(),
            department: document.getElementById('staffDepartment').value,
            position: document.getElementById('staffPosition').value.trim(),
            qualification: document.getElementById('staffQualification').value.trim(),
            licenseNumber: document.getElementById('staffLicenseNumber').value.trim(),
            licenseExpiry: document.getElementById('staffLicenseExpiry').value,
            employmentStatus: document.getElementById('staffEmploymentStatus').value,
            phone: document.getElementById('staffPhone').value.trim(),
            email: document.getElementById('staffEmail').value.trim(),
            address: document.getElementById('staffAddress').value.trim(),
            hireDate: document.getElementById('staffHireDate').value
        };

        if (!data.fullName) {
            showToast('Full name is required', 'error');
            return;
        }

        try {
            if (this.editingStaffId) {
                storage.update('staffMembers', this.editingStaffId, data);
                showToast('Staff record updated', 'success');
            } else {
                storage.create('staffMembers', data);
                showToast('Staff member added', 'success');
            }
            this.closeStaffModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteStaff(id) {
        if (!confirm('Remove this staff member from the directory? Their historical training/competency/leave records are kept.')) return;
        storage.delete('staffMembers', id);
        showToast('Staff member removed', 'success');
        this.render();
    }

    openProfileModal(id) {
        const s = storage.getById('staffMembers', id);
        if (!s) return;
        this.viewingStaffId = id;

        const competency = (storage.getAll('competencyRecords') || []).filter(c => c.staffName === s.fullName);
        const reviews = (storage.getAll('performanceReviews') || []).filter(r => r.staffId === id);
        const leave = (storage.getAll('leaveRequests') || []).filter(l => l.staffId === id);
        const attendance = (storage.getAll('trainingAttendance') || []).filter(a => a.staffName === s.fullName);

        document.getElementById('profileModalTitle').textContent = s.fullName;
        document.getElementById('profileModalBody').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:0.75rem; margin-bottom:1.25rem;">
                <div><strong>Staff ID:</strong> ${Utils.escapeHtml(s.staffCode || '-')}</div>
                <div><strong>Department:</strong> ${Utils.escapeHtml(s.department || '-')}</div>
                <div><strong>Position:</strong> ${Utils.escapeHtml(s.position || '-')}</div>
                <div><strong>Qualification:</strong> ${Utils.escapeHtml(s.qualification || '-')}</div>
                <div><strong>License #:</strong> ${Utils.escapeHtml(s.licenseNumber || '-')}</div>
                <div><strong>License Expiry:</strong> ${s.licenseExpiry ? Utils.formatDate(s.licenseExpiry, 'MM/DD/YYYY') : '-'}</div>
                <div><strong>Status:</strong> ${Utils.escapeHtml(s.employmentStatus || '-')}</div>
                <div><strong>Hire Date:</strong> ${s.hireDate ? Utils.formatDate(s.hireDate, 'MM/DD/YYYY') : '-'}</div>
                <div><strong>Phone:</strong> ${Utils.escapeHtml(s.phone || '-')}</div>
                <div><strong>Email:</strong> ${Utils.escapeHtml(s.email || '-')}</div>
                <div style="grid-column:1/-1;"><strong>Address:</strong> ${Utils.escapeHtml(s.address || '-')}</div>
            </div>

            <h4 style="margin:1rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">Competency Records (${competency.length})</h4>
            ${competency.length ? `<ul style="margin:0; padding-left:1.2rem; font-size:var(--text-sm);">${competency.map(c => `<li>${Utils.escapeHtml(c.competencyArea)} - <span class="badge ${c.result === 'Competent' ? 'badge-success' : c.result === 'Not Competent' ? 'badge-danger' : 'badge-warning'}">${Utils.escapeHtml(c.result)}</span> (${Utils.formatDate(c.assessmentDate, 'MM/DD/YYYY')})</li>`).join('')}</ul>` : '<p style="color:var(--gray-400); font-size:var(--text-sm);">No records</p>'}

            <h4 style="margin:1rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">Performance Reviews (${reviews.length})</h4>
            ${reviews.length ? `<ul style="margin:0; padding-left:1.2rem; font-size:var(--text-sm);">${reviews.map(r => `<li>${Utils.formatDate(r.reviewDate, 'MM/DD/YYYY')} - Rating: <strong>${Utils.escapeHtml(String(r.rating))}/5</strong> (by ${Utils.escapeHtml(r.reviewer || '-')})</li>`).join('')}</ul>` : '<p style="color:var(--gray-400); font-size:var(--text-sm);">No reviews yet</p>'}

            <h4 style="margin:1rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">Leave History (${leave.length})</h4>
            ${leave.length ? `<ul style="margin:0; padding-left:1.2rem; font-size:var(--text-sm);">${leave.map(l => `<li>${Utils.escapeHtml(l.leaveType)}: ${Utils.formatDate(l.startDate, 'MM/DD/YYYY')} - ${Utils.formatDate(l.endDate, 'MM/DD/YYYY')} <span class="badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">${Utils.escapeHtml(l.status)}</span></li>`).join('')}</ul>` : '<p style="color:var(--gray-400); font-size:var(--text-sm);">No leave records</p>'}

            <h4 style="margin:1rem 0 0.5rem; font-size:var(--text-sm); color:var(--gray-700);">Training Attendance (${attendance.length})</h4>
            ${attendance.length ? `<ul style="margin:0; padding-left:1.2rem; font-size:var(--text-sm);">${attendance.map(a => `<li>${a.attended ? '✓ Attended' : '✗ Absent'}${a.score != null ? ' - Score: ' + a.score : ''}</li>`).join('')}</ul>` : '<p style="color:var(--gray-400); font-size:var(--text-sm);">No training attendance recorded</p>'}
        `;
        document.getElementById('profileModal').style.display = 'flex';
    }

    closeProfileModal() {
        document.getElementById('profileModal').style.display = 'none';
    }

    // ==================== TRAINING ====================
    renderTraining() {
        const tbody = document.getElementById('trainingTableBody');
        if (!tbody) return;
        const trainings = [...(storage.getAll('staffTrainings') || [])].sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
        const staffCount = Math.max(this.getStaff().length, 1);

        const upcoming = trainings.filter(t => t.status === 'Scheduled' && new Date(t.scheduledDate) >= new Date()).length;
        const overdue = trainings.filter(t => t.status === 'Scheduled' && new Date(t.scheduledDate) < new Date()).length;
        const completed = trainings.filter(t => t.status === 'Completed').length;
        const completionRate = trainings.length ? Math.round((completed / trainings.length) * 100) : 0;

        const container = document.getElementById('trainingStats');
        if (container) {
            container.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--primary-500);">${upcoming}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Upcoming Sessions</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${overdue}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Overdue</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${completionRate}%</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Completion Rate</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${trainings.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Sessions</div></div>
                    </div>
                </div>`;
        }

        if (trainings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No training sessions scheduled yet</td></tr>`;
            return;
        }

        const statusBadge = { 'Scheduled': 'badge-info', 'Completed': 'badge-success', 'Cancelled': 'badge-secondary' };
        tbody.innerHTML = trainings.map(t => {
            const attendance = (storage.getAll('trainingAttendance') || []).filter(a => a.trainingId === t.id);
            return `
            <tr>
                <td><strong>${Utils.escapeHtml(t.title)}</strong></td>
                <td><span class="badge badge-secondary">${Utils.escapeHtml(t.type)}</span></td>
                <td>${Utils.formatDate(t.scheduledDate, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(t.trainer || '-')}</td>
                <td>${Utils.escapeHtml(t.department || 'All')}</td>
                <td>${attendance.length}/${staffCount} recorded / <span class="badge ${statusBadge[t.status]}">${t.status}</span></td>
                <td class="actions staff-manage-only">
                    <button class="edit-btn" title="Attendance" onclick="staffManager.openAttendanceModal('${t.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </button>
                    <button class="edit-btn" title="Edit" onclick="staffManager.openTrainingModal('${t.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="staffManager.deleteTraining('${t.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    openTrainingModal(id = null) {
        this.editingTrainingId = id;
        const form = document.getElementById('trainingForm');
        form.reset();
        if (id) {
            const t = storage.getById('staffTrainings', id);
            if (!t) return;
            document.getElementById('trainingModalTitle').textContent = 'Edit Training Session';
            document.getElementById('trainingTitle').value = t.title;
            document.getElementById('trainingType').value = t.type;
            document.getElementById('trainingDate').value = t.scheduledDate;
            document.getElementById('trainingTrainer').value = t.trainer || '';
            document.getElementById('trainingVenue').value = t.venue || '';
            document.getElementById('trainingDepartment').value = t.department || '';
            document.getElementById('trainingStatus').value = t.status;
            document.getElementById('trainingDescription').value = t.description || '';
        } else {
            document.getElementById('trainingModalTitle').textContent = 'Schedule Training Session';
            document.getElementById('trainingStatus').value = 'Scheduled';
        }
        document.getElementById('trainingModal').style.display = 'flex';
    }

    closeTrainingModal() {
        document.getElementById('trainingModal').style.display = 'none';
        this.editingTrainingId = null;
    }

    saveTraining() {
        const data = {
            title: document.getElementById('trainingTitle').value.trim(),
            type: document.getElementById('trainingType').value,
            scheduledDate: document.getElementById('trainingDate').value,
            trainer: document.getElementById('trainingTrainer').value.trim(),
            venue: document.getElementById('trainingVenue').value.trim(),
            department: document.getElementById('trainingDepartment').value,
            status: document.getElementById('trainingStatus').value,
            description: document.getElementById('trainingDescription').value.trim()
        };

        if (!data.title || !data.scheduledDate) {
            showToast('Title and date are required', 'error');
            return;
        }

        try {
            if (this.editingTrainingId) {
                storage.update('staffTrainings', this.editingTrainingId, data);
                showToast('Training session updated', 'success');
            } else {
                storage.create('staffTrainings', data);
                showToast('Training session scheduled', 'success');
            }
            this.closeTrainingModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteTraining(id) {
        if (!confirm('Delete this training session? Attendance records will remain but be unlinked.')) return;
        storage.delete('staffTrainings', id);
        showToast('Training session deleted', 'success');
        this.render();
    }

    openAttendanceModal(trainingId) {
        const training = storage.getById('staffTrainings', trainingId);
        if (!training) return;
        document.getElementById('attendanceTrainingId').value = trainingId;
        document.getElementById('attendanceModalTitle').textContent = `Attendance: ${training.title}`;

        const staff = this.getStaff();
        const attendance = (storage.getAll('trainingAttendance') || []).filter(a => a.trainingId === trainingId);
        const container = document.getElementById('attendanceList');

        if (staff.length === 0) {
            container.innerHTML = `<p style="color:var(--gray-400);">No staff in directory yet. Add staff members first.</p>`;
        } else {
            container.innerHTML = staff.map(s => {
                const existing = attendance.find(a => a.staffName === s.fullName);
                return `
                <div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0; border-bottom:1px solid var(--gray-100);">
                    <label class="checkbox-label" style="flex:1;">
                        <input type="checkbox" name="attend" value="${Utils.escapeHtml(s.fullName)}" ${existing?.attended ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        ${Utils.escapeHtml(s.fullName)}
                    </label>
                    <input type="number" name="score-${Utils.escapeHtml(s.fullName)}" placeholder="Score" min="0" max="100" value="${existing?.score ?? ''}" style="width:80px; padding:0.35rem;">
                </div>`;
            }).join('');
        }

        document.getElementById('attendanceModal').style.display = 'flex';
    }

    closeAttendanceModal() {
        document.getElementById('attendanceModal').style.display = 'none';
    }

    saveAttendance() {
        const trainingId = document.getElementById('attendanceTrainingId').value;
        const container = document.getElementById('attendanceList');
        const checkboxes = container.querySelectorAll('input[name="attend"]');
        const existing = (storage.getAll('trainingAttendance') || []).filter(a => a.trainingId === trainingId);

        checkboxes.forEach(cb => {
            const staffName = cb.value;
            const attended = cb.checked;
            const scoreInput = container.querySelector(`input[name="score-${CSS.escape(staffName)}"]`);
            const score = scoreInput?.value ? parseFloat(scoreInput.value) : null;
            const record = existing.find(a => a.staffName === staffName);

            if (record) {
                storage.update('trainingAttendance', record.id, { attended, score });
            } else {
                storage.create('trainingAttendance', { trainingId, staffName, attended, score, certificateIssued: false });
            }
        });

        showToast('Attendance saved', 'success');
        this.closeAttendanceModal();
        this.render();
    }

    // ==================== COMPETENCY ====================
    renderCompetency() {
        const tbody = document.getElementById('competencyTableBody');
        if (!tbody) return;
        const records = [...(storage.getAll('competencyRecords') || [])].sort((a, b) => new Date(a.nextDueDate || '9999') - new Date(b.nextDueDate || '9999'));

        const now = new Date();
        const overdue = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) < now).length;
        const dueSoon = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) >= now && new Date(r.nextDueDate) < new Date(now.getTime() + 30 * 86400000)).length;

        const container = document.getElementById('competencyStats');
        if (container) {
            container.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${overdue}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Overdue Reassessment</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${dueSoon}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Due Within 30 Days</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${records.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Records</div></div>
                    </div>
                </div>`;
        }

        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No competency assessments recorded yet</td></tr>`;
            return;
        }

        const resultBadge = { 'Competent': 'badge-success', 'Needs Improvement': 'badge-warning', 'Not Competent': 'badge-danger' };
        tbody.innerHTML = records.map(r => {
            const isOverdue = r.nextDueDate && new Date(r.nextDueDate) < now;
            return `
            <tr>
                <td>${Utils.escapeHtml(r.staffName)}</td>
                <td>${Utils.escapeHtml(r.competencyArea)}</td>
                <td>${Utils.formatDate(r.assessmentDate, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(r.assessedBy || '-')}</td>
                <td><span class="badge ${resultBadge[r.result] || 'badge-secondary'}">${Utils.escapeHtml(r.result)}</span></td>
                <td>${r.nextDueDate ? `<span class="${isOverdue ? 'badge badge-danger' : ''}">${Utils.formatDate(r.nextDueDate, 'MM/DD/YYYY')}</span>` : '-'}</td>
                <td class="actions staff-manage-only">
                    <button class="edit-btn" title="Edit" onclick="staffManager.openCompetencyModal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="staffManager.deleteCompetency('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    populateStaffNameOptions(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Select staff...</option>' +
            this.getStaff().map(s => `<option value="${Utils.escapeHtml(s.fullName)}">${Utils.escapeHtml(s.fullName)}</option>`).join('');
    }

    openCompetencyModal(id = null) {
        this.editingCompetencyId = id;
        const form = document.getElementById('competencyForm');
        form.reset();
        this.populateStaffNameOptions('competencyStaffName');
        if (id) {
            const r = storage.getById('competencyRecords', id);
            if (!r) return;
            document.getElementById('competencyModalTitle').textContent = 'Edit Competency Record';
            document.getElementById('competencyStaffName').value = r.staffName;
            document.getElementById('competencyArea').value = r.competencyArea;
            document.getElementById('competencyDate').value = r.assessmentDate;
            document.getElementById('competencyAssessedBy').value = r.assessedBy || '';
            document.getElementById('competencyResult').value = r.result;
            document.getElementById('competencyNextDue').value = r.nextDueDate || '';
            document.getElementById('competencyNotes').value = r.notes || '';
        } else {
            document.getElementById('competencyModalTitle').textContent = 'Record Competency Assessment';
            document.getElementById('competencyDate').value = new Date().toISOString().split('T')[0];
        }
        document.getElementById('competencyModal').style.display = 'flex';
    }

    closeCompetencyModal() {
        document.getElementById('competencyModal').style.display = 'none';
        this.editingCompetencyId = null;
    }

    saveCompetency() {
        const data = {
            staffName: document.getElementById('competencyStaffName').value,
            competencyArea: document.getElementById('competencyArea').value.trim(),
            assessmentDate: document.getElementById('competencyDate').value,
            assessedBy: document.getElementById('competencyAssessedBy').value.trim(),
            result: document.getElementById('competencyResult').value,
            nextDueDate: document.getElementById('competencyNextDue').value,
            notes: document.getElementById('competencyNotes').value.trim()
        };

        if (!data.staffName || !data.competencyArea || !data.assessmentDate) {
            showToast('Staff name, competency area, and assessment date are required', 'error');
            return;
        }

        try {
            if (this.editingCompetencyId) {
                storage.update('competencyRecords', this.editingCompetencyId, data);
                showToast('Competency record updated', 'success');
            } else {
                storage.create('competencyRecords', data);
                showToast('Competency record saved', 'success');
            }
            this.closeCompetencyModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteCompetency(id) {
        if (!confirm('Delete this competency record?')) return;
        storage.delete('competencyRecords', id);
        showToast('Competency record deleted', 'success');
        this.render();
    }

    // ==================== PERFORMANCE REVIEW ====================
    renderPerformance() {
        const tbody = document.getElementById('reviewTableBody');
        if (!tbody) return;
        const reviews = [...(storage.getAll('performanceReviews') || [])].sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate));

        if (reviews.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No performance reviews recorded yet</td></tr>`;
            return;
        }

        tbody.innerHTML = reviews.map(r => {
            const staff = storage.getById('staffMembers', r.staffId);
            return `
            <tr>
                <td>${Utils.escapeHtml(staff?.fullName || r.staffName || 'Unknown')}</td>
                <td>${Utils.formatDate(r.reviewDate, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(r.reviewPeriod || '-')}</td>
                <td><span class="rating-display">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span></td>
                <td>${Utils.escapeHtml(r.reviewer || '-')}</td>
                <td class="actions staff-manage-only">
                    <button class="edit-btn" title="Edit" onclick="staffManager.openReviewModal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="staffManager.deleteReview('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    openReviewModal(id = null) {
        this.editingReviewId = id;
        const form = document.getElementById('reviewForm');
        form.reset();
        this.populateStaffSelect('reviewStaffId');
        if (id) {
            const r = storage.getById('performanceReviews', id);
            if (!r) return;
            document.getElementById('reviewModalTitle').textContent = 'Edit Performance Review';
            document.getElementById('reviewStaffId').value = r.staffId;
            document.getElementById('reviewDate').value = r.reviewDate;
            document.getElementById('reviewPeriod').value = r.reviewPeriod || '';
            document.getElementById('reviewer').value = r.reviewer || '';
            document.getElementById('reviewRating').value = r.rating || 3;
            document.getElementById('reviewStrengths').value = r.strengths || '';
            document.getElementById('reviewImprovement').value = r.areasForImprovement || '';
            document.getElementById('reviewGoals').value = r.goals || '';
        } else {
            document.getElementById('reviewModalTitle').textContent = 'Add Performance Review';
            document.getElementById('reviewDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('reviewRating').value = 3;
        }
        document.getElementById('reviewModal').style.display = 'flex';
    }

    closeReviewModal() {
        document.getElementById('reviewModal').style.display = 'none';
        this.editingReviewId = null;
    }

    populateStaffSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Select staff...</option>' +
            this.getStaff().map(s => `<option value="${s.id}">${Utils.escapeHtml(s.fullName)}</option>`).join('');
    }

    saveReview() {
        const staffId = document.getElementById('reviewStaffId').value;
        const staff = storage.getById('staffMembers', staffId);
        if (!staffId || !staff) {
            showToast('Please select a staff member', 'error');
            return;
        }

        const data = {
            staffId,
            staffName: staff.fullName,
            reviewDate: document.getElementById('reviewDate').value,
            reviewPeriod: document.getElementById('reviewPeriod').value.trim(),
            reviewer: document.getElementById('reviewer').value.trim(),
            rating: parseInt(document.getElementById('reviewRating').value) || 3,
            strengths: document.getElementById('reviewStrengths').value.trim(),
            areasForImprovement: document.getElementById('reviewImprovement').value.trim(),
            goals: document.getElementById('reviewGoals').value.trim()
        };

        try {
            if (this.editingReviewId) {
                storage.update('performanceReviews', this.editingReviewId, data);
                showToast('Performance review updated', 'success');
            } else {
                storage.create('performanceReviews', data);
                showToast('Performance review saved', 'success');
            }
            this.closeReviewModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteReview(id) {
        if (!confirm('Delete this performance review?')) return;
        storage.delete('performanceReviews', id);
        showToast('Review deleted', 'success');
        this.render();
    }

    // ==================== LEAVE MANAGEMENT ====================
    renderLeave() {
        const tbody = document.getElementById('leaveTableBody');
        if (!tbody) return;
        let leave = [...(storage.getAll('leaveRequests') || [])];
        const statusFilter = document.getElementById('leaveStatusFilter')?.value;
        if (statusFilter) leave = leave.filter(l => l.status === statusFilter);
        leave.sort((a, b) => new Date(b.requestedDate || b.startDate) - new Date(a.requestedDate || a.startDate));

        const allLeave = storage.getAll('leaveRequests') || [];
        const pending = allLeave.filter(l => l.status === 'Pending').length;
        const container = document.getElementById('leaveStats');
        if (container) {
            container.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${pending}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Pending Approval</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${allLeave.filter(l => l.status === 'Approved').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Approved</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${allLeave.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Requests</div></div>
                    </div>
                </div>`;
        }

        if (leave.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No leave requests found</td></tr>`;
            return;
        }

        const statusBadge = { 'Pending': 'badge-warning', 'Approved': 'badge-success', 'Rejected': 'badge-danger' };
        const canApprove = window.auth?.hasPermission('approve_leave');
        const canManage = window.auth?.hasPermission('manage_staff');
        tbody.innerHTML = leave.map(l => `
            <tr>
                <td>${Utils.escapeHtml(l.staffName)}</td>
                <td>${Utils.escapeHtml(l.leaveType)}</td>
                <td>${Utils.formatDate(l.startDate, 'MM/DD/YYYY')} - ${Utils.formatDate(l.endDate, 'MM/DD/YYYY')}</td>
                <td>${l.days || '-'}</td>
                <td><span class="badge ${statusBadge[l.status]}">${Utils.escapeHtml(l.status)}</span></td>
                <td class="actions">
                    ${canApprove && l.status === 'Pending' ? `
                    <button class="edit-btn" title="Approve" onclick="staffManager.setLeaveStatus('${l.id}','Approved')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                    </button>
                    <button class="delete-btn" title="Reject" onclick="staffManager.setLeaveStatus('${l.id}','Rejected')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>` : ''}
                    <button class="delete-btn staff-manage-only" title="Delete" onclick="staffManager.deleteLeave('${l.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openLeaveModal() {
        this.editingLeaveId = null;
        const form = document.getElementById('leaveForm');
        form.reset();
        this.populateStaffSelect('leaveStaffId');
        document.getElementById('leaveModal').style.display = 'flex';
    }

    closeLeaveModal() {
        document.getElementById('leaveModal').style.display = 'none';
    }

    saveLeave() {
        const staffId = document.getElementById('leaveStaffId').value;
        const staff = storage.getById('staffMembers', staffId);
        if (!staffId || !staff) {
            showToast('Please select a staff member', 'error');
            return;
        }

        const startDate = document.getElementById('leaveStartDate').value;
        const endDate = document.getElementById('leaveEndDate').value;
        if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
            showToast('Please provide a valid date range', 'error');
            return;
        }
        const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;

        const data = {
            staffId,
            staffName: staff.fullName,
            leaveType: document.getElementById('leaveType').value,
            startDate,
            endDate,
            days,
            reason: document.getElementById('leaveReason').value.trim(),
            status: 'Pending',
            requestedDate: new Date().toISOString()
        };

        try {
            storage.create('leaveRequests', data);
            showToast('Leave request submitted', 'success');
            this.closeLeaveModal();
            this.render();
        } catch (err) {
            showToast('Failed to submit: ' + err.message, 'error');
        }
    }

    setLeaveStatus(id, status) {
        if (!window.auth?.hasPermission('approve_leave')) {
            showToast('Only a Quality Officer or the Laboratory Head can approve or reject leave requests', 'error');
            return;
        }
        const leave = storage.getById('leaveRequests', id);
        if (!leave) return;

        storage.update('leaveRequests', id, { status, approvedBy: window.auth?.getCurrentUser()?.fullName || 'Unknown' });

        if (status === 'Approved') {
            let existingShiftOverwritten = false;
            const current = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const rosterEntries = storage.getAll('staffRoster') || [];
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                const existing = rosterEntries.find(e => e.staffName === leave.staffName && e.date === dateStr);
                if (existing && existing.shift !== 'Off' && existing.shift !== 'Leave') existingShiftOverwritten = true;
                if (existing) {
                    storage.update('staffRoster', existing.id, { shift: 'Leave', leaveType: leave.leaveType });
                } else {
                    storage.create('staffRoster', { staffName: leave.staffName, date: dateStr, shift: 'Leave', leaveType: leave.leaveType });
                }
                current.setDate(current.getDate() + 1);
            }
            if (existingShiftOverwritten) {
                showToast('Leave approved - note: this overwrote an existing roster shift for the same dates', 'warning');
            } else {
                showToast('Leave approved and applied to the roster', 'success');
            }
        } else {
            showToast('Leave request rejected', 'success');
        }
        this.render();
    }

    deleteLeave(id) {
        if (!confirm('Delete this leave request?')) return;
        storage.delete('leaveRequests', id);
        showToast('Leave request deleted', 'success');
        this.render();
    }

    // ==================== DUTY ROSTER ====================
    switchRosterView(view) {
        this.rosterView = view;
        document.querySelectorAll('.roster-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        document.querySelectorAll('.roster-view-panel').forEach(p => p.style.display = p.dataset.view === view ? '' : 'none');
        this.renderRoster();
    }

    rosterStep(direction) {
        if (this.rosterView === 'weekly') {
            this.rosterWeekStart.setDate(this.rosterWeekStart.getDate() + 7 * direction);
        } else if (this.rosterView === 'daily') {
            const d = new Date(this.rosterDay);
            d.setDate(d.getDate() + direction);
            this.rosterDay = d.toISOString().split('T')[0];
        } else {
            const [y, m] = this.rosterMonth.split('-').map(Number);
            const d = new Date(y, m - 1 + direction, 1);
            this.rosterMonth = d.toISOString().slice(0, 7);
        }
        this.renderRoster();
    }

    getRosterStaffNames() {
        const names = this.getStaff().map(s => s.fullName);
        if (names.length) return names;
        const raw = window.storage?.storage.getItem('agphl_rosterStaff');
        try {
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    getRosterEntries() {
        return storage.getAll('staffRoster') || [];
    }

    renderRoster() {
        if (this.rosterView === 'weekly') this.renderWeeklyRoster();
        else if (this.rosterView === 'daily') this.renderDailyRoster();
        else this.renderMonthlyRoster();
        this.renderSwapRequests();
    }

    shiftClass(shift) {
        return { 'Morning': 'shift-morning', 'Afternoon': 'shift-afternoon', 'Night': 'shift-night', 'On-call': 'shift-oncall', 'Leave': 'shift-leave', 'Off': 'shift-off' }[shift] || '';
    }

    shiftLabel(shift) {
        return { 'Morning': 'AM', 'Afternoon': 'PM', 'Night': 'Night', 'On-call': 'On-call', 'Off': 'Off', 'Leave': 'Leave' }[shift] || shift;
    }

    weekDates() {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(this.rosterWeekStart);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    renderWeeklyRoster() {
        const container = document.getElementById('rosterGridWeekly');
        const label = document.getElementById('rosterRangeLabel');
        if (!container) return;

        const dates = this.weekDates();
        if (label) label.textContent = `${Utils.formatDate(dates[0], 'MM/DD/YYYY')} - ${Utils.formatDate(dates[6], 'MM/DD/YYYY')}`;

        const staffNames = this.getRosterStaffNames();
        const entries = this.getRosterEntries();
        const canManage = window.auth?.hasPermission('manage_staff');

        if (staffNames.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No staff in the directory yet. Add staff members in the Directory tab to schedule shifts.</p></div>`;
            return;
        }

        let html = `<div class="roster-grid">`;
        html += `<div class="roster-head">Staff</div>`;
        dates.forEach(d => { html += `<div class="roster-head">${Utils.formatDate(d, 'ddd')}<br>${Utils.formatDate(d, 'MM/DD')}</div>`; });

        staffNames.forEach(name => {
            html += `<div class="roster-name">${Utils.escapeHtml(name)}</div>`;
            dates.forEach(d => {
                const dateStr = d.toISOString().split('T')[0];
                const entry = entries.find(e => e.staffName === name && e.date === dateStr);
                const shift = entry?.shift || '-';
                html += `<div class="roster-cell ${this.shiftClass(shift)}" ${canManage ? `onclick="staffManager.openRosterCellModal('${name.replace(/'/g, "\\'")}','${dateStr}')"` : ''}>${shift === '-' ? '-' : this.shiftLabel(shift)}</div>`;
            });
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    renderDailyRoster() {
        const tbody = document.getElementById('rosterDailyBody');
        const label = document.getElementById('rosterRangeLabel');
        if (!tbody) return;

        if (this.rosterView === 'daily' && label) label.textContent = Utils.formatDate(this.rosterDay, 'ddd, MM/DD/YYYY');

        const staffNames = this.getRosterStaffNames();
        const entries = this.getRosterEntries().filter(e => e.date === this.rosterDay);
        const canManage = window.auth?.hasPermission('manage_staff');

        if (staffNames.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="padding:2rem;">No staff in the directory yet</td></tr>`;
            return;
        }

        tbody.innerHTML = staffNames.map(name => {
            const entry = entries.find(e => e.staffName === name);
            const shift = entry?.shift || 'Off';
            return `
            <tr>
                <td>${Utils.escapeHtml(name)}</td>
                <td><span class="badge ${shift === 'Leave' ? 'badge-danger' : shift === 'Off' ? 'badge-secondary' : 'badge-info'}">${this.shiftLabel(shift)}</span>${entry?.leaveType ? ` (${Utils.escapeHtml(entry.leaveType)})` : ''}</td>
                <td class="actions staff-manage-only">
                    ${canManage ? `<button class="edit-btn" title="Edit" onclick="staffManager.openRosterCellModal('${name.replace(/'/g, "\\'")}','${this.rosterDay}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>` : ''}
                </td>
            </tr>`;
        }).join('');
    }

    renderMonthlyRoster() {
        const tbody = document.getElementById('rosterMonthlyBody');
        const label = document.getElementById('rosterRangeLabel');
        if (!tbody) return;

        const [y, m] = this.rosterMonth.split('-').map(Number);
        if (this.rosterView === 'monthly' && label) {
            label.textContent = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        const daysInMonth = new Date(y, m, 0).getDate();
        const monthPrefix = this.rosterMonth;
        const staffNames = this.getRosterStaffNames();
        const entries = (this.getRosterEntries() || []).filter(e => e.date.startsWith(monthPrefix));

        if (staffNames.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No staff in the directory yet</td></tr>`;
            return;
        }

        tbody.innerHTML = staffNames.map(name => {
            const staffEntries = entries.filter(e => e.staffName === name);
            const counts = { Morning: 0, Afternoon: 0, Night: 0, 'On-call': 0, Leave: 0, Off: 0 };
            staffEntries.forEach(e => { if (counts[e.shift] !== undefined) counts[e.shift]++; });
            return `
            <tr>
                <td>${Utils.escapeHtml(name)}</td>
                <td>${counts.Morning}</td>
                <td>${counts.Afternoon}</td>
                <td>${counts.Night}</td>
                <td>${counts['On-call']}</td>
                <td>${counts.Leave}</td>
                <td>${staffEntries.length} of ${daysInMonth} days scheduled</td>
            </tr>`;
        }).join('');
    }

    openRosterCellModal(staffName, dateStr) {
        if (!window.auth?.hasPermission('manage_staff')) return;
        const entries = this.getRosterEntries();
        const entry = entries.find(e => e.staffName === staffName && e.date === dateStr);

        document.getElementById('rosterCellStaff').value = staffName;
        document.getElementById('rosterCellDate').value = dateStr;
        document.getElementById('rosterCellLabel').textContent = `${staffName} — ${Utils.formatDate(dateStr, 'MM/DD/YYYY')}`;
        document.getElementById('rosterCellShift').value = entry?.shift || 'Off';
        document.getElementById('rosterCellLeaveType').value = entry?.leaveType || '';
        document.getElementById('rosterCellModal').style.display = 'flex';
    }

    closeRosterCellModal() {
        document.getElementById('rosterCellModal').style.display = 'none';
    }

    saveRosterCell() {
        const staffName = document.getElementById('rosterCellStaff').value;
        const date = document.getElementById('rosterCellDate').value;
        const shift = document.getElementById('rosterCellShift').value;
        const leaveType = document.getElementById('rosterCellLeaveType').value;

        const entries = this.getRosterEntries();
        const existing = entries.find(e => e.staffName === staffName && e.date === date);

        try {
            if (existing) {
                storage.update('staffRoster', existing.id, { shift, leaveType: shift === 'Leave' ? leaveType : '' });
            } else {
                storage.create('staffRoster', { staffName, date, shift, leaveType: shift === 'Leave' ? leaveType : '' });
            }
            this.closeRosterCellModal();
            this.render();
        } catch (err) {
            showToast('Failed to save shift: ' + err.message, 'error');
        }
    }

    openSwapModal() {
        const staffNames = this.getRosterStaffNames();
        const options = staffNames.map(n => `<option value="${Utils.escapeHtml(n)}">${Utils.escapeHtml(n)}</option>`).join('');
        document.getElementById('swapRequesterName').innerHTML = `<option value="">Select...</option>${options}`;
        document.getElementById('swapTargetName').innerHTML = `<option value="">Select...</option>${options}`;
        document.getElementById('swapRequestForm').reset();
        document.getElementById('swapModal').style.display = 'flex';
    }

    closeSwapModal() {
        document.getElementById('swapModal').style.display = 'none';
    }

    saveSwapRequest() {
        const requesterName = document.getElementById('swapRequesterName').value;
        const requesterDate = document.getElementById('swapRequesterDate').value;
        const targetName = document.getElementById('swapTargetName').value;
        const targetDate = document.getElementById('swapTargetDate').value;
        const reason = document.getElementById('swapReason').value.trim();

        if (!requesterName || !requesterDate || !targetName || !targetDate) {
            showToast('Please complete all swap fields', 'error');
            return;
        }
        if (requesterName === targetName) {
            showToast('Cannot swap with yourself', 'error');
            return;
        }

        const entries = this.getRosterEntries();
        const requesterShift = entries.find(e => e.staffName === requesterName && e.date === requesterDate)?.shift || 'Off';
        const targetShift = entries.find(e => e.staffName === targetName && e.date === targetDate)?.shift || 'Off';

        storage.create('shiftSwapRequests', {
            requesterName, requesterDate, requesterShift,
            targetName, targetDate, targetShift,
            reason, status: 'Pending', requestedDate: new Date().toISOString()
        });

        showToast('Swap request submitted for approval', 'success');
        this.closeSwapModal();
        this.renderSwapRequests();
    }

    renderSwapRequests() {
        const container = document.getElementById('swapRequestsList');
        if (!container) return;
        const requests = [...(storage.getAll('shiftSwapRequests') || [])].sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));
        const canManage = window.auth?.hasPermission('manage_staff');

        if (requests.length === 0) {
            container.innerHTML = `<p style="color:var(--gray-400); font-size:var(--text-sm);">No shift swap requests</p>`;
            return;
        }

        const statusBadge = { 'Pending': 'badge-warning', 'Approved': 'badge-success', 'Rejected': 'badge-danger' };
        container.innerHTML = requests.slice(0, 20).map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--gray-100); font-size:var(--text-sm);">
                <div>
                    <strong>${Utils.escapeHtml(r.requesterName)}</strong> (${Utils.formatDate(r.requesterDate, 'MM/DD')}, ${this.shiftLabel(r.requesterShift)})
                    &harr;
                    <strong>${Utils.escapeHtml(r.targetName)}</strong> (${Utils.formatDate(r.targetDate, 'MM/DD')}, ${this.shiftLabel(r.targetShift)})
                    <span class="badge ${statusBadge[r.status]}">${r.status}</span>
                </div>
                ${canManage && r.status === 'Pending' ? `
                <div>
                    <button class="btn btn-sm btn-secondary" onclick="staffManager.resolveSwap('${r.id}', true)">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="staffManager.resolveSwap('${r.id}', false)">Reject</button>
                </div>` : ''}
            </div>`).join('');
    }

    resolveSwap(id, approve) {
        const req = storage.getById('shiftSwapRequests', id);
        if (!req) return;

        if (approve) {
            const entries = this.getRosterEntries();
            const requesterEntry = entries.find(e => e.staffName === req.requesterName && e.date === req.requesterDate);
            const targetEntry = entries.find(e => e.staffName === req.targetName && e.date === req.targetDate);

            if (requesterEntry) storage.update('staffRoster', requesterEntry.id, { shift: req.targetShift });
            else storage.create('staffRoster', { staffName: req.requesterName, date: req.requesterDate, shift: req.targetShift });

            if (targetEntry) storage.update('staffRoster', targetEntry.id, { shift: req.requesterShift });
            else storage.create('staffRoster', { staffName: req.targetName, date: req.targetDate, shift: req.requesterShift });

            storage.update('shiftSwapRequests', id, { status: 'Approved' });
            showToast('Swap approved and roster updated', 'success');
        } else {
            storage.update('shiftSwapRequests', id, { status: 'Rejected' });
            showToast('Swap rejected', 'success');
        }
        this.render();
    }
}

let staffManager;
document.addEventListener('DOMContentLoaded', function () {
    staffManager = new StaffManager();
    window.staffManager = staffManager;
});
