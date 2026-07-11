/**
 * ======================================================
 * AGPHL LIS - User Management Module
 * Version: 1.0
 *
 * Administrator screen for managing accounts, roles,
 * account lockouts, and password resets. Also provides
 * the self-service "Change Password" flow available to
 * every signed-in user from the profile menu.
 * ======================================================
 */

class UserManager {
    constructor() {
        this.editingId = null;
        this.init();
    }

    init() {
        this.setupChangePasswordModal();
        if (!document.getElementById('usersPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'users') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_users');
        document.querySelectorAll('.users-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
        if (!canManage) {
            const container = document.getElementById('usersPage');
            if (container) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><h3>Access Restricted</h3><p>Only Administrators can manage user accounts.</p></div>`;
            }
        }
    }

    setupEventListeners() {
        document.getElementById('userAddBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('userForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });
    }

    render() {
        if (!window.auth?.hasPermission('manage_users')) return;
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const users = auth.getAllUsers().sort((a, b) => a.username.localeCompare(b.username));
        const currentId = auth.getCurrentUser()?.userId;
        const facilities = auth.getFacilities();
        const facilityName = (id) => {
            if (id === null || id === undefined) return 'All Facilities';
            return facilities.find(f => f.id === id)?.name || 'Unassigned';
        };

        tbody.innerHTML = users.map(u => {
            const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
            return `
                <tr>
                    <td>${Utils.escapeHtml(u.username)}</td>
                    <td>${Utils.escapeHtml(u.fullName)}</td>
                    <td><span class="badge badge-primary">${Utils.escapeHtml(u.role)}</span></td>
                    <td>${Utils.escapeHtml(facilityName(u.facilityId))}</td>
                    <td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-secondary'}">${Utils.escapeHtml(u.status)}</span></td>
                    <td>${locked ? '<span class="badge badge-danger">Locked</span>' : '<span class="badge badge-success">OK</span>'}</td>
                    <td>${u.lastLogin ? Utils.timeAgo(u.lastLogin) : 'Never'}</td>
                    <td class="actions">
                        <button class="edit-btn" title="Edit" onclick="userManager.openEditModal('${u.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        ${locked ? `<button class="edit-btn" title="Unlock" onclick="userManager.unlock('${u.id}')">🔓</button>` : ''}
                        <button class="edit-btn" title="Reset password" onclick="userManager.resetPassword('${u.id}')">🔑</button>
                        ${u.id !== currentId ? `
                        <button class="delete-btn" title="Delete" onclick="userManager.deleteUser('${u.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>` : ''}
                    </td>
                </tr>`;
        }).join('');
    }

    populateFacilitySelect() {
        const select = document.getElementById('userFacility');
        if (!select) return;
        const facilities = auth.getFacilities();
        select.innerHTML = '<option value="">All Facilities (Administrator only)</option>' +
            facilities.map(f => `<option value="${f.id}">${Utils.escapeHtml(f.name)}</option>`).join('');
    }

    openAddModal() {
        this.editingId = null;
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('userForm').reset();
        document.getElementById('userUsername').disabled = false;
        document.getElementById('userPasswordGroup').style.display = '';
        document.getElementById('userPassword').required = true;
        this.populateFacilitySelect();
        document.getElementById('userModal').style.display = 'flex';
    }

    openEditModal(id) {
        const user = auth.getUserById(id);
        if (!user) return;
        this.editingId = id;
        document.getElementById('userModalTitle').textContent = `Edit: ${user.username}`;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userUsername').disabled = true;
        document.getElementById('userFullName').value = user.fullName || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userRole').value = user.role || 'Viewer';
        document.getElementById('userStatus').value = user.status || 'active';
        this.populateFacilitySelect();
        document.getElementById('userFacility').value = user.facilityId ?? '';
        document.getElementById('userPasswordGroup').style.display = 'none';
        document.getElementById('userPassword').required = false;
        document.getElementById('userPassword').value = '';
        document.getElementById('userModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('userModal').style.display = 'none';
        document.getElementById('userUsername').disabled = false;
        this.editingId = null;
    }

    async saveUser() {
        const facilityValue = document.getElementById('userFacility').value;
        const data = {
            username: document.getElementById('userUsername').value.trim(),
            fullName: document.getElementById('userFullName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            phone: document.getElementById('userPhone').value.trim(),
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value,
            facilityId: document.getElementById('userRole').value === 'Administrator' ? null : (facilityValue || null)
        };
        const password = document.getElementById('userPassword').value;

        try {
            if (this.editingId) {
                const payload = { ...data };
                delete payload.username; // username is immutable after creation
                if (password) payload.password = password;
                await auth.updateUser(this.editingId, payload);
                showToast('User updated', 'success');
            } else {
                if (!password) {
                    showToast('Password is required for new users', 'error');
                    return;
                }
                await auth.createUser({ ...data, password });
                showToast('User created', 'success');
            }
            this.closeModal();
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    unlock(id) {
        try {
            auth.unlockUser(id);
            showToast('Account unlocked', 'success');
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async resetPassword(id) {
        const user = auth.getUserById(id);
        if (!user) return;
        const tempPassword = `Temp${Math.floor(1000 + Math.random() * 9000)}!${new Date().getFullYear()}`;
        if (!confirm(`Reset password for ${user.username}? A temporary password will be generated and the user will be required to change it at next login.`)) return;
        try {
            await auth.resetUserPassword(id, tempPassword);
            alert(`Temporary password for ${user.username}:\n\n${tempPassword}\n\nShare this securely with the user. They must change it at next login.`);
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    deleteUser(id) {
        if (!confirm('Delete this user account? This cannot be undone.')) return;
        try {
            auth.deleteUser(id);
            showToast('User deleted', 'success');
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // ---- Self-service Change Password ----
    setupChangePasswordModal() {
        document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = document.getElementById('cpCurrentPassword').value;
            const next = document.getElementById('cpNewPassword').value;
            const confirmPwd = document.getElementById('cpConfirmPassword').value;

            if (next !== confirmPwd) {
                showToast('New passwords do not match', 'error');
                return;
            }
            try {
                await auth.changeOwnPassword(current, next);
                showToast('Password changed successfully', 'success');
                document.getElementById('changePasswordForm').reset();
                document.getElementById('changePasswordModal').style.display = 'none';
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

let userManager;
document.addEventListener('DOMContentLoaded', function () {
    userManager = new UserManager();
    window.userManager = userManager;
});

function openChangePasswordModal() {
    document.getElementById('profileDropdown')?.classList.remove('show');
    document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

function openMyProfileModal() {
    document.getElementById('profileDropdown')?.classList.remove('show');
    const session = window.auth?.getCurrentUser();
    if (!session) return;

    const user = auth.getUserById(session.userId) || {};
    const body = document.getElementById('myProfileModalBody');
    if (!body) return;

    body.innerHTML = `
        <div style="text-align:center; margin-bottom:1.25rem;">
            <div class="user-avatar" style="width:64px; height:64px; font-size:1.5rem; margin:0 auto 0.75rem;">${Utils.escapeHtml(Utils.getInitials(session.fullName))}</div>
            <h3 style="margin:0;">${Utils.escapeHtml(session.fullName)}</h3>
            <span class="badge badge-primary">${Utils.escapeHtml(session.role)}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:0.75rem; font-size:var(--text-sm);">
            <div><strong>Username:</strong> ${Utils.escapeHtml(session.username)}</div>
            <div><strong>Email:</strong> ${Utils.escapeHtml(session.email || '-')}</div>
            <div><strong>Phone:</strong> ${Utils.escapeHtml(session.phone || '-')}</div>
            <div><strong>Facility:</strong> ${Utils.escapeHtml(session.facilityName || '-')}</div>
            <div><strong>Last Login:</strong> ${user.lastLogin ? Utils.timeAgo(user.lastLogin) : 'This session'}</div>
            <div><strong>Password Changed:</strong> ${user.passwordChangedAt ? Utils.formatDate(user.passwordChangedAt, 'MM/DD/YYYY') : '-'}</div>
        </div>
        <div class="modal-footer" style="padding:0; border:none; margin-top:1.5rem; justify-content:flex-start;">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('myProfileModal').style.display='none'; openChangePasswordModal();">Change Password</button>
        </div>`;

    document.getElementById('myProfileModal').style.display = 'flex';
}
