/**
 * ======================================================
 * AGPHL LIS - Sidebar Module
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * Handles sidebar navigation, toggle functionality,
 * and page routing.
 * ======================================================
 */

class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.navLinks = document.querySelectorAll('[data-page]');
        this.submenuToggles = document.querySelectorAll('[data-toggle="submenu"]');
        this.currentPage = 'dashboard';
        this.init();
    }

    /**
     * Initialize sidebar
     */
    init() {
        this.setupToggles();
        this.applyPermissions();
        this.setupNavigation();
        this.setupUserProfile();
        this.setupThemeToggle();
        this.setupSearch();
        this.setupNotifications();
        this.updateUserInfo();
        this.setupResponsive();
    }

    /**
     * Hide nav items the current user's role isn't permitted to see.
     * This is a UI convenience only - actual data access still depends
     * on each page checking auth.hasPermission() before acting, since a
     * client-only app can never fully prevent a determined user from
     * editing the DOM or calling functions directly from the console.
     */
    applyPermissions() {
        if (!window.auth) return;
        document.querySelectorAll('[data-permission]').forEach(el => {
            const permission = el.dataset.permission;
            const allowed = auth.hasPermission(permission);
            const item = el.closest('li');
            if (item) item.style.display = allowed ? '' : 'none';
        });
        // Hide submenu parents whose every child is hidden
        document.querySelectorAll('.nav-item.has-submenu').forEach(parent => {
            const items = parent.querySelectorAll('.submenu li');
            if (items.length === 0) return;
            const anyVisible = Array.from(items).some(li => li.style.display !== 'none');
            parent.style.display = anyVisible ? '' : 'none';
        });
    }

    /**
     * Setup sidebar toggle buttons
     */
    setupToggles() {
        // Hamburger button (mobile)
        if (this.hamburgerBtn) {
            this.hamburgerBtn.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
            });
        }

        // Sidebar toggle (desktop)
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('collapsed');
                document.body.classList.toggle('sidebar-collapsed');
            });
        }

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                const isSidebar = this.sidebar.contains(e.target);
                const isHamburger = this.hamburgerBtn?.contains(e.target);
                if (!isSidebar && !isHamburger) {
                    this.sidebar.classList.remove('open');
                }
            }
        });
    }

    /**
     * Setup navigation links
     */
    setupNavigation() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        // Handle submenu toggles
        this.submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const parent = toggle.closest('.nav-item');
                if (parent) {
                    parent.classList.toggle('open');
                }
            });
        });
    }

    /**
     * Navigate to a page
     * @param {string} page - Page identifier
     */
    navigateTo(page) {
        // Defense-in-depth: re-check permission at navigation time, not just
        // at initial render, in case the DOM was tampered with.
        const link = Array.from(this.navLinks).find(l => l.dataset.page === page);
        const requiredPermission = link?.dataset.permission;
        if (requiredPermission && window.auth && !auth.hasPermission(requiredPermission)) {
            if (window.showToast) showToast('You do not have permission to view that page', 'error');
            return;
        }

        this.currentPage = page;

        // Update active state in sidebar
        this.navLinks.forEach(link => {
            link.closest('.nav-item')?.classList.remove('active');
            if (link.dataset.page === page) {
                link.closest('.nav-item')?.classList.add('active');
            }
        });

        // Update submenu active state
        document.querySelectorAll('.submenu li a').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
                link.closest('.nav-item')?.classList.add('open');
            }
        });

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Dashboard',
                'patients': 'Patient Management',
                'samples': 'Sample Management',
                'results': 'Results Management',
                'workflow': 'Workflow Tracking',
                'hematology': 'Hematology',
                'chemistry': 'Clinical Chemistry',
                'microbiology': 'Microbiology',
                'bloodbank': 'Blood Bank',
                'serology': 'Serology',
                'parasitology': 'Parasitology',
                'urinalysis': 'Urinalysis',
                'quality-dashboard': 'Quality Dashboard',
                'qi': 'Quality Indicators',
                'iqc': 'Internal Quality Control',
                'eqa': 'External Quality Assessment',
                'sop': 'SOP Management',
                'nonconformity': 'Nonconformity Management',
                'capa': 'CAPA Management',
                'risk': 'Risk Management',
                'audit': 'Internal Audit',
                'equipment': 'Equipment Management',
                'tat': 'TAT Monitoring',
                'availability': 'Test Availability',
                'workload': 'Workload Monitoring',
                'satisfaction': 'Customer Satisfaction',
                'staff': 'Staff Monitoring',
                'customization': 'Dashboard Customization',
                'inventory': 'Inventory Management',
                'reports': 'Reports',
                'general': 'General Settings',
                'users': 'User Management',
                'facilities': 'Facility Management',
                'data-sync': 'Data Sync (Cloud)',
                'backup': 'Backup & Restore',
                'about': 'About'
            };
            pageTitle.textContent = titles[page] || page.charAt(0).toUpperCase() + page.slice(1);
        }

        // Show page section
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        const pageIdBase = page.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const targetSection = document.getElementById(`${pageIdBase}Page`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 992) {
            this.sidebar.classList.remove('open');
        }

        // Close profile dropdown
        document.getElementById('profileDropdown')?.classList.remove('show');

        // Notify modules so dashboards can refresh with current data
        document.dispatchEvent(new CustomEvent('lis:navigate', { detail: { page } }));

        // Log navigation
        console.log(`Navigated to: ${page}`);
    }

    /**
     * Setup user profile dropdown
     */
    setupUserProfile() {
        const profileBtn = document.getElementById('userProfileBtn');
        const dropdown = document.getElementById('profileDropdown');

        if (profileBtn && dropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }

    /**
     * Setup theme toggle
     */
    setupThemeToggle() {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newTheme = isDark ? 'light' : 'dark';
                if (window.settingsManager) {
                    window.settingsManager.setTheme(newTheme);
                } else {
                    document.body.classList.remove('light-mode', 'dark-mode');
                    document.body.classList.add(`${newTheme}-mode`);
                    localStorage.setItem('theme', newTheme);
                    this.updateThemeIcon(newTheme === 'dark');
                }
            });

            // Load saved theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                this.updateThemeIcon(true);
            } else {
                document.body.classList.add('light-mode');
            }
        }
    }

    /**
     * Update theme icon
     * @param {boolean} isDark - Is dark mode
     */
    updateThemeIcon(isDark) {
        const themeBtn = document.getElementById('themeToggle');
        if (!themeBtn) return;
        
        themeBtn.innerHTML = isDark
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

    /**
     * Setup search
     */
    setupSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const searchModal = document.getElementById('searchModal');
        const searchInput = document.getElementById('searchInput');
        const closeBtn = searchModal?.querySelector('.modal-close');

        if (searchBtn && searchModal) {
            searchBtn.addEventListener('click', () => {
                searchModal.style.display = 'flex';
                setTimeout(() => searchInput?.focus(), 100);
            });

            // Close modal
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    searchModal.style.display = 'none';
                });
            }

            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) {
                    searchModal.style.display = 'none';
                }
            });

            // Search functionality
            if (searchInput) {
                searchInput.addEventListener('input', Utils.debounce((e) => {
                    this.performSearch(e.target.value);
                }, 300));

                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.performSearch(searchInput.value);
                    }
                });
            }
        }
    }

    /**
     * Perform search
     * @param {string} query - Search query
     */
    performSearch(query) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '<p class="search-empty">Type at least 2 characters to search</p>';
            return;
        }

        // Search patients
        const patients = storage.getAllScoped('patients') || [];
        const results = patients.filter(p => {
            const searchStr = query.toLowerCase();
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            return fullName.toLowerCase().includes(searchStr) ||
                   p.mrn?.toLowerCase().includes(searchStr) ||
                   p.labNumber?.toLowerCase().includes(searchStr) ||
                   p.phone?.includes(searchStr);
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="search-empty">No results found</p>';
            return;
        }

        resultsContainer.innerHTML = results.map(p => {
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown';
            return `
                <div class="search-result-item" onclick="navigateTo('patients'); closeSearch(); patientManager?.viewPatient('${p.id}');">
                    <div class="result-title">${fullName}</div>
                    <div class="result-subtitle">MRN: ${p.mrn || 'N/A'} | Lab: ${p.labNumber || 'N/A'}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Setup notifications
     */
    setupNotifications() {
        // Full notification panel logic lives in notifications.js
        // (NotificationCenter); this just keeps the badge count fresh.
        this.updateNotificationCount();
    }

    /**
     * Build the list of real, actionable alerts in the system.
     * Kept here (in addition to NotificationCenter's richer version)
     * so the sidebar badge works even before notifications.js loads.
     * @returns {Array<{message: string}>} Alert descriptors
     */
    getActiveAlerts() {
        if (window.notificationCenter) {
            return window.notificationCenter.getAllNotifications();
        }
        const alerts = [];
        const iqc = storage.getAll('iqc') || [];
        const eqa = storage.getAll('eqa') || [];
        const critical = storage.getAll('criticalAlerts') || [];

        iqc.filter(i => i.inControl === false).forEach(i =>
            alerts.push({ message: `IQC out of control: ${i.testName || 'Unknown test'}` }));
        eqa.filter(e => e.status === 'Failed').forEach(e =>
            alerts.push({ message: `EQA failed: ${e.eqaType || 'Unknown'}` }));
        critical.filter(a => a.status === 'Open').forEach(a =>
            alerts.push({ message: `⚠️ Critical value: ${a.patientName || 'Unknown'} - ${a.tests || ''}`.trim() }));

        return alerts;
    }

    /**
     * Update notification count
     */
    updateNotificationCount() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const count = this.getActiveAlerts().length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    /**
     * Update user information in sidebar
     */
    updateUserInfo() {
        const user = auth.getCurrentUser();
        if (!user) return;

        // Update sidebar user
        const avatar = document.getElementById('userAvatar');
        const userName = document.getElementById('sidebarUserName');
        const userRole = document.getElementById('sidebarUserRole');
        const userFacility = document.getElementById('sidebarUserFacility');

        if (avatar) avatar.textContent = Utils.getInitials(user.fullName);
        if (userName) userName.textContent = user.fullName;
        if (userRole) userRole.textContent = user.role;
        if (userFacility) userFacility.textContent = user.facilityName || '';

        // Update header profile
        const profileAvatar = document.getElementById('profileAvatar');
        const profileName = document.getElementById('profileName');
        const dropdownName = document.getElementById('dropdownName');
        const dropdownRole = document.getElementById('dropdownRole');
        const welcomeName = document.getElementById('welcomeName');
        const welcomeRole = document.getElementById('welcomeRole');

        if (profileAvatar) profileAvatar.textContent = Utils.getInitials(user.fullName);
        if (profileName) profileName.textContent = user.fullName;
        if (dropdownName) dropdownName.textContent = user.fullName;
        if (dropdownRole) dropdownRole.textContent = user.role;
        if (welcomeName) welcomeName.textContent = user.fullName;
        if (welcomeRole) welcomeRole.textContent = `Role: ${user.role}`;

        // Update logo
        this.updateLogo();
    }

    /**
     * Update hospital logo
     */
    updateLogo() {
        const storedLogo = localStorage.getItem('hospitalLogo');
        const logoElements = document.querySelectorAll('.sidebar-logo img, .brand-logo img');
        
        logoElements.forEach(el => {
            if (storedLogo) {
                el.src = storedLogo;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }

    /**
     * Setup responsive behavior
     */
    setupResponsive() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                this.sidebar.classList.remove('open');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + S for search
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                document.getElementById('searchBtn')?.click();
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(modal => {
                    modal.style.display = 'none';
                });
                document.getElementById('profileDropdown')?.classList.remove('show');
            }
        });
    }
}

/**
 * Global navigation function
 * @param {string} page - Page to navigate to
 */
function navigateTo(page) {
    if (window.sidebar) {
        window.sidebar.navigateTo(page);
    }
}

/**
 * Close confirmation dialog
 */
function closeConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Close search modal
 */
function closeSearch() {
    const modal = document.getElementById('searchModal');
    if (modal) modal.style.display = 'none';
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.sidebar = new SidebarManager();
});