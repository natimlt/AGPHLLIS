/**
 * ======================================================
 * AGPHL LIS - Authentication Module
 * Version: 2.0 (Security Hardened)
 * Developer: Asrat Genet
 *
 * Handles user authentication, session management,
 * role-based access control, account lockout, and
 * user operations.
 *
 * SECURITY NOTE: This build has no backend server. All
 * data, including hashed passwords, lives in the browser's
 * localStorage and is reachable by anyone with physical or
 * remote (malware/extension) access to the device via
 * DevTools. The measures below (salted SHA-256 hashing,
 * lockout, RBAC, audit trail, session expiry) raise the bar
 * against casual tampering and shoulder-surfing, but they
 * are NOT a substitute for server-side authentication and
 * authorization. For real multi-user deployment (which ISO
 * 15189:2022 access-control and data-integrity clauses
 * effectively require), move authentication, the database,
 * and the audit trail to a backend you control.
 * ======================================================
 */

class AuthManager {
    constructor() {
        this.storage = window.storage;
        this.currentUser = null;
        this.sessionKey = 'agphl_session';
        this.usersKey = 'agphl_users';
        this.rememberKey = 'agphl_remember';

        // Security policy
        this.maxFailedAttempts = 5;
        this.lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
        this.passwordMinLength = 8;
        this.hashIterations = 1000; // simple stretching since Web Crypto has no native PBKDF2 shortcut here

        // Permission matrix - module/action level, used by sidebar + pages to gate UI
        this.permissions = {
            'Administrator': ['all'],
            'Laboratory Head': [
                'view_dashboard', 'view_patients', 'view_samples',
                'view_results', 'manage_results',
                'view_quality', 'manage_quality', 'view_audit',
                'view_reports', 'view_equipment', 'manage_equipment',
                'view_tat', 'view_availability', 'manage_availability',
                'view_qi', 'manage_qi', 'view_workload', 'view_inventory',
                'view_satisfaction', 'manage_satisfaction', 'resolve_complaints',
                'view_staff', 'manage_staff', 'approve_leave', 'manage_customization'
            ],
            'Quality Officer': [
                'view_dashboard', 'view_patients', 'view_samples',
                'view_results',
                'view_quality', 'manage_quality', 'view_audit',
                'view_reports', 'view_equipment', 'manage_equipment',
                'view_tat', 'view_availability', 'manage_availability',
                'view_qi', 'manage_qi', 'view_workload', 'view_inventory',
                'view_satisfaction', 'manage_satisfaction', 'resolve_complaints',
                'view_staff', 'manage_staff', 'approve_leave', 'manage_customization'
            ],
            'Medical Laboratory Professional': [
                'view_dashboard', 'view_patients', 'view_samples',
                'manage_samples', 'view_results', 'manage_results',
                'view_quality', 'view_reports', 'view_equipment',
                'view_tat', 'view_availability', 'manage_availability',
                'view_qi', 'view_workload',
                'view_satisfaction'
            ],
            'Reception': [
                'view_dashboard', 'manage_patients', 'view_samples',
                'view_reports', 'view_availability', 'view_tat',
                'view_satisfaction', 'manage_satisfaction'
            ],
            'Viewer': [
                 'view_patients', 'view_samples',
                'view_reports', 'view_availability',
                'view_satisfaction'
            ],
            'Logistic':[ 'view_inventory'
                
            ]
        };

        this.ready = this.init();
    }

    /**
     * Initialize the auth manager. Returns a promise that resolves once
     * default users (if any) have been seeded, so login() can safely await it.
     */
    async init() {
        this.loadSession();
        this.initDefaultFacilities();
        await this.initDefaultUsers();
        this.setupAutoLogout();
        return true;
    }

    /**
     * Initialize default facilities if none exist. Each user account
     * belongs to exactly one facility (Administrators use facilityId
     * null, meaning "all facilities"), so hospitals sharing this LIS
     * deployment keep their own patients/samples/results separate.
     */
    initDefaultFacilities() {
        const facilities = this.storage.getAll('facilities');
        if (facilities.length === 0) {
            const defaults = [
                { name: 'Agew Gimjabet Primary Hospital', code: 'AGPHL', address: 'Agew Gimjabet, Awi Zone', phone: '', active: true },
                { name: 'Injibara Hospital', code: 'INJH', address: 'Injibara, Awi Zone', phone: '', active: true },
                { name: 'Chagni Hospital', code: 'CHGH', address: 'Chagni, Awi Zone', phone: '', active: true }
            ];
            defaults.forEach(f => this.storage.create('facilities', f));
        }
    }

    getFacilities() {
        return this.storage.getAll('facilities') || [];
    }

    createFacility(data) {
        if (!this.hasPermission('manage_facilities')) {
            throw new Error('You do not have permission to manage facilities');
        }
        if (!data.name) throw new Error('Facility name is required');
        return this.storage.create('facilities', { name: data.name, code: data.code || '', address: data.address || '', phone: data.phone || '', active: true });
    }

    updateFacility(id, data) {
        if (!this.hasPermission('manage_facilities')) {
            throw new Error('You do not have permission to manage facilities');
        }
        return this.storage.update('facilities', id, data);
    }

    deleteFacility(id) {
        if (!this.hasPermission('manage_facilities')) {
            throw new Error('You do not have permission to manage facilities');
        }
        const inUse = this.storage.getAll('users').some(u => u.facilityId === id);
        if (inUse) throw new Error('Cannot delete a facility that still has users assigned to it');
        return this.storage.delete('facilities', id);
    }

    /**
     * Initialize default users if none exist. Also detects and migrates
     * legacy user records created before salted hashing was introduced
     * (they have no `salt` field, so they can never verify again) -
     * without this, every account from an older build of the app would
     * be permanently locked out after this security upgrade.
     */
    async initDefaultUsers() {
        let users = this.storage.getAll('users');

        const hasLegacyRecords = users.length > 0 && users.some(u => !u.salt);
        if (hasLegacyRecords) {
            console.warn(
                'AGPHL LIS: detected user accounts created before salted password ' +
                'hashing was added. These cannot be verified under the new scheme, ' +
                'so accounts have been reset to the system defaults. Any custom ' +
                'users/passwords created before this update will need to be ' +
                're-created from User Management.'
            );
            this.storage.storage.removeItem(`${this.storage.prefix}users`);
            users = [];
        }

        if (users.length === 0) {
            const facilities = this.getFacilities();
            const primaryFacilityId = facilities.find(f => f.code === 'AGPHL')?.id || facilities[0]?.id || null;

            const defaultUsers = [
                { username: 'admin', password: 'Admin@12345', email: 'admin@agphl.com', fullName: 'System Administrator', role: 'Administrator', phone: '+251-900-000-000', facilityId: null },
                { username: 'labhead', password: 'LabHead@12345', email: 'labhead@agphl.com', fullName: 'Laboratory Head', role: 'Laboratory Head', phone: '+251-900-000-005', facilityId: primaryFacilityId },
                { username: 'quality', password: 'Quality@12345', email: 'quality@agphl.com', fullName: 'Quality Officer', role: 'Quality Officer', phone: '+251-900-000-001', facilityId: primaryFacilityId },
                { username: 'pro', password: 'LabPro@12345', email: 'professional@agphl.com', fullName: 'Medical Lab Professional', role: 'Medical Laboratory Professional', phone: '+251-900-000-002', facilityId: primaryFacilityId },
                { username: 'reception', password: 'Reception@12345', email: 'reception@agphl.com', fullName: 'Receptionist', role: 'Reception', phone: '+251-900-000-003', facilityId: primaryFacilityId },
                { username: 'viewer', password: 'Viewer@12345', email: 'viewer@agphl.com', fullName: 'Viewer', role: 'Viewer', phone: '+251-900-000-004', facilityId: primaryFacilityId },
                {username:'logistic',
                    password:'Logistic@12345',
                    email: 'logoistic@agphl.com', fullName: 'Logostic', role: 'Logistic', phone: '+251-900-000-004', facilityId: primaryFacilityId},
            ];

            for (const u of defaultUsers) {
                const salt = this.generateSalt();
                const hash = await this.hashPassword(u.password, salt);
                this.storage.create('users', {
                    username: u.username,
                    password: hash,
                    salt: salt,
                    email: u.email,
                    fullName: u.fullName,
                    role: u.role,
                    phone: u.phone,
                    facilityId: u.facilityId,
                    status: 'active',
                    failedAttempts: 0,
                    lockedUntil: null,
                    mustChangePassword: true,
                    passwordChangedAt: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Generate a cryptographically random hex salt
     */
    generateSalt(bytes = 16) {
        const arr = new Uint8Array(bytes);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate a cryptographically random session token
     */
    generateSessionToken() {
        return this.generateSalt(32);
    }

    /**
     * Hash a password with a salt using salted, iterated SHA-256 (Web Crypto).
     * Not a replacement for server-side bcrypt/ar2, but far stronger than a
     * plain reversible checksum, and removes plaintext-recoverable hashing.
     * @param {string} password
     * @param {string} salt
     * @returns {Promise<string>} hex digest
     */
    async hashPassword(password, salt) {
        if (!window.crypto?.subtle) {
            throw new Error(
                'Secure password hashing is unavailable in this browsing context. ' +
                'If you opened this app directly as a file (file://), please serve it ' +
                'over http://localhost or https:// instead - most browsers disable the ' +
                'Web Crypto API for local files.'
            );
        }
        const enc = new TextEncoder();
        let data = enc.encode(salt + ':' + password);
        let buffer;
        for (let i = 0; i < this.hashIterations; i++) {
            buffer = await crypto.subtle.digest('SHA-256', data);
            data = new Uint8Array(buffer);
        }
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify a plaintext password against a stored salted hash
     */
    async verifyPassword(plain, hashed, salt) {
        const computed = await this.hashPassword(plain, salt);
        return computed === hashed;
    }

    /**
     * Validate password strength. Used on user creation and password change.
     * @returns {{valid: boolean, message: string}}
     */
    validatePasswordStrength(password) {
        if (!password || password.length < this.passwordMinLength) {
            return { valid: false, message: `Password must be at least ${this.passwordMinLength} characters long` };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        return { valid: true, message: '' };
    }

    /**
     * Login user
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {boolean} remember - Remember me
     * @returns {Promise<Object>} Login result
     */
    async login(username, password, remember = false) {
        await this.ready;
        try {
            if (!username || !password) {
                throw new Error('Username and password are required');
            }

            const cleanUsername = String(username).trim().toLowerCase();
            const users = this.storage.getAll('users');
            const user = users.find(u => u.username === cleanUsername);

            // Use a generic message for both "no such user" and "bad password"
            // so the login form never reveals which accounts exist.
            const genericError = 'Invalid username or password';

            if (!user) {
                throw new Error(genericError);
            }

            if (user.status !== 'active') {
                throw new Error('This account has been disabled. Contact your administrator.');
            }

            if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
                const mins = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
                throw new Error(`Account temporarily locked after repeated failed attempts. Try again in ${mins} minute(s).`);
            }

            const valid = await this.verifyPassword(password, user.password, user.salt);
            if (!valid) {
                await this.recordFailedAttempt(user);
                throw new Error(genericError);
            }

            // Successful login - reset failed attempt counter and record last login
            const loginUpdate = { lastLogin: new Date().toISOString() };
            if (user.failedAttempts || user.lockedUntil) {
                loginUpdate.failedAttempts = 0;
                loginUpdate.lockedUntil = null;
            }
            this.storage.update('users', user.id, loginUpdate);

            // Create session with a random, non-guessable token
            const facility = user.facilityId ? this.storage.getById('facilities', user.facilityId) : null;
            const session = {
                userId: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                email: user.email,
                phone: user.phone,
                facilityId: user.facilityId || null,
                facilityName: facility ? facility.name : (user.facilityId === null ? 'All Facilities' : 'Unassigned'),
                sessionToken: this.generateSessionToken(),
                loginTime: new Date().toISOString(),
                expiresAt: this.getSessionExpiry(remember),
                mustChangePassword: !!user.mustChangePassword
            };

            this.storage.storage.setItem(this.sessionKey, JSON.stringify(session));

            if (remember) {
                this.storage.storage.setItem(this.rememberKey, user.username);
            } else {
                this.storage.storage.removeItem(this.rememberKey);
            }

            this.currentUser = session;

            this.storage.createAuditLog('LOGIN', 'auth', user.id, {
                username: user.username,
                role: user.role,
                userAgent: navigator.userAgent
            });

            return {
                success: true,
                user: session,
                redirect: 'dashboard.html'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Track a failed login attempt and lock the account after too many.
     */
    async recordFailedAttempt(user) {
        const attempts = (user.failedAttempts || 0) + 1;
        const update = { failedAttempts: attempts };
        let locked = false;

        if (attempts >= this.maxFailedAttempts) {
            update.lockedUntil = new Date(Date.now() + this.lockoutDurationMs).toISOString();
            locked = true;
        }

        this.storage.update('users', user.id, update);
        this.storage.createAuditLog(locked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', 'auth', user.id, {
            username: user.username,
            attempts,
            userAgent: navigator.userAgent
        });
    }

    /**
     * Manually unlock a user account (Administrator action)
     */
    unlockUser(userId) {
        if (!this.hasPermission('manage_users')) {
            throw new Error('You do not have permission to unlock accounts');
        }
        return this.storage.update('users', userId, { failedAttempts: 0, lockedUntil: null });
    }

    /**
     * Get session expiry time
     * @param {boolean} remember - Remember me
     * @returns {string} ISO date string
     */
    getSessionExpiry(remember) {
        const now = new Date();
        const expiryHours = remember ? 720 : 8; // 30 days or 8 hours
        now.setHours(now.getHours() + expiryHours);
        return now.toISOString();
    }

    /**
     * Load session from storage
     * @returns {Object|null} Session or null
     */
    loadSession() {
        try {
            const sessionData = this.storage.storage.getItem(this.sessionKey);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);

            const now = new Date();
            const expiry = new Date(session.expiresAt);

            if (now > expiry) {
                this.logout();
                return null;
            }

            this.currentUser = session;
            return session;
        } catch {
            return null;
        }
    }

    /**
     * Logout user
     */
    logout() {
        const user = this.currentUser;
        this.storage.storage.removeItem(this.sessionKey);
        this.currentUser = null;

        if (user) {
            this.storage.createAuditLog('LOGOUT', 'auth', user.userId, {
                username: user.username,
                role: user.role
            });
        }

        window.location.href = 'login.html';
    }

    /**
     * Setup auto-logout timer
     */
    setupAutoLogout() {
        // Check session every minute
        setInterval(() => {
            if (this.isAuthenticated()) {
                const session = this.loadSession();
                if (!session) {
                    this.logout();
                }
            }
        }, 60000);

        // Inactivity timeout (30 minutes)
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (this.isAuthenticated()) {
                    this.showToast('Session expired due to inactivity', 'warning');
                    this.logout();
                }
            }, 1800000); // 30 minutes
        };

        document.addEventListener('mousemove', resetTimer);
        document.addEventListener('keydown', resetTimer);
        document.addEventListener('click', resetTimer);
        document.addEventListener('touchstart', resetTimer);
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null && this.loadSession() !== null;
    }

    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser || this.loadSession();
    }

    /**
     * Check if user has role
     * @param {string|string[]} roles - Role or roles to check
     * @returns {boolean} True if has role
     */
    hasRole(roles) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (typeof roles === 'string') {
            return user.role === roles;
        }

        return roles.includes(user.role);
    }

    /**
     * Check if user has permission
     * @param {string} permission - Permission to check
     * @returns {boolean} True if has permission
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const userPermissions = this.permissions[user.role] || [];
        return userPermissions.includes('all') || userPermissions.includes(permission);
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Object|null} User or null
     */
    getUserById(userId) {
        return this.storage.getById('users', userId);
    }

    /**
     * Get all users (passwords/salts stripped for display)
     * @returns {Array} List of users
     */
    getAllUsers() {
        return this.storage.getAll('users').map(u => {
            const { password, salt, ...safe } = u;
            return safe;
        });
    }

    /**
     * Change the current user's own password, requiring the current
     * password for verification (self-service, not an admin override).
     */
    async changeOwnPassword(currentPassword, newPassword) {
        const session = this.getCurrentUser();
        if (!session) throw new Error('You must be logged in to change your password');

        const user = this.storage.getById('users', session.userId);
        if (!user) throw new Error('User not found');

        const valid = await this.verifyPassword(currentPassword, user.password, user.salt);
        if (!valid) throw new Error('Current password is incorrect');

        const check = this.validatePasswordStrength(newPassword);
        if (!check.valid) throw new Error(check.message);

        const salt = this.generateSalt();
        const hash = await this.hashPassword(newPassword, salt);
        this.storage.update('users', user.id, {
            password: hash,
            salt,
            passwordChangedAt: new Date().toISOString(),
            mustChangePassword: false
        });

        // Reflect on the active session
        session.mustChangePassword = false;
        this.storage.storage.setItem(this.sessionKey, JSON.stringify(session));

        this.storage.createAuditLog('PASSWORD_CHANGED', 'auth', user.id, { username: user.username });
        return true;
    }

    /**
     * Update user. Requires manage_users permission unless the user is
     * updating their own non-role fields.
     * @param {string} userId - User ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated user
     */
    async updateUser(userId, data) {
        if (!this.hasPermission('manage_users') && this.getCurrentUser()?.userId !== userId) {
            throw new Error('You do not have permission to update this user');
        }

        const payload = { ...data };

        if (payload.password) {
            const check = this.validatePasswordStrength(payload.password);
            if (!check.valid) throw new Error(check.message);
            const salt = this.generateSalt();
            payload.password = await this.hashPassword(payload.password, salt);
            payload.salt = salt;
            payload.passwordChangedAt = new Date().toISOString();
            payload.mustChangePassword = false;
        }

        // Only an Administrator may change someone else's role or status
        if (!this.hasPermission('manage_users')) {
            delete payload.role;
            delete payload.status;
        }

        return this.storage.update('users', userId, payload);
    }

    /**
     * Administrator-driven password reset (e.g. user forgot password).
     * Issues a temporary password and forces a change at next login.
     */
    async resetUserPassword(userId, tempPassword) {
        if (!this.hasPermission('manage_users')) {
            throw new Error('You do not have permission to reset passwords');
        }
        const check = this.validatePasswordStrength(tempPassword);
        if (!check.valid) throw new Error(check.message);

        const salt = this.generateSalt();
        const hash = await this.hashPassword(tempPassword, salt);
        const result = this.storage.update('users', userId, {
            password: hash,
            salt,
            passwordChangedAt: new Date().toISOString(),
            mustChangePassword: true,
            failedAttempts: 0,
            lockedUntil: null
        });
        this.storage.createAuditLog('PASSWORD_RESET_BY_ADMIN', 'auth', userId, {
            by: this.getCurrentUser()?.username
        });
        return result;
    }

    /**
     * Delete user
     * @param {string} userId - User ID
     * @returns {boolean} True if deleted
     */
    deleteUser(userId) {
        if (!this.hasPermission('manage_users')) {
            throw new Error('You do not have permission to delete users');
        }
        if (userId === this.currentUser?.userId) {
            throw new Error('Cannot delete your own account');
        }
        return this.storage.delete('users', userId);
    }

    /**
     * Create user
     * @param {Object} data - User data
     * @returns {Promise<Object>} Created user
     */
    async createUser(data) {
        if (!this.hasPermission('manage_users')) {
            throw new Error('You do not have permission to create users');
        }
        if (!data.username || !data.password || !data.fullName || !data.role) {
            throw new Error('Username, full name, role, and password are required');
        }
        if (this.storage.exists('users', 'username', data.username.toLowerCase())) {
            throw new Error('Username already exists');
        }

        const check = this.validatePasswordStrength(data.password);
        if (!check.valid) throw new Error(check.message);

        const salt = this.generateSalt();
        const hash = await this.hashPassword(data.password, salt);

        return this.storage.create('users', {
            username: data.username.toLowerCase(),
            password: hash,
            salt: salt,
            email: data.email || '',
            fullName: data.fullName,
            role: data.role,
            phone: data.phone || '',
            facilityId: data.role === 'Administrator' ? null : (data.facilityId || null),
            status: data.status || 'active',
            failedAttempts: 0,
            lockedUntil: null,
            mustChangePassword: true,
            passwordChangedAt: new Date().toISOString()
        });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.log(`${type}: ${message}`);
            return;
        }

        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'flex';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
}

// Initialize auth manager
const auth = new AuthManager();
window.auth = auth;
