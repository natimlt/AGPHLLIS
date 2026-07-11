/**
 * ======================================================
 * AGPHL LIS - Application Initialization
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * Main application entry point.
 * ======================================================
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  initApp();
});

/**
 * Initialize the application
 */
function initApp() {
  // Check if we're on the login page
  const isLoginPage = window.location.pathname.includes('login.html');
  const isDashboardPage = window.location.pathname.includes('dashboard.html');
  
  if (isLoginPage) {
    initLoginPage();
  } else if (isDashboardPage) {
    initDashboardPage();
  } else {
    // Index page - splash screen will redirect
    initSplashPage();
  }
}

/**
 * Initialize splash page
 */
function initSplashPage() {
  // Check for logo in local storage
  const storedLogo = localStorage.getItem('hospitalLogo');
  if (storedLogo) {
    const logoContainer = document.getElementById('splashLogo');
    if (logoContainer) {
      logoContainer.innerHTML = `<img src="${storedLogo}" alt="Hospital Logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 15px;">`;
    }
  }
  
  // Redirect after 3 seconds
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 3000);
}

/**
 * Initialize login page
 */
function initLoginPage() {
  // Check if user is already logged in
  if (auth.isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  // Setup login form
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  const rememberCheck = document.getElementById('rememberMe');
  const loginBtn = document.getElementById('loginBtn');
  
  // Load remembered username
  const remembered = localStorage.getItem('agphl_remember');
  if (remembered) {
    usernameInput.value = remembered;
    rememberCheck.checked = true;
  }
  
  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      this.innerHTML = type === 'password' ?
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' :
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    });
  }
  
  // Form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    
    // Get values
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const remember = rememberCheck.checked;
    
    // Validate
    let isValid = true;
    
    if (!username) {
      showError('username', 'Username is required');
      isValid = false;
    }
    
    if (!password) {
      showError('password', 'Password is required');
      isValid = false;
    }
    
    if (!isValid) return;
    
    // Show loading
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    
    // Attempt login
    const result = await auth.login(username, password, remember);
    
    // Hide loading
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
    
    if (result.success) {
      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = result.redirect;
      }, 1000);
    } else {
      showToast(result.message || 'Login failed', 'error');
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
  
  // Enter key support
  passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      loginForm.dispatchEvent(new Event('submit'));
    }
  });
  
  // Auto-focus username
  usernameInput.focus();
}

/**
 * Initialize dashboard page
 */
function initDashboardPage() {
  // Check authentication
  if (!auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Load user info
  const user = auth.getCurrentUser();
  if (user) {
    updateUserInfo(user);
  }
  
  // Initialize all dashboard components
  // These will be initialized by their respective modules
  // The modules will auto-initialize when their scripts load
}

/**
 * Update user information in header
 */
function updateUserInfo(user) {
  // Update sidebar user
  const avatar = document.getElementById('userAvatar');
  const userName = document.getElementById('sidebarUserName');
  const userRole = document.getElementById('sidebarUserRole');
  
  if (avatar) avatar.textContent = Utils.getInitials(user.fullName);
  if (userName) userName.textContent = user.fullName;
  if (userRole) userRole.textContent = user.role;
  
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
}

/**
 * Show error message for field
 */
function showError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  const input = document.getElementById(fieldId);
  if (input) {
    input.classList.add('error');
  }
}

/**
 * Clear all error messages
 */
function clearErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  document.querySelectorAll('.input-group input').forEach(el => {
    el.classList.remove('error');
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) {
    alert(message);
    return;
  }
  
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = 'flex';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
}

// Make functions globally available
window.showToast = showToast;
window.clearErrors = clearErrors;
window.showError = showError;

/**
 * Handle logout
 */
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    auth.logout();
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

// Make functions globally available
window.closeConfirm = closeConfirm;
window.closeSearch = closeSearch;
window.handleLogout = handleLogout;
window.showToast = showToast;