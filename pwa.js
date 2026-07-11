/**
 * ======================================================
 * AGPHL LIS - PWA Registration & Install Prompt
 * Version: 1.0
 *
 * Registers the service worker (offline support) and wires
 * up an "Install App" button wherever one exists on the page
 * (#pwaInstallBtn), using the browser's native install prompt.
 * Safe to include on every page; does nothing on browsers
 * that don't support installable PWAs (it just stays hidden).
 * ======================================================
 */

(function () {
    let deferredInstallPrompt = null;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').catch((err) => {
                console.warn('AGPHL LIS: service worker registration failed (offline support unavailable):', err);
            });
        });
    }

    function showInstallButtons() {
        document.querySelectorAll('#pwaInstallBtn, .pwa-install-btn').forEach(btn => {
            btn.classList.remove('pwa-btn-hidden');
        });
    }

    function hideInstallButtons() {
        document.querySelectorAll('#pwaInstallBtn, .pwa-install-btn').forEach(btn => {
            btn.classList.add('pwa-btn-hidden');
        });
    }

    // Chrome/Edge/Android fire this when the app is eligible to install.
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        showInstallButtons();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        hideInstallButtons();
        if (window.showToast) showToast('AGPHL LIS installed - you can now launch it like any other app', 'success');
    });

    // If already running as an installed app, never show the install button.
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        hideInstallButtons();
    }

    window.triggerPwaInstall = async function () {
        if (!deferredInstallPrompt) {
            if (window.showToast) {
                showToast('Use your browser\'s menu (⋮ or Share icon) and choose "Install App" / "Add to Home Screen"', 'info');
            }
            return;
        }
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') hideInstallButtons();
        deferredInstallPrompt = null;
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('#pwaInstallBtn, .pwa-install-btn').forEach(btn => {
            btn.classList.add('pwa-btn-hidden'); // hidden until beforeinstallprompt fires
            btn.addEventListener('click', () => window.triggerPwaInstall());
        });
    });
})();
