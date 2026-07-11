/**
 * ======================================================
 * AGPHL LIS - Notification Center
 * Version: 1.0
 *
 * Aggregates actionable alerts from across the system into
 * one panel: training due, calibration due, maintenance
 * due, QC failures, critical results, reagent expiry,
 * document (SOP) review due, staff license expiry, and
 * CAPA due dates. Dismissed notifications are remembered
 * per-browser so they don't reappear until the underlying
 * condition changes.
 * ======================================================
 */

class NotificationCenter {
    constructor() {
        this.dismissedKey = 'agphl_dismissedNotifications';
        this.init();
    }

    init() {
        const btn = document.getElementById('notificationBtn');
        const panel = document.getElementById('notificationPanel');
        if (!btn || !panel) return;

        // Ask permission once so genuinely new critical/warning items can
        // surface as real OS-level desktop notifications, not just the
        // in-app badge/panel (which the person might not be looking at).
        if (window.Notification && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) this.render();
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== btn) {
                panel.style.display = 'none';
            }
        });

        document.getElementById('notificationClearBtn')?.addEventListener('click', () => this.dismissAll());

        this.render();
        setInterval(() => this.render(), 5 * 60 * 1000);
    }

    getNotifiedKeys() {
        try {
            return JSON.parse(window.storage?.storage.getItem('agphl_notifiedKeys') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Fire a real desktop notification for any critical/warning item this
     * browser hasn't already shown, so alerts get seen even when the
     * person isn't looking at the notification panel. Falls back silently
     * if the browser doesn't support/allow Notification (e.g. no
     * permission, or opened over file://) - the in-app panel still works.
     */
    fireDesktopNotifications(notifications) {
        if (!window.Notification || Notification.permission !== 'granted') return;

        const alreadyNotified = new Set(this.getNotifiedKeys());
        const fresh = notifications.filter(n => (n.severity === 'critical' || n.severity === 'warning') && !alreadyNotified.has(n.key));
        if (fresh.length === 0) return;

        fresh.slice(0, 5).forEach(n => {
            try {
                const notif = new Notification(`AGPHL LIS - ${n.category}`, {
                    body: n.message,
                    tag: n.key,
                    icon: undefined
                });
                notif.onclick = () => {
                    window.focus();
                    if (window.navigateTo) navigateTo(n.page);
                    notif.close();
                };
            } catch {
                // Notification constructor can throw in some contexts
                // (e.g. inside certain sandboxed iframes) - ignore.
            }
        });

        const updated = [...alreadyNotified, ...fresh.map(n => n.key)];
        window.storage?.storage.setItem('agphl_notifiedKeys', JSON.stringify(updated.slice(-500)));
    }

    getDismissed() {
        try {
            return JSON.parse(window.storage?.storage.getItem(this.dismissedKey) || '[]');
        } catch {
            return [];
        }
    }

    dismiss(key) {
        const dismissed = this.getDismissed();
        if (!dismissed.includes(key)) dismissed.push(key);
        window.storage?.storage.setItem(this.dismissedKey, JSON.stringify(dismissed));
        this.render();
    }

    dismissAll() {
        const all = this.getAllNotifications().map(n => n.key);
        window.storage?.storage.setItem(this.dismissedKey, JSON.stringify(all));
        this.render();
    }

    daysUntil(dateStr) {
        return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    }

    getAllNotifications() {
        const items = [];
        const push = (category, severity, message, key, page) => {
            items.push({ category, severity, message, key, page });
        };

        (storage.getAll('criticalAlerts') || []).filter(a => a.status === 'Open').forEach(a =>
            push('Critical Result', 'critical', `Critical value: ${a.patientName || 'Unknown patient'} - ${a.tests || ''}`.trim(), `critical-${a.id}`, 'results'));

        (storage.getAll('iqc') || []).filter(i => i.inControl === false).forEach(i =>
            push('QC Failure', 'critical', `IQC out of control: ${i.testName || 'Unknown test'}`, `iqc-${i.id}`, 'iqc'));
        (storage.getAll('eqa') || []).filter(e => e.status === 'Failed').forEach(e =>
            push('QC Failure', 'warning', `EQA failed: ${e.eqaType || 'Unknown scheme'}`, `eqa-${e.id}`, 'eqa'));

        (storage.getAll('inventory') || []).forEach(item => {
            if (!item.expiryDate) return;
            const days = this.daysUntil(item.expiryDate);
            if (days < 0) push('Reagent Expiry', 'critical', `${item.name || 'Item'} expired ${Math.abs(days)} day(s) ago`, `inv-exp-${item.id}`, 'inventory');
            else if (days <= 30) push('Reagent Expiry', 'warning', `${item.name || 'Item'} expires in ${days} day(s)`, `inv-exp-${item.id}`, 'inventory');
            if (typeof item.quantity === 'number' && typeof item.reorderLevel === 'number' && item.quantity <= item.reorderLevel) {
                push('Low Stock', 'warning', `${item.name || 'Item'} is at or below reorder level (${item.quantity} left)`, `inv-low-${item.id}`, 'inventory');
            }
        });

        (storage.getAll('sop') || []).filter(s => s.status === 'Active' && s.reviewDate).forEach(s => {
            const days = this.daysUntil(s.reviewDate);
            if (days < 0) push('Document Review', 'critical', `SOP "${s.title || s.sopNumber || 'Untitled'}" review overdue`, `sop-${s.id}`, 'sop');
            else if (days <= 30) push('Document Review', 'warning', `SOP "${s.title || s.sopNumber || 'Untitled'}" review due in ${days} day(s)`, `sop-${s.id}`, 'sop');
        });

        (storage.getAll('capaRecords') || []).filter(c => c.status !== 'Completed' && c.dueDate).forEach(c => {
            const days = this.daysUntil(c.dueDate);
            if (days < 0) push('CAPA Due', 'critical', `CAPA "${c.title}" is overdue`, `capa-${c.id}`, 'capa');
            else if (days <= 14) push('CAPA Due', 'warning', `CAPA "${c.title}" due in ${days} day(s)`, `capa-${c.id}`, 'capa');
        });

        (storage.getAll('equipmentCalibration') || []).filter(c => c.nextDueDate).forEach(c => {
            const days = this.daysUntil(c.nextDueDate);
            const name = window.equipmentManager?.equipName ? equipmentManager.equipName(c.equipmentId) : 'Equipment';
            if (days < 0) push('Calibration Due', 'critical', `${name} calibration overdue`, `cal-${c.id}`, 'equipment');
            else if (days <= 30) push('Calibration Due', 'warning', `${name} calibration due in ${days} day(s)`, `cal-${c.id}`, 'equipment');
        });

        (storage.getAll('equipmentMaintenance') || []).filter(m => m.status !== 'Completed' && m.scheduledDate).forEach(m => {
            const days = this.daysUntil(m.scheduledDate);
            const name = window.equipmentManager?.equipName ? equipmentManager.equipName(m.equipmentId) : 'Equipment';
            if (days < 0) push('Maintenance Due', 'critical', `${name} maintenance overdue`, `maint-${m.id}`, 'equipment');
            else if (days <= 14) push('Maintenance Due', 'warning', `${name} maintenance due in ${days} day(s)`, `maint-${m.id}`, 'equipment');
        });

        (storage.getAll('staffTrainings') || []).filter(t => t.status === 'Scheduled' && t.scheduledDate).forEach(t => {
            const days = this.daysUntil(t.scheduledDate);
            if (days < 0) push('Training Due', 'warning', `Training "${t.title}" is overdue`, `train-${t.id}`, 'staff');
            else if (days <= 7) push('Training Due', 'info', `Training "${t.title}" scheduled in ${days} day(s)`, `train-${t.id}`, 'staff');
        });

        (storage.getAll('staffMembers') || []).filter(s => s.licenseExpiry).forEach(s => {
            const days = this.daysUntil(s.licenseExpiry);
            if (days < 0) push('License Expiry', 'critical', `${s.fullName}'s professional license expired`, `lic-${s.id}`, 'staff');
            else if (days <= 60) push('License Expiry', 'warning', `${s.fullName}'s professional license expires in ${days} day(s)`, `lic-${s.id}`, 'staff');
        });

        (storage.getAll('competencyRecords') || []).filter(c => c.nextDueDate).forEach(c => {
            const days = this.daysUntil(c.nextDueDate);
            if (days < 0) push('Competency Due', 'warning', `${c.staffName}'s "${c.competencyArea}" reassessment overdue`, `comp-${c.id}`, 'staff');
        });

        const dismissed = new Set(this.getDismissed());
        return items.filter(i => !dismissed.has(i.key));
    }

    render() {
        const badge = document.getElementById('notificationBadge');
        const body = document.getElementById('notificationPanelBody');
        const notifications = this.getAllNotifications();
        this.fireDesktopNotifications(notifications);

        if (badge) {
            badge.textContent = notifications.length;
            badge.style.display = notifications.length > 0 ? 'flex' : 'none';
        }

        if (!body) return;

        if (notifications.length === 0) {
            body.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--gray-400); font-size:var(--text-sm);">No active notifications</div>`;
            return;
        }

        const order = { critical: 0, warning: 1, info: 2 };
        notifications.sort((a, b) => order[a.severity] - order[b.severity]);
        const icon = { critical: '🔴', warning: '🟠', info: '🔵' };

        body.innerHTML = notifications.map(n => `
            <div class="notification-item" onclick="navigateTo('${n.page}')">
                <span class="notification-icon">${icon[n.severity]}</span>
                <div class="notification-text">
                    <div class="notification-category">${Utils.escapeHtml(n.category)}</div>
                    <div class="notification-message">${Utils.escapeHtml(n.message)}</div>
                </div>
                <button class="notification-dismiss" title="Dismiss" onclick="event.stopPropagation(); notificationCenter.dismiss('${n.key}')">&times;</button>
            </div>`).join('');
    }
}

let notificationCenter;
document.addEventListener('DOMContentLoaded', function () {
    notificationCenter = new NotificationCenter();
    window.notificationCenter = notificationCenter;
});
