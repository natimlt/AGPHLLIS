/**
 * ======================================================
 * AGPHL LIS - Dashboard Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class DashboardManager {
    constructor() {
        this.stats = {
            totalPatients: 0,
            todaySamples: 0,
            pendingResults: 0,
            completedResults: 0,
            rejectedSamples: 0,
            qualityAlerts: 0
        };
        this.activities = [];
        this.charts = {};
        this.init();
    }

    init() {
        this.loadStats();
        this.loadActivities();
        this.renderCharts();
        this.setupQuickActions();
        this.startClock();
        this.setupWelcomeBanner();
        this.setupRealTimeUpdates();
    }

    loadStats() {
        try {
            const patients = storage.getAllScoped('patients') || [];
            this.stats.totalPatients = patients.length;

            const today = new Date().toISOString().split('T')[0];
            const samples = storage.getAllScoped('samples') || [];
            this.stats.todaySamples = samples.filter(s => 
                s.collectionDate?.startsWith(today)
            ).length;

            this.stats.pendingResults = samples.filter(s => 
                s.status === 'Processing' || s.status === 'Registered' || s.status === 'Received'
            ).length;
            this.stats.completedResults = samples.filter(s => 
                s.status === 'Completed' || s.status === 'Verified'
            ).length;

            this.stats.rejectedSamples = samples.filter(s => 
                s.status === 'Rejected'
            ).length;

            // Quality alerts = IQC runs flagged out-of-control + EQA rounds marked Failed
            // + open critical-value alerts. (Previously this read a 'qualityAlerts'
            // collection that nothing ever wrote to, so this stat and its notification
            // badge were always 0. Critical-value alerts in particular were being
            // created by results.js on every panic value but never read back anywhere.)
            const iqcRecords = storage.getAll('iqc') || [];
            const eqaRecords = storage.getAll('eqa') || [];
            const criticalAlerts = storage.getAll('criticalAlerts') || [];
            const outOfControlIQC = iqcRecords.filter(i => i.inControl === false).length;
            const failedEQA = eqaRecords.filter(e => e.status === 'Failed').length;
            const openCritical = criticalAlerts.filter(a => a.status === 'Open').length;
            this.stats.qualityAlerts = outOfControlIQC + failedEQA + openCritical;

            this.updateStatsUI();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsUI() {
        const elements = {
            totalPatients: document.getElementById('totalPatients'),
            todaySamples: document.getElementById('todaySamples'),
            pendingResults: document.getElementById('pendingResults'),
            completedResults: document.getElementById('completedResults'),
            rejectedSamples: document.getElementById('rejectedSamples'),
            qualityAlerts: document.getElementById('qualityAlerts')
        };

        for (const [key, element] of Object.entries(elements)) {
            if (element) {
                element.textContent = this.stats[key] || 0;
            }
        }

        if (this.stats.qualityAlerts > 0) {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.textContent = this.stats.qualityAlerts;
                badge.style.display = 'flex';
            }
        }
    }

    loadActivities() {
        // The 'activities' collection was never written to by any module
        // (addActivity/addPatientActivity/etc. had no callers), so this feed
        // was permanently empty. storage.js already writes an audit log entry
        // on every create/update/delete, so derive the feed from that instead -
        // it's always accurate and needs no extra wiring elsewhere.
        const audit = storage.getAll('audit') || [];
        const relevant = audit.filter(a =>
            ['patients', 'samples', 'iqc', 'eqa', 'criticalAlerts'].includes(a.collection)
        );

        this.activities = relevant
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10)
            .map(entry => this.describeAuditEntry(entry))
            .filter(Boolean);

        this.renderActivities();
    }

    /**
     * Turn a raw audit log entry into a { type, message, timestamp } activity
     * @param {Object} entry - Audit log entry from storage.js
     * @returns {Object|null} Activity descriptor, or null to skip
     */
    describeAuditEntry(entry) {
        const record = entry.action === 'UPDATE' ? entry.data?.new : entry.data;
        if (!record) return null;

        const base = { timestamp: entry.timestamp };

        switch (entry.collection) {
            case 'patients': {
                const name = `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unknown';
                return { ...base, type: 'patient',
                    message: entry.action === 'CREATE'
                        ? `Patient registered: ${name}`
                        : `Patient updated: ${name}` };
            }
            case 'samples': {
                const label = record.labNumber || 'sample';
                if (record.status === 'Rejected') {
                    return { ...base, type: 'reject', message: `Sample rejected: ${label}` };
                }
                return { ...base, type: 'sample',
                    message: entry.action === 'CREATE'
                        ? `Sample registered: ${label} (${record.specimenType || 'N/A'})`
                        : `Sample ${label} status updated to ${record.status || 'Unknown'}` };
            }
            case 'iqc': {
                if (record.inControl === false) {
                    return { ...base, type: 'alert', message: `IQC out of control: ${record.testName || 'Unknown test'}` };
                }
                return { ...base, type: 'sample', message: `IQC data recorded: ${record.testName || 'Unknown test'}` };
            }
            case 'eqa': {
                if (record.status === 'Failed') {
                    return { ...base, type: 'alert', message: `EQA failed: ${record.eqaType || 'Unknown'} (${record.facilityName || ''})`.trim() };
                }
                return null; // don't clutter the feed with routine pending/passed EQA entries
            }
            case 'criticalAlerts': {
                if (entry.action !== 'CREATE') return null;
                return { ...base, type: 'alert', message: `⚠️ Critical value: ${record.patientName || 'Unknown'} - ${record.tests || ''}`.trim() };
            }
            default:
                return null;
        }
    }

    renderActivities() {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        if (this.activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Recent Activities</h3>
                    <p>Activities will appear here as they happen</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activities.map(activity => {
            const iconMap = {
                'patient': 'blue',
                'sample': 'green',
                'alert': 'yellow',
                'reject': 'red'
            };
            const iconClass = iconMap[activity.type] || 'blue';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        ${this.getActivityIcon(activity.type)}
                    </div>
                    <div class="activity-content">
                        <p class="activity-text">${activity.message}</p>
                        <span class="activity-time">${Utils.timeAgo(activity.timestamp)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'patient': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>`,
            'sample': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
            </svg>`,
            'alert': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4m0 4h.01"/>
            </svg>`,
            'reject': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`
        };
        return icons[type] || icons.patient;
    }

    renderCharts() {
        this.renderStatusChart();
        this.renderTrendChart();
    }

    renderStatusChart() {
        const canvas = document.getElementById('statusChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const samples = storage.getAllScoped('samples') || [];
        
        const statusCounts = {};
        samples.forEach(s => {
            const status = s.status || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        const colors = ['#1a66f5', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (data.length === 0) {
            ctx.fillStyle = '#adb5bd';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const barWidth = Math.min(50, chartWidth / data.length - 10);
        const maxValue = Math.max(...data, 1);

        data.forEach((value, index) => {
            const x = padding + index * (barWidth + 10);
            const barHeight = (value / maxValue) * chartHeight;
            const y = padding + chartHeight - barHeight;

            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);

            ctx.fillStyle = '#495057';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(value, x + barWidth / 2, y - 5);

            ctx.fillStyle = '#6c757d';
            ctx.font = '10px sans-serif';
            const label = labels[index]?.substring(0, 10) || '';
            ctx.fillText(label, x + barWidth / 2, padding + chartHeight + 15);
        });
    }

    renderTrendChart() {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const samples = storage.getAllScoped('samples') || [];

        const today = new Date();
        const dates = [];
        const counts = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push(dateStr);
            
            const count = samples.filter(s => 
                s.collectionDate?.startsWith(dateStr)
            ).length;
            counts.push(count);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (counts.every(c => c === 0)) {
            ctx.fillStyle = '#adb5bd';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const maxValue = Math.max(...counts, 1);

        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#1a66f5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        counts.forEach((count, index) => {
            const x = padding + (index / (counts.length - 1)) * chartWidth;
            const y = padding + chartHeight - (count / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        counts.forEach((count, index) => {
            const x = padding + (index / (counts.length - 1)) * chartWidth;
            const y = padding + chartHeight - (count / maxValue) * chartHeight;

            ctx.fillStyle = '#1a66f5';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#495057';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(count, x, y - 10);

            ctx.fillStyle = '#6c757d';
            ctx.font = '9px sans-serif';
            const label = dates[index]?.substring(5) || '';
            ctx.fillText(label, x, padding + chartHeight + 18);
        });

        const lastX = padding + chartWidth;
        const lastY = padding + chartHeight - (counts[counts.length - 1] / maxValue) * chartHeight;
        ctx.lineTo(lastX, padding + chartHeight);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.closePath();
        ctx.fillStyle = 'rgba(26, 102, 245, 0.1)';
        ctx.fill();
    }

    setupQuickActions() {
        const registerBtn = document.getElementById('quickRegisterBtn');
        const sampleBtn = document.getElementById('quickSampleBtn');

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                navigateTo('patients');
            });
        }

        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                navigateTo('samples');
            });
        }
    }

    setupWelcomeBanner() {
        const welcomeName = document.getElementById('welcomeName');
        if (welcomeName) {
            const user = auth.getCurrentUser();
            if (user) {
                welcomeName.textContent = user.fullName || 'User';
            }
        }
    }

    startClock() {
        const clock = document.getElementById('liveClock');
        const dayEl = document.getElementById('currentDay');
        const dateEl = document.getElementById('currentDate');

        const updateClock = () => {
            const now = new Date();
            
            if (clock) {
                clock.textContent = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }

            if (dayEl) {
                dayEl.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long'
                });
            }

            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    setupRealTimeUpdates() {
        setInterval(() => {
            this.loadStats();
        }, 30000);

        setInterval(() => {
            this.loadActivities();
        }, 60000);
    }

    addActivity(type, message) {
        const activity = {
            id: Utils.generateId(),
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };

        const activities = storage.getAll('activities') || [];
        activities.unshift(activity);
        
        if (activities.length > 100) {
            activities.pop();
        }
        
        storage.storage.setItem(`${storage.prefix}activities`, JSON.stringify(activities));
        
        this.activities = activities.slice(0, 10);
        this.renderActivities();
    }

    addSampleActivity(action, sampleId) {
        this.addActivity('sample', `Sample ${action}: ${sampleId}`);
    }

    addPatientActivity(action, patientName) {
        this.addActivity('patient', `Patient ${action}: ${patientName}`);
    }

    addAlertActivity(message) {
        this.addActivity('alert', `⚠️ ${message}`);
    }
}

let dashboardManager;

document.addEventListener('DOMContentLoaded', function() {
    dashboardManager = new DashboardManager();
    window.dashboard = dashboardManager;
});