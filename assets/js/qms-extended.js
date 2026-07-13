/**
 * ======================================================
 * AGPHL LIS - Quality Management Extended Module
 * Version: 1.0
 *
 * Adds the remaining ISO 15189:2022 clause 8 quality
 * management elements not covered by the existing SOP/
 * IQC/EQA/Audit pages: Nonconformity & root cause
 * analysis, CAPA (Corrective/Preventive Action) tracking,
 * and a Risk Register with a 5x5 likelihood/impact matrix.
 * ======================================================
 */

class QMSExtendedManager {
    constructor() {
        this.editingNcId = null;
        this.editingCapaId = null;
        this.editingRiskId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        if (document.getElementById('nonconformityPage')) this.renderNonconformity();
        if (document.getElementById('capaPage')) this.renderCapa();
        if (document.getElementById('riskPage')) this.renderRisk();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'nonconformity') this.renderNonconformity();
            if (e.detail.page === 'capa') this.renderCapa();
            if (e.detail.page === 'risk') this.renderRisk();
        });
    }

    canManage() {
        return window.auth?.hasPermission('manage_quality');
    }

    setupEventListeners() {
        document.getElementById('ncAddBtn')?.addEventListener('click', () => this.openNcModal());
        document.getElementById('ncForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveNc(); });

        document.getElementById('capaAddBtn')?.addEventListener('click', () => this.openCapaModal());
        document.getElementById('capaForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveCapa(); });

        document.getElementById('riskAddBtn')?.addEventListener('click', () => this.openRiskModal());
        document.getElementById('riskForm')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveRisk(); });
        document.getElementById('riskLikelihood')?.addEventListener('input', () => this.updateRiskPreview());
        document.getElementById('riskImpact')?.addEventListener('input', () => this.updateRiskPreview());
    }

    // ==================== NONCONFORMITY ====================
    getNonconformities() {
        return storage.getAll('nonconformities') || [];
    }

    renderNonconformity() {
        const records = [...this.getNonconformities()].sort((a, b) => new Date(b.dateIdentified) - new Date(a.dateIdentified));
        const open = records.filter(r => r.status !== 'Closed').length;

        const statsEl = document.getElementById('ncStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${open}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Open</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${records.filter(r => r.status === 'Closed').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Closed</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${records.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total Logged</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('ncTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No nonconformities logged yet</td></tr>`;
            return;
        }
        const statusBadge = { 'Open': 'badge-danger', 'RCA In Progress': 'badge-warning', 'CAPA Assigned': 'badge-info', 'Closed': 'badge-success' };
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${Utils.formatDate(r.dateIdentified, 'MM/DD/YYYY')}</td>
                <td><strong>${Utils.escapeHtml(r.title)}</strong></td>
                <td>${Utils.escapeHtml(r.source)}</td>
                <td>${Utils.escapeHtml(r.department || '-')}</td>
                <td><span class="badge ${r.severity === 'High' ? 'badge-danger' : r.severity === 'Medium' ? 'badge-warning' : 'badge-secondary'}">${Utils.escapeHtml(r.severity)}</span></td>
                <td><span class="badge ${statusBadge[r.status]}">${Utils.escapeHtml(r.status)}</span></td>
                <td class="actions">
                    <button class="edit-btn" title="Edit" onclick="qmsExtended.openNcModal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="qmsExtended.deleteNc('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    openNcModal(id = null) {
        this.editingNcId = id;
        const form = document.getElementById('ncForm');
        form.reset();
        if (id) {
            const r = storage.getById('nonconformities', id);
            if (!r) return;
            document.getElementById('ncModalTitle').textContent = 'Edit Nonconformity';
            document.getElementById('ncTitle').value = r.title;
            document.getElementById('ncDate').value = r.dateIdentified;
            document.getElementById('ncSource').value = r.source;
            document.getElementById('ncDepartment').value = r.department || '';
            document.getElementById('ncSeverity').value = r.severity;
            document.getElementById('ncDescription').value = r.description;
            document.getElementById('ncRootCause').value = r.rootCause || '';
            document.getElementById('ncCorrectiveAction').value = r.correctiveAction || '';
            document.getElementById('ncPreventiveAction').value = r.preventiveAction || '';
            document.getElementById('ncStatus').value = r.status;
            document.getElementById('ncEffectiveness').value = r.effectivenessReview || '';
        } else {
            document.getElementById('ncModalTitle').textContent = 'Log Nonconformity';
            document.getElementById('ncDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('ncStatus').value = 'Open';
        }
        document.getElementById('ncModal').style.display = 'flex';
    }

    closeNcModal() {
        document.getElementById('ncModal').style.display = 'none';
        this.editingNcId = null;
    }

    saveNc() {
        const data = {
            title: document.getElementById('ncTitle').value.trim(),
            dateIdentified: document.getElementById('ncDate').value,
            source: document.getElementById('ncSource').value,
            department: document.getElementById('ncDepartment').value,
            severity: document.getElementById('ncSeverity').value,
            description: document.getElementById('ncDescription').value.trim(),
            rootCause: document.getElementById('ncRootCause').value.trim(),
            correctiveAction: document.getElementById('ncCorrectiveAction').value.trim(),
            preventiveAction: document.getElementById('ncPreventiveAction').value.trim(),
            status: document.getElementById('ncStatus').value,
            effectivenessReview: document.getElementById('ncEffectiveness').value.trim()
        };

        if (!data.title || !data.description) {
            showToast('Title and description are required', 'error');
            return;
        }
        if (data.status === 'Closed' && !data.effectivenessReview) {
            showToast('An effectiveness review is required before closing', 'error');
            return;
        }

        try {
            if (this.editingNcId) {
                if (data.status === 'Closed') data.closedDate = new Date().toISOString();
                storage.update('nonconformities', this.editingNcId, data);
                showToast('Nonconformity updated', 'success');
            } else {
                data.reportedBy = window.auth?.getCurrentUser()?.fullName || 'Unknown';
                storage.create('nonconformities', data);
                showToast('Nonconformity logged', 'success');
            }
            this.closeNcModal();
            this.renderNonconformity();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteNc(id) {
        if (!confirm('Delete this nonconformity record? This cannot be undone.')) return;
        storage.delete('nonconformities', id);
        showToast('Nonconformity deleted', 'success');
        this.renderNonconformity();
    }

    // ==================== CAPA ====================
    getCapa() {
        return storage.getAll('capaRecords') || [];
    }

    renderCapa() {
        const records = [...this.getCapa()];
        const now = new Date();
        records.forEach(r => {
            if (r.status !== 'Completed' && r.dueDate && new Date(r.dueDate) < now) r.status = 'Overdue';
        });
        records.sort((a, b) => new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999'));

        const overdue = records.filter(r => r.status === 'Overdue').length;
        const open = records.filter(r => r.status !== 'Completed').length;

        const statsEl = document.getElementById('capaStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${overdue}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Overdue</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#856404;">${open}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Open</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--success);">${records.filter(r => r.status === 'Completed').length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Completed</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('capaTableBody');
        if (!tbody) return;
        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:2rem;">No CAPA records yet</td></tr>`;
            return;
        }
        const statusBadge = { 'Open': 'badge-warning', 'In Progress': 'badge-info', 'Completed': 'badge-success', 'Overdue': 'badge-danger' };
        tbody.innerHTML = records.map(r => `
            <tr>
                <td><strong>${Utils.escapeHtml(r.title)}</strong></td>
                <td><span class="badge badge-secondary">${Utils.escapeHtml(r.type)}</span></td>
                <td>${Utils.escapeHtml(r.responsiblePerson || '-')}</td>
                <td>${r.dueDate ? Utils.formatDate(r.dueDate, 'MM/DD/YYYY') : '-'}</td>
                <td><span class="badge ${statusBadge[r.status]}">${Utils.escapeHtml(r.status)}</span></td>
                <td>${r.linkedNonconformityId ? 'Linked NC' : '-'}</td>
                <td class="actions">
                    <button class="edit-btn" title="Edit" onclick="qmsExtended.openCapaModal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="qmsExtended.deleteCapa('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    populateNcSelect() {
        const select = document.getElementById('capaLinkedNc');
        if (!select) return;
        const ncs = this.getNonconformities();
        select.innerHTML = '<option value="">None</option>' + ncs.map(nc => `<option value="${nc.id}">${Utils.escapeHtml(nc.title)}</option>`).join('');
    }

    openCapaModal(id = null) {
        this.editingCapaId = id;
        const form = document.getElementById('capaForm');
        form.reset();
        this.populateNcSelect();
        if (id) {
            const r = storage.getById('capaRecords', id);
            if (!r) return;
            document.getElementById('capaModalTitle').textContent = 'Edit CAPA';
            document.getElementById('capaTitle').value = r.title;
            document.getElementById('capaType').value = r.type;
            document.getElementById('capaLinkedNc').value = r.linkedNonconformityId || '';
            document.getElementById('capaDescription').value = r.description;
            document.getElementById('capaResponsible').value = r.responsiblePerson || '';
            document.getElementById('capaDueDate').value = r.dueDate || '';
            document.getElementById('capaStatus').value = r.status;
            document.getElementById('capaEffectiveness').value = r.effectivenessCheck || '';
            document.getElementById('capaComments').value = r.comments || '';
        } else {
            document.getElementById('capaModalTitle').textContent = 'Add CAPA';
            document.getElementById('capaStatus').value = 'Open';
        }
        document.getElementById('capaModal').style.display = 'flex';
    }

    closeCapaModal() {
        document.getElementById('capaModal').style.display = 'none';
        this.editingCapaId = null;
    }

    saveCapa() {
        const data = {
            title: document.getElementById('capaTitle').value.trim(),
            type: document.getElementById('capaType').value,
            linkedNonconformityId: document.getElementById('capaLinkedNc').value,
            description: document.getElementById('capaDescription').value.trim(),
            responsiblePerson: document.getElementById('capaResponsible').value.trim(),
            dueDate: document.getElementById('capaDueDate').value,
            status: document.getElementById('capaStatus').value,
            effectivenessCheck: document.getElementById('capaEffectiveness').value.trim(),
            comments: document.getElementById('capaComments').value.trim()
        };

        if (!data.title || !data.responsiblePerson || !data.dueDate) {
            showToast('Title, responsible person, and due date are required', 'error');
            return;
        }

        try {
            if (this.editingCapaId) {
                if (data.status === 'Completed') data.completedDate = new Date().toISOString();
                storage.update('capaRecords', this.editingCapaId, data);
                showToast('CAPA updated', 'success');
            } else {
                storage.create('capaRecords', data);
                showToast('CAPA created', 'success');
            }
            this.closeCapaModal();
            this.renderCapa();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteCapa(id) {
        if (!confirm('Delete this CAPA record?')) return;
        storage.delete('capaRecords', id);
        showToast('CAPA deleted', 'success');
        this.renderCapa();
    }

    // ==================== RISK MANAGEMENT ====================
    getRisks() {
        return storage.getAll('riskRegister') || [];
    }

    riskLevel(score) {
        if (score >= 15) return { label: 'Critical', color: 'var(--danger)' };
        if (score >= 9) return { label: 'High', color: '#c0392b' };
        if (score >= 4) return { label: 'Medium', color: '#856404' };
        return { label: 'Low', color: 'var(--success)' };
    }

    renderRisk() {
        const risks = [...this.getRisks()].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));

        const statsEl = document.getElementById('riskStats');
        if (statsEl) {
            const critical = risks.filter(r => r.likelihood * r.impact >= 15 && r.status !== 'Closed').length;
            const high = risks.filter(r => { const s = r.likelihood * r.impact; return s >= 9 && s < 15 && r.status !== 'Closed'; }).length;
            statsEl.innerHTML = `
                <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem;">
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--danger);">${critical}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Critical Risks (Active)</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:#c0392b;">${high}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">High Risks (Active)</div></div>
                        <div style="text-align:center;"><div style="font-size:var(--text-2xl); font-weight:700; color:var(--gray-700);">${risks.length}</div><div style="font-size:var(--text-sm); color:var(--gray-600);">Total in Register</div></div>
                    </div>
                </div>`;
        }

        const tbody = document.getElementById('riskTableBody');
        if (!tbody) return;
        if (risks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:2rem;">No risks logged yet</td></tr>`;
            return;
        }
        const statusBadge = { 'Active': 'badge-danger', 'Mitigated': 'badge-warning', 'Closed': 'badge-success' };
        tbody.innerHTML = risks.map(r => {
            const score = r.likelihood * r.impact;
            const level = this.riskLevel(score);
            return `
            <tr>
                <td><strong>${Utils.escapeHtml(r.riskTitle)}</strong></td>
                <td>${Utils.escapeHtml(r.category)}</td>
                <td>${r.likelihood}</td>
                <td>${r.impact}</td>
                <td><span style="font-weight:700; color:${level.color};">${score} (${level.label})</span></td>
                <td>${Utils.escapeHtml(r.owner || '-')}</td>
                <td><span class="badge ${statusBadge[r.status]}">${Utils.escapeHtml(r.status)}</span></td>
                <td class="actions">
                    <button class="edit-btn" title="Edit" onclick="qmsExtended.openRiskModal('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" title="Delete" onclick="qmsExtended.deleteRisk('${r.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    updateRiskPreview() {
        const likelihood = parseInt(document.getElementById('riskLikelihood').value) || 1;
        const impact = parseInt(document.getElementById('riskImpact').value) || 1;
        const score = likelihood * impact;
        const level = this.riskLevel(score);
        const preview = document.getElementById('riskScorePreview');
        if (preview) preview.innerHTML = `Risk Score: <strong style="color:${level.color};">${score} (${level.label})</strong>`;
    }

    openRiskModal(id = null) {
        this.editingRiskId = id;
        const form = document.getElementById('riskForm');
        form.reset();
        if (id) {
            const r = storage.getById('riskRegister', id);
            if (!r) return;
            document.getElementById('riskModalTitle').textContent = 'Edit Risk';
            document.getElementById('riskTitle').value = r.riskTitle;
            document.getElementById('riskCategory').value = r.category;
            document.getElementById('riskDescription').value = r.description || '';
            document.getElementById('riskLikelihood').value = r.likelihood;
            document.getElementById('riskImpact').value = r.impact;
            document.getElementById('riskMitigation').value = r.mitigation || '';
            document.getElementById('riskOwner').value = r.owner || '';
            document.getElementById('riskReviewDate').value = r.reviewDate || '';
            document.getElementById('riskStatus').value = r.status;
        } else {
            document.getElementById('riskModalTitle').textContent = 'Add Risk';
            document.getElementById('riskLikelihood').value = 3;
            document.getElementById('riskImpact').value = 3;
            document.getElementById('riskStatus').value = 'Active';
        }
        this.updateRiskPreview();
        document.getElementById('riskModal').style.display = 'flex';
    }

    closeRiskModal() {
        document.getElementById('riskModal').style.display = 'none';
        this.editingRiskId = null;
    }

    saveRisk() {
        const data = {
            riskTitle: document.getElementById('riskTitle').value.trim(),
            category: document.getElementById('riskCategory').value,
            description: document.getElementById('riskDescription').value.trim(),
            likelihood: parseInt(document.getElementById('riskLikelihood').value) || 1,
            impact: parseInt(document.getElementById('riskImpact').value) || 1,
            mitigation: document.getElementById('riskMitigation').value.trim(),
            owner: document.getElementById('riskOwner').value.trim(),
            reviewDate: document.getElementById('riskReviewDate').value,
            status: document.getElementById('riskStatus').value
        };

        if (!data.riskTitle) {
            showToast('Risk title is required', 'error');
            return;
        }

        try {
            if (this.editingRiskId) {
                storage.update('riskRegister', this.editingRiskId, data);
                showToast('Risk updated', 'success');
            } else {
                storage.create('riskRegister', data);
                showToast('Risk added to register', 'success');
            }
            this.closeRiskModal();
            this.renderRisk();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    }

    deleteRisk(id) {
        if (!confirm('Remove this risk from the register?')) return;
        storage.delete('riskRegister', id);
        showToast('Risk removed', 'success');
        this.renderRisk();
    }
}

let qmsExtended;
document.addEventListener('DOMContentLoaded', function () {
    qmsExtended = new QMSExtendedManager();
    window.qmsExtended = qmsExtended;
});
