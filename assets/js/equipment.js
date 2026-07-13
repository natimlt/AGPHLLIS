/**
 * ======================================================
 * AGPHL LIS - Equipment Management Module
 * Version: 1.0
 *
 * ISO 15189:2022 clause 6.3 (Equipment): register,
 * calibration schedule, preventive/corrective maintenance,
 * IQ/OQ/PQ qualification records, and breakdown/service
 * history with downtime tracking.
 * ======================================================
 */

class EquipmentManager {
    constructor() {
        this.activeTab = 'register';
        this.editingEquipmentId = null;
        this.editingCalibrationId = null;
        this.editingMaintenanceId = null;
        this.editingQualId = null;
        this.editingServiceId = null;
        this.init();
    }

    init() {
        if (!document.getElementById('equipmentPage')) return;
        this.applyPermissions();
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'equipment') this.render();
        });
    }

    applyPermissions() {
        const canManage = window.auth?.hasPermission('manage_equipment');
        document.querySelectorAll('.equipment-manage-only').forEach(el => {
            el.style.display = canManage ? '' : 'none';
        });
    }

    setupEventListeners() {
        document.querySelectorAll('#equipmentPage .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('equipAddBtn')?.addEventListener('click', () => this.openEquipModal());
        document.getElementById('equipForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveEquip(); });

        document.getElementById('calAddBtn')?.addEventListener('click', () => this.openCalModal());
        document.getElementById('calForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveCal(); });

        document.getElementById('maintAddBtn')?.addEventListener('click', () => this.openMaintModal());
        document.getElementById('maintForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveMaint(); });

        document.getElementById('qualAddBtn')?.addEventListener('click', () => this.openQualModal());
        document.getElementById('qualForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveQual(); });

        document.getElementById('serviceAddBtn')?.addEventListener('click', () => this.openServiceModal());
        document.getElementById('serviceForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveService(); });
    }

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('#equipmentPage .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('#equipmentPage .tab-panel').forEach(p => p.classList.toggle('active', p.id === `equipment-${tab}-panel`));
        this.render();
    }

    render() {
        if (this.activeTab === 'register') this.renderRegister();
        else if (this.activeTab === 'calibration') this.renderCalibration();
        else if (this.activeTab === 'maintenance') this.renderMaintenance();
        else if (this.activeTab === 'qualification') this.renderQualification();
        else this.renderServiceHistory();
    }

    getEquipment() {
        return storage.getAll('equipment') || [];
    }

    populateEquipSelect(id) {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select equipment...</option>' +
            this.getEquipment().map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)} (${Utils.escapeHtml(e.serialNumber || 'no S/N')})</option>`).join('');
    }

    // ==================== REGISTER ====================
    renderRegister() {
        const equipment = this.getEquipment();
        const statsEl = document.getElementById('equipStats');
        if (statsEl) {
            const operational = equipment.filter(e => e.status === 'Operational').length;
            const down = equipment.filter(e => e.status === 'Down' || e.status === 'Under Maintenance').length;
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${equipment.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Equipment</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${operational}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Operational</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${down}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Down / In Maintenance</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('equipTableBody');
        if (!tbody) return;
        if (equipment.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No equipment registered yet</td></tr>`;
            return;
        }
        const statusBadge = { 'Operational': 'badge-success', 'Under Maintenance': 'badge-warning', 'Down': 'badge-danger', 'Decommissioned': 'badge-secondary' };
        tbody.innerHTML = equipment.map(e => `
            <tr>
                <td><strong>${Utils.escapeHtml(e.name)}</strong></td>
                <td>${Utils.escapeHtml(e.serialNumber || '-')}</td>
                <td>${Utils.escapeHtml(e.manufacturer || '-')}</td>
                <td>${Utils.escapeHtml(e.department || '-')}</td>
                <td><span class="badge ${statusBadge[e.status] || 'badge-secondary'}">${Utils.escapeHtml(e.status || 'Operational')}</span></td>
                <td>${e.warrantyExpiry ? Utils.formatDate(e.warrantyExpiry, 'MM/DD/YYYY') : '-'}</td>
                <td class="actions equipment-manage-only">
                    <button class="edit-btn" title="Edit" onclick="equipmentManager.openEquipModal('${e.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Remove" onclick="equipmentManager.deleteEquip('${e.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openEquipModal(id = null) {
        this.editingEquipmentId = id;
        const form = document.getElementById('equipForm');
        form.reset();
        if (id) {
            const e = storage.getById('equipment', id);
            if (!e) return;
            document.getElementById('equipModalTitle').textContent = 'Edit Equipment';
            document.getElementById('equipName').value = e.name;
            document.getElementById('equipSerial').value = e.serialNumber || '';
            document.getElementById('equipManufacturer').value = e.manufacturer || '';
            document.getElementById('equipModel').value = e.model || '';
            document.getElementById('equipDepartment').value = e.department || '';
            document.getElementById('equipLocation').value = e.location || '';
            document.getElementById('equipStatus').value = e.status || 'Operational';
            document.getElementById('equipInstallDate').value = e.installDate || '';
            document.getElementById('equipWarrantyExpiry').value = e.warrantyExpiry || '';
        } else {
            document.getElementById('equipModalTitle').textContent = 'Add Equipment';
            document.getElementById('equipStatus').value = 'Operational';
        }
        document.getElementById('equipModal').style.display = 'flex';
    }

    closeEquipModal() {
        document.getElementById('equipModal').style.display = 'none';
        this.editingEquipmentId = null;
    }

    saveEquip() {
        const data = {
            name: document.getElementById('equipName').value.trim(),
            serialNumber: document.getElementById('equipSerial').value.trim(),
            manufacturer: document.getElementById('equipManufacturer').value.trim(),
            model: document.getElementById('equipModel').value.trim(),
            department: document.getElementById('equipDepartment').value,
            location: document.getElementById('equipLocation').value.trim(),
            status: document.getElementById('equipStatus').value,
            installDate: document.getElementById('equipInstallDate').value,
            warrantyExpiry: document.getElementById('equipWarrantyExpiry').value
        };
        if (!data.name) {
            showToast('Equipment name is required', 'error');
            return;
        }
        try {
            if (this.editingEquipmentId) {
                storage.update('equipment', this.editingEquipmentId, data);
                showToast('Equipment updated', 'success');
            } else {
                storage.create('equipment', data);
                showToast('Equipment added', 'success');
            }
            this.closeEquipModal();
            this.render();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteEquip(id) {
        if (!confirm('Remove this equipment? Its calibration/maintenance history is kept.')) return;
        storage.delete('equipment', id);
        showToast('Equipment removed', 'success');
        this.render();
    }

    equipName(id) {
        return storage.getById('equipment', id)?.name || 'Unknown';
    }

    // ==================== CALIBRATION ====================
    renderCalibration() {
        const records = [...(storage.getAll('equipmentCalibration') || [])].sort((a, b) => new Date(a.nextDueDate || '9999') - new Date(b.nextDueDate || '9999'));
        const now = new Date();
        const overdue = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) < now).length;
        const dueSoon = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) >= now && new Date(r.nextDueDate) < new Date(now.getTime() + 30 * 86400000)).length;

        const statsEl = document.getElementById('calStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${overdue}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Overdue Calibration</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${dueSoon}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Due Within 30 Days</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${records.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Records</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('calTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No calibration records yet</td></tr>`;
            return;
        }
        tbody.innerHTML = records.map(r => {
            const isOverdue = r.nextDueDate && new Date(r.nextDueDate) < now;
            return `
            <tr>
                <td>${Utils.escapeHtml(this.equipName(r.equipmentId))}</td>
                <td>${Utils.formatDate(r.calibrationDate, 'MM/DD/YYYY')}</td>
                <td>${r.nextDueDate ? `<span class="${isOverdue ? 'badge badge-danger' : ''}">${Utils.formatDate(r.nextDueDate, 'MM/DD/YYYY')}</span>` : '-'}</td>
                <td>${Utils.escapeHtml(r.performedBy || '-')}</td>
                <td><span class="badge ${r.result === 'Pass' ? 'badge-success' : 'badge-danger'}">${Utils.escapeHtml(r.result)}</span></td>
                <td class="actions equipment-manage-only">
                    <button class="delete-btn" title="Delete" onclick="equipmentManager.deleteCal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    openCalModal() {
        const form = document.getElementById('calForm');
        form.reset();
        this.populateEquipSelect('calEquipment');
        document.getElementById('calDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('calModal').style.display = 'flex';
    }

    closeCalModal() {
        document.getElementById('calModal').style.display = 'none';
    }

    saveCal() {
        const data = {
            equipmentId: document.getElementById('calEquipment').value,
            calibrationDate: document.getElementById('calDate').value,
            nextDueDate: document.getElementById('calNextDue').value,
            performedBy: document.getElementById('calPerformedBy').value.trim(),
            result: document.getElementById('calResult').value,
            certificateNumber: document.getElementById('calCertificate').value.trim(),
            notes: document.getElementById('calNotes').value.trim()
        };
        if (!data.equipmentId || !data.calibrationDate) {
            showToast('Equipment and calibration date are required', 'error');
            return;
        }
        storage.create('equipmentCalibration', data);
        showToast('Calibration record saved', 'success');
        this.closeCalModal();
        this.render();
    }

    deleteCal(id) {
        if (!confirm('Delete this calibration record?')) return;
        storage.delete('equipmentCalibration', id);
        this.render();
    }

    // ==================== MAINTENANCE ====================
    renderMaintenance() {
        const records = [...(storage.getAll('equipmentMaintenance') || [])];
        const now = new Date();
        records.forEach(r => { if (r.status !== 'Completed' && r.scheduledDate && new Date(r.scheduledDate) < now) r.status = 'Overdue'; });
        records.sort((a, b) => new Date(a.scheduledDate || '9999') - new Date(b.scheduledDate || '9999'));

        const statsEl = document.getElementById('maintStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${records.filter(r => r.status === 'Overdue').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Overdue</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${records.filter(r => r.status === 'Scheduled').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Scheduled</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${records.filter(r => r.status === 'Completed').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Completed</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('maintTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No maintenance records yet</td></tr>`;
            return;
        }
        const statusBadge = { 'Scheduled': 'badge-info', 'Completed': 'badge-success', 'Overdue': 'badge-danger' };
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${Utils.escapeHtml(this.equipName(r.equipmentId))}</td>
                <td><span class="badge badge-secondary">${Utils.escapeHtml(r.type)}</span></td>
                <td>${Utils.formatDate(r.scheduledDate, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(r.performedBy || '-')}</td>
                <td><span class="badge ${statusBadge[r.status]}">${Utils.escapeHtml(r.status)}</span></td>
                <td class="actions equipment-manage-only">
                    ${r.status !== 'Completed' ? `<button class="edit-btn" title="Mark Completed" onclick="equipmentManager.completeMaint('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                    </button>` : ''}
                    <button class="delete-btn" title="Delete" onclick="equipmentManager.deleteMaint('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openMaintModal() {
        const form = document.getElementById('maintForm');
        form.reset();
        this.populateEquipSelect('maintEquipment');
        document.getElementById('maintStatus').value = 'Scheduled';
        document.getElementById('maintModal').style.display = 'flex';
    }

    closeMaintModal() {
        document.getElementById('maintModal').style.display = 'none';
    }

    saveMaint() {
        const data = {
            equipmentId: document.getElementById('maintEquipment').value,
            type: document.getElementById('maintType').value,
            scheduledDate: document.getElementById('maintDate').value,
            performedBy: document.getElementById('maintPerformedBy').value.trim(),
            status: document.getElementById('maintStatus').value,
            notes: document.getElementById('maintNotes').value.trim()
        };
        if (!data.equipmentId || !data.scheduledDate) {
            showToast('Equipment and date are required', 'error');
            return;
        }
        storage.create('equipmentMaintenance', data);
        showToast('Maintenance scheduled', 'success');
        this.closeMaintModal();
        this.render();
    }

    completeMaint(id) {
        storage.update('equipmentMaintenance', id, { status: 'Completed', completedDate: new Date().toISOString() });
        showToast('Maintenance marked completed', 'success');
        this.render();
    }

    deleteMaint(id) {
        if (!confirm('Delete this maintenance record?')) return;
        storage.delete('equipmentMaintenance', id);
        this.render();
    }

    // ==================== IQ/OQ/PQ ====================
    renderQualification() {
        const records = [...(storage.getAll('equipmentQualification') || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        const tbody = document.getElementById('qualTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;">No IQ/OQ/PQ records yet</td></tr>`;
            return;
        }
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${Utils.escapeHtml(this.equipName(r.equipmentId))}</td>
                <td><span class="badge badge-secondary">${Utils.escapeHtml(r.type)}</span></td>
                <td>${Utils.formatDate(r.date, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(r.performedBy || '-')}</td>
                <td><span class="badge ${r.result === 'Pass' ? 'badge-success' : 'badge-danger'}">${Utils.escapeHtml(r.result)}</span></td>
                <td class="actions equipment-manage-only">
                    <button class="delete-btn" title="Delete" onclick="equipmentManager.deleteQual('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openQualModal() {
        const form = document.getElementById('qualForm');
        form.reset();
        this.populateEquipSelect('qualEquipment');
        document.getElementById('qualDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('qualModal').style.display = 'flex';
    }

    closeQualModal() {
        document.getElementById('qualModal').style.display = 'none';
    }

    saveQual() {
        const data = {
            equipmentId: document.getElementById('qualEquipment').value,
            type: document.getElementById('qualType').value,
            date: document.getElementById('qualDate').value,
            performedBy: document.getElementById('qualPerformedBy').value.trim(),
            result: document.getElementById('qualResult').value,
            documentRef: document.getElementById('qualDocRef').value.trim(),
            notes: document.getElementById('qualNotes').value.trim()
        };
        if (!data.equipmentId || !data.date) {
            showToast('Equipment and date are required', 'error');
            return;
        }
        storage.create('equipmentQualification', data);
        showToast('Qualification record saved', 'success');
        this.closeQualModal();
        this.render();
    }

    deleteQual(id) {
        if (!confirm('Delete this qualification record?')) return;
        storage.delete('equipmentQualification', id);
        this.render();
    }

    // ==================== SERVICE / BREAKDOWN HISTORY ====================
    renderServiceHistory() {
        const records = [...(storage.getAll('equipmentServiceHistory') || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

        const statsEl = document.getElementById('serviceStats');
        if (statsEl) {
            const totalDowntime = records.reduce((sum, r) => sum + (parseFloat(r.downtime) || 0), 0);
            const unresolved = records.filter(r => !r.resolved).length;
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${unresolved}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Unresolved Issues</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${totalDowntime.toFixed(1)}h</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Downtime Logged</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${records.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Events</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('serviceTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No breakdown/service history yet</td></tr>`;
            return;
        }
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${Utils.escapeHtml(this.equipName(r.equipmentId))}</td>
                <td><span class="badge ${r.type === 'Breakdown' ? 'badge-danger' : 'badge-secondary'}">${Utils.escapeHtml(r.type)}</span></td>
                <td>${Utils.formatDate(r.date, 'MM/DD/YYYY')}</td>
                <td>${Utils.escapeHtml(Utils.truncate(r.description, 40))}</td>
                <td>${r.downtime || 0}h</td>
                <td><span class="badge ${r.resolved ? 'badge-success' : 'badge-warning'}">${r.resolved ? 'Resolved' : 'Open'}</span></td>
                <td class="actions equipment-manage-only">
                    <button class="delete-btn" title="Delete" onclick="equipmentManager.deleteService('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openServiceModal() {
        const form = document.getElementById('serviceForm');
        form.reset();
        this.populateEquipSelect('serviceEquipment');
        document.getElementById('serviceDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('serviceModal').style.display = 'flex';
    }

    closeServiceModal() {
        document.getElementById('serviceModal').style.display = 'none';
    }

    saveService() {
        const data = {
            equipmentId: document.getElementById('serviceEquipment').value,
            type: document.getElementById('serviceType').value,
            date: document.getElementById('serviceDate').value,
            description: document.getElementById('serviceDescription').value.trim(),
            downtime: parseFloat(document.getElementById('serviceDowntime').value) || 0,
            technician: document.getElementById('serviceTechnician').value.trim(),
            resolved: document.getElementById('serviceResolved').checked
        };
        if (!data.equipmentId || !data.description) {
            showToast('Equipment and description are required', 'error');
            return;
        }
        // If this event marks the equipment as down, reflect that on the register
        if (data.type === 'Breakdown' && !data.resolved) {
            storage.update('equipment', data.equipmentId, { status: 'Down' });
        }
        storage.create('equipmentServiceHistory', data);
        showToast('Service record saved', 'success');
        this.closeServiceModal();
        this.render();
    }

    deleteService(id) {
        if (!confirm('Delete this service record?')) return;
        storage.delete('equipmentServiceHistory', id);
        this.render();
    }
}

let equipmentManager;
document.addEventListener('DOMContentLoaded', function () {
    equipmentManager = new EquipmentManager();
    window.equipmentManager = equipmentManager;
});
