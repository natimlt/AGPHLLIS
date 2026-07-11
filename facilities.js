/**
 * ======================================================
 * AGPHL LIS - Facility Management Module
 * Version: 1.0
 *
 * Lets an Administrator manage the hospitals/facilities
 * sharing this LIS deployment (e.g. Agew Gimjabet Primary
 * Hospital, Injibara Hospital, Chagni Hospital). Each user
 * account is assigned to one facility in User Management.
 * ======================================================
 */

class FacilityManager {
    constructor() {
        this.editingId = null;
        this.init();
    }

    init() {
        if (!document.getElementById('facilitiesPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'facilities') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_facilities');
        document.querySelectorAll('.facility-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
        if (!canManage) {
            const container = document.getElementById('facilitiesPage');
            if (container) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><h3>Access Restricted</h3><p>Only Administrators can manage facilities.</p></div>`;
            }
        }
    }

    setupEventListeners() {
        document.getElementById('facilityAddBtn')?.addEventListener('click', () => this.openModal());
        document.getElementById('facilityForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFacility();
        });
    }

    render() {
        if (!window.auth?.hasPermission('manage_facilities')) return;
        const tbody = document.getElementById('facilitiesTableBody');
        if (!tbody) return;

        const facilities = window.auth.getFacilities();
        const users = auth.getAllUsers();

        if (facilities.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:2rem;">No facilities configured yet</td></tr>`;
            return;
        }

        tbody.innerHTML = facilities.map(f => {
            const userCount = users.filter(u => u.facilityId === f.id).length;
            return `
            <tr>
                <td><strong>${Utils.escapeHtml(f.name)}</strong></td>
                <td>${Utils.escapeHtml(f.code || '-')}</td>
                <td>${Utils.escapeHtml(f.address || '-')}</td>
                <td>${userCount} user(s)</td>
                <td class="actions">
                    <button class="edit-btn" title="Edit" onclick="facilityManager.openModal('${f.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="facilityManager.deleteFacility('${f.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    openModal(id = null) {
        this.editingId = id;
        const form = document.getElementById('facilityForm');
        form.reset();
        if (id) {
            const f = storage.getById('facilities', id);
            if (!f) return;
            document.getElementById('facilityModalTitle').textContent = 'Edit Facility';
            document.getElementById('facilityName').value = f.name;
            document.getElementById('facilityCode').value = f.code || '';
            document.getElementById('facilityAddress').value = f.address || '';
            document.getElementById('facilityPhone').value = f.phone || '';
        } else {
            document.getElementById('facilityModalTitle').textContent = 'Add Facility';
        }
        document.getElementById('facilityModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('facilityModal').style.display = 'none';
        this.editingId = null;
    }

    saveFacility() {
        const data = {
            name: document.getElementById('facilityName').value.trim(),
            code: document.getElementById('facilityCode').value.trim().toUpperCase(),
            address: document.getElementById('facilityAddress').value.trim(),
            phone: document.getElementById('facilityPhone').value.trim()
        };

        if (!data.name) {
            showToast('Facility name is required', 'error');
            return;
        }

        try {
            if (this.editingId) {
                auth.updateFacility(this.editingId, data);
                showToast('Facility updated', 'success');
            } else {
                auth.createFacility(data);
                showToast('Facility added', 'success');
            }
            this.closeModal();
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    deleteFacility(id) {
        if (!confirm('Delete this facility? This is only possible if no users are assigned to it.')) return;
        try {
            auth.deleteFacility(id);
            showToast('Facility deleted', 'success');
            this.render();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

let facilityManager;
document.addEventListener('DOMContentLoaded', function () {
    facilityManager = new FacilityManager();
    window.facilityManager = facilityManager;
});
