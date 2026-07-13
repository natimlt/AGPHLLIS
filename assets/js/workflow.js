/**
 * ======================================================
 * AGPHL LIS - Workflow Tracking Module
 * Version: 1.0
 *
 * Visualizes every active sample's progress through the
 * laboratory pipeline (Registration -> Collection ->
 * Reception -> Testing -> Result Entry -> Verification ->
 * Report Release) as a stage progress bar, flags samples
 * that have been sitting in a stage longer than expected,
 * and reuses the existing sample timeline detail view.
 * ======================================================
 */

class WorkflowManager {
    constructor() {
        this.deptFilter = '';
        this.searchTerm = '';
        this.showArchived = false;
        // Maps the LIS's actual sample.status values onto the ISO-style
        // pipeline stages requested in the spec, since the sample model
        // doesn't track "Acceptance" or "Clinical Authorization" as
        // distinct statuses - Received covers Reception+Acceptance and
        // Verified covers Technical Verification+Clinical Authorization.
        this.stages = [
            { key: 'Registered', label: 'Registration' },
            { key: 'Collected', label: 'Collection' },
            { key: 'Received', label: 'Reception/Acceptance' },
            { key: 'Completed', label: 'Testing/Result Entry' },
            { key: 'Verified', label: 'Verification/Release' }
        ];
        // Expected max hours in each stage before flagging a delay
        this.stageTargetHours = { Registered: 1, Collected: 2, Received: 4, Completed: 24, Verified: 0 };
        this.init();
    }

    init() {
        if (!document.getElementById('workflowPage')) return;
        this.setupEventListeners();
        this.render();
        document.addEventListener('lis:navigate', (e) => {
            if (e.detail.page === 'workflow') this.render();
        });
    }

    setupEventListeners() {
        document.getElementById('workflowDeptFilter')?.addEventListener('change', (e) => {
            this.deptFilter = e.target.value;
            this.render();
        });
        document.getElementById('workflowSearch')?.addEventListener('input', Utils.debounce((e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.render();
        }, 250));
        document.getElementById('workflowShowArchived')?.addEventListener('change', (e) => {
            this.showArchived = e.target.checked;
            this.render();
        });
    }

    stageIndex(status) {
        const idx = this.stages.findIndex(s => s.key === status);
        return idx === -1 ? 0 : idx;
    }

    getSamples() {
        let samples = storage.getAllScoped('samples') || [];
        if (!this.showArchived) {
            samples = samples.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled');
        }
        if (this.deptFilter) samples = samples.filter(s => s.department === this.deptFilter);
        if (this.searchTerm) {
            samples = samples.filter(s =>
                (s.labNumber || '').toLowerCase().includes(this.searchTerm) ||
                (s.id || '').toLowerCase().includes(this.searchTerm)
            );
        }
        return samples.sort((a, b) => new Date(b.createdAt || b.collectionDate) - new Date(a.createdAt || a.collectionDate)).slice(0, 60);
    }

    render() {
        this.populateFilters();
        const samples = this.getSamples();
        this.renderStats(samples);
        this.renderCards(samples);
    }

    populateFilters() {
        const select = document.getElementById('workflowDeptFilter');
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

    getStageDelay(sample) {
        if (sample.status === 'Rejected' || sample.status === 'Cancelled') return null;
        const timeline = sample.timeline || [];
        const lastEntry = timeline[timeline.length - 1];
        const enteredStageAt = lastEntry ? new Date(lastEntry.timestamp) : new Date(sample.createdAt);
        const hoursInStage = (new Date() - enteredStageAt) / 3600000;
        const target = this.stageTargetHours[sample.status] ?? 0;
        return { hoursInStage, target, delayed: target > 0 && hoursInStage > target };
    }

    renderStats(samples) {
        const container = document.getElementById('workflowStats');
        if (!container) return;
        const delayed = samples.filter(s => this.getStageDelay(s)?.delayed).length;
        const inTesting = samples.filter(s => s.status === 'Received').length;
        const awaitingVerification = samples.filter(s => s.status === 'Completed').length;

        const block = (value, label, color) => `
            <div style="text-align:center; padding:1rem; background:var(--gray-50); border-radius:var(--radius-sm);">
                <div style="font-size:var(--text-2xl); font-weight:700; color:${color};">${value}</div>
                <div style="font-size:var(--text-sm); color:var(--gray-600);">${label}</div>
            </div>`;

        container.innerHTML = `
            <div class="card" style="padding:1.25rem; margin-bottom:1rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:1rem;">
                    ${block(samples.length, 'Active in Pipeline', 'var(--gray-700)')}
                    ${block(inTesting, 'In Testing', 'var(--info)')}
                    ${block(awaitingVerification, 'Awaiting Verification', '#856404')}
                    ${block(delayed, 'Delayed (over target)', delayed > 0 ? 'var(--danger)' : 'var(--success)')}
                </div>
            </div>`;
    }

    renderCards(samples) {
        const container = document.getElementById('workflowCards');
        if (!container) return;

        if (samples.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧪</div><h3>No samples to track</h3><p>Try adjusting the filters above</p></div>`;
            return;
        }

        container.innerHTML = samples.map(s => {
            const patient = storage.getById('patients', s.patientId);
            const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown';
            const currentIdx = this.stageIndex(s.status);
            const delay = this.getStageDelay(s);
            const isTerminal = s.status === 'Rejected' || s.status === 'Cancelled';

            const dots = this.stages.map((stage, i) => {
                let cls = 'workflow-dot';
                if (isTerminal) cls += ' workflow-dot-terminal';
                else if (i < currentIdx) cls += ' workflow-dot-done';
                else if (i === currentIdx) cls += ' workflow-dot-current';
                return `<div class="workflow-stage">
                    <div class="${cls}" title="${stage.label}"></div>
                    <div class="workflow-stage-label">${stage.label}</div>
                </div>`;
            }).join('<div class="workflow-connector"></div>');

            return `
            <div class="card workflow-card" style="padding:1.25rem; margin-bottom:1rem; cursor:pointer;" onclick="sampleManager.viewSample('${s.id}')">
                <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
                    <div>
                        <strong>${Utils.escapeHtml(s.labNumber || s.id)}</strong> - ${Utils.escapeHtml(Utils.truncate(patientName, 25))}
                        <div style="font-size:var(--text-xs); color:var(--gray-400);">${Utils.escapeHtml(s.department || '-')} &middot; <span class="badge badge-secondary">${Utils.escapeHtml(s.priority || 'Routine')}</span></div>
                    </div>
                    <div>
                        ${isTerminal ? `<span class="badge badge-secondary">${Utils.escapeHtml(s.status)}</span>` : ''}
                        ${delay?.delayed ? `<span class="badge badge-danger" title="Longer than expected in this stage">Delayed ${Math.round(delay.hoursInStage)}h</span>` : ''}
                    </div>
                </div>
                <div class="workflow-track">${dots}</div>
            </div>`;
        }).join('');
    }
}

let workflowManager;
document.addEventListener('DOMContentLoaded', function () {
    workflowManager = new WorkflowManager();
    window.workflowManager = workflowManager;
});
