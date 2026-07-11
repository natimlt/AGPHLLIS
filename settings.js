/**
 * ======================================================
 * AGPHL LIS - Settings Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class SettingsManager {
    constructor() {
        this.settings = {};
        this.backupHistory = [];
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.loadTheme();
        this.loadLogo();
        this.renderBackupHistory();
        this.setupNavigation();
    }

    loadSettings() {
        const settings = storage.getById('settings', 'system');
        if (settings) {
            this.settings = settings;
        } else {
            this.settings = {
                id: 'system',
                hospitalName: 'Agew Gimjabet Primary Hospital',
                hospitalAddress: 'Agew Gimjabet, Ethiopia',
                hospitalPhone: '+251-900-000-000',
                hospitalEmail: 'info@agphl.com',
                laboratoryName: 'AGPHL Laboratory',
                laboratoryCode: 'AGPHL-001',
                theme: 'light',
                language: 'en',
                currency: 'ETB',
                timezone: 'Africa/Addis_Ababa',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                createdAt: new Date().toISOString()
            };
            storage.create('settings', this.settings);
        }
        this.populateForm();
    }

    populateForm() {
        const fields = {
            hospitalName: document.getElementById('hospitalName'),
            hospitalAddress: document.getElementById('hospitalAddress'),
            hospitalPhone: document.getElementById('hospitalPhone'),
            hospitalEmail: document.getElementById('hospitalEmail'),
            laboratoryName: document.getElementById('laboratoryName'),
            laboratoryCode: document.getElementById('laboratoryCode'),
            currency: document.getElementById('currency'),
            timezone: document.getElementById('timezone'),
            dateFormat: document.getElementById('dateFormat'),
            timeFormat: document.getElementById('timeFormat')
        };

        for (const [key, element] of Object.entries(fields)) {
            if (element && this.settings[key] !== undefined) {
                element.value = this.settings[key];
            }
        }
    }

    setupEventListeners() {
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
            });
        });

        const logoUpload = document.getElementById('logoUpload');
        if (logoUpload) {
            logoUpload.addEventListener('change', (e) => {
                this.handleLogoUpload(e);
            });
        }

        const removeLogoBtn = document.getElementById('removeLogoBtn');
        if (removeLogoBtn) {
            removeLogoBtn.addEventListener('click', () => {
                this.removeLogo();
            });
        }

        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }

        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', () => {
                document.getElementById('restoreFileInput').click();
            });
        }

        const restoreFileInput = document.getElementById('restoreFileInput');
        if (restoreFileInput) {
            restoreFileInput.addEventListener('change', (e) => {
                this.restoreBackup(e);
            });
        }

        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.clearAllData();
            });
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                document.getElementById('importFileInput').click();
            });
        }

        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                this.importData(e);
            });
        }

        const aboutVersion = document.getElementById('aboutVersion');
        if (aboutVersion) aboutVersion.textContent = '1.0';
        
        const aboutDeveloper = document.getElementById('aboutDeveloper');
        if (aboutDeveloper) aboutDeveloper.textContent = 'Asrat Genet';
        
        const aboutHospital = document.getElementById('aboutHospital');
        if (aboutHospital) aboutHospital.textContent = this.settings.hospitalName || 'Agew Gimjabet Primary Hospital';
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.settings-nav a');
        const sections = document.querySelectorAll('.settings-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.target;

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                sections.forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(target);
                if (targetSection) {
                    targetSection.classList.add('active');
                }

                history.pushState(null, '', `#${target}`);
            });
        });

        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const link = document.querySelector(`.settings-nav a[data-target="${hash}"]`);
            if (link) link.click();
        }
    }

    saveSettings() {
        const data = {
            hospitalName: document.getElementById('hospitalName').value.trim(),
            hospitalAddress: document.getElementById('hospitalAddress').value.trim(),
            hospitalPhone: document.getElementById('hospitalPhone').value.trim(),
            hospitalEmail: document.getElementById('hospitalEmail').value.trim(),
            laboratoryName: document.getElementById('laboratoryName').value.trim(),
            laboratoryCode: document.getElementById('laboratoryCode').value.trim(),
            currency: document.getElementById('currency').value || 'ETB',
            timezone: document.getElementById('timezone').value || 'Africa/Addis_Ababa',
            dateFormat: document.getElementById('dateFormat').value || 'YYYY-MM-DD',
            timeFormat: document.getElementById('timeFormat').value || 'HH:mm',
            updatedAt: new Date().toISOString()
        };

        try {
            storage.update('settings', 'system', data);
            this.settings = { ...this.settings, ...data };
            showToast('Settings saved successfully!', 'success');
            this.updateFooterInfo();
        } catch (error) {
            showToast('Error saving settings: ' + error.message, 'error');
        }
    }

    updateFooterInfo() {
        const footerCenter = document.querySelector('.footer-center');
        if (footerCenter && this.settings.hospitalName) {
            footerCenter.innerHTML = `<span>${this.settings.hospitalName}</span>`;
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || this.settings.theme || 'light';
        this.setTheme(savedTheme, false);
    }

    setTheme(theme, save = true) {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${theme}-mode`);

        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark'
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                   </svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                   </svg>`;
        }

        if (save) {
            localStorage.setItem('theme', theme);
            if (this.settings) {
                storage.update('settings', 'system', { theme: theme });
                this.settings.theme = theme;
            }
        }
    }

    loadLogo() {
        const logoData = localStorage.getItem('hospitalLogo');
        const preview = document.getElementById('logoPreview');
        
        if (logoData && preview) {
            preview.innerHTML = `<img src="${logoData}" alt="Hospital Logo">`;
        } else if (preview) {
            preview.innerHTML = `<div class="placeholder">🏥</div>`;
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'warning');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size must be less than 2MB', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem('hospitalLogo', dataUrl);
            this.loadLogo();
            showToast('Logo uploaded successfully!', 'success');
        };
        reader.onerror = () => {
            showToast('Error reading file', 'error');
        };
        reader.readAsDataURL(file);
    }

    removeLogo() {
        if (!confirm('Remove the hospital logo?')) return;
        localStorage.removeItem('hospitalLogo');
        this.loadLogo();
        showToast('Logo removed', 'info');
    }

    renderBackupHistory() {
        const container = document.getElementById('backupHistory');
        if (!container) return;

        this.backupHistory = storage.getAll('backups') || [];

        if (this.backupHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 1rem;">
                    <p style="color: var(--gray-500); font-size: var(--text-sm);">No backups found. Create your first backup.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.backupHistory.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <span class="backup-name">${backup.name}</span>
                    <span class="backup-date">${Utils.formatDate(backup.createdAt)}</span>
                    <span class="backup-size">${Utils.formatFileSize(backup.size || 0)}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-danger" onclick="settingsManager.deleteBackup('${backup.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    createBackup() {
        try {
            const allData = {};
            const prefix = storage.prefix;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const value = localStorage.getItem(key);
                    try {
                        allData[key] = JSON.parse(value);
                    } catch {
                        allData[key] = value;
                    }
                }
            }

            const jsonData = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            const filename = `agphl_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            const backup = {
                name: filename,
                size: blob.size,
                createdAt: new Date().toISOString()
            };
            storage.create('backups', backup);
            
            this.backupHistory.push(backup);
            this.renderBackupHistory();
            
            showToast('Backup created successfully!', 'success');
        } catch (error) {
            showToast('Error creating backup: ' + error.message, 'error');
        }
    }

    restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showToast('Please select a JSON backup file', 'warning');
            return;
        }

        if (!confirm(`Restore backup from ${file.name}? This will overwrite all current data.`)) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let count = 0;
                
                for (const [key, value] of Object.entries(data)) {
                    if (key.startsWith(storage.prefix)) {
                        localStorage.setItem(key, JSON.stringify(value));
                        count++;
                    }
                }
                
                showToast(`Restored ${count} items from backup!`, 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                showToast('Error restoring backup: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    deleteBackup(id) {
        if (!confirm('Delete this backup record?')) return;
        storage.delete('backups', id);
        this.backupHistory = this.backupHistory.filter(b => b.id !== id);
        this.renderBackupHistory();
        showToast('Backup record deleted', 'success');
    }

    exportData() {
        try {
            const allData = {};
            const prefix = storage.prefix;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const value = localStorage.getItem(key);
                    try {
                        allData[key] = JSON.parse(value);
                    } catch {
                        allData[key] = value;
                    }
                }
            }

            const jsonData = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            const filename = `agphl_data_export_${new Date().toISOString().split('T')[0]}.json`;
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showToast('Data exported successfully!', 'success');
        } catch (error) {
            showToast('Error exporting data: ' + error.message, 'error');
        }
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showToast('Please select a JSON file', 'warning');
            return;
        }

        if (!confirm('Import data? This will merge with existing data.')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let count = 0;
                
                for (const [key, value] of Object.entries(data)) {
                    if (key.startsWith(storage.prefix)) {
                        const existing = localStorage.getItem(key);
                        if (existing) {
                            const existingData = JSON.parse(existing);
                            const merged = this.mergeData(existingData, value);
                            localStorage.setItem(key, JSON.stringify(merged));
                        } else {
                            localStorage.setItem(key, JSON.stringify(value));
                        }
                        count++;
                    }
                }
                
                showToast(`Imported ${count} items successfully!`, 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                showToast('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    mergeData(existing, incoming) {
        if (Array.isArray(existing) && Array.isArray(incoming)) {
            const existingIds = new Set(existing.map(item => item.id));
            const merged = [...existing];
            for (const item of incoming) {
                if (!existingIds.has(item.id)) {
                    merged.push(item);
                }
            }
            return merged;
        }
        return { ...existing, ...incoming };
    }

    clearAllData() {
        const modal = document.getElementById('confirmModal');
        const confirmMsg = document.getElementById('confirmMessage');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmBtn = document.getElementById('confirmBtn');

        if (modal) {
            confirmTitle.textContent = '⚠️ Clear All Data';
            confirmMsg.innerHTML = `
                <p style="color: var(--danger); font-weight: 600;">WARNING: This action cannot be undone!</p>
                <p>Are you sure you want to delete ALL data from the system?</p>
                <p style="font-size: var(--text-sm); color: var(--gray-500);">This includes all patients, samples, results, and settings.</p>
            `;
            modal.style.display = 'flex';

            confirmBtn.onclick = () => {
                try {
                    const prefix = storage.prefix;
                    const keys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(prefix)) {
                            keys.push(key);
                        }
                    }
                    for (const key of keys) {
                        localStorage.removeItem(key);
                    }
                    
                    showToast('All data cleared successfully', 'info');
                    closeConfirm();
                    
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } catch (error) {
                    showToast('Error clearing data: ' + error.message, 'error');
                }
            };
        }
    }
}

let settingsManager;

document.addEventListener('DOMContentLoaded', function() {
    settingsManager = new SettingsManager();
    window.settingsManager = settingsManager;
});