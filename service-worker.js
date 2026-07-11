/**
 * ======================================================
 * AGPHL LIS - Service Worker
 * Version: 1.0
 *
 * Caches the entire app shell (HTML/CSS/JS/icons) so it
 * installs and runs like a native desktop/mobile app and
 * keeps working with no internet connection - which matters
 * here since all clinical data already lives in the browser's
 * localStorage, not a remote server. CDN-loaded extras
 * (jsPDF, Supabase SDK) are NOT precached; they simply won't
 * load offline, and the app already has fallbacks for that
 * (e.g. Print dialog instead of Download PDF).
 *
 * Bump CACHE_VERSION whenever app files change so returning
 * users get the update instead of a stale cached copy.
 * ======================================================
 */

const CACHE_VERSION = 'agphl-lis-v1';

const PRECACHE_URLS = [
    './',
    './index.html',
    './login.html',
    './dashboard.html',
    './manifest.json',
    './data/default-data.js',
    './assets/css/components.css',
    './assets/css/dashboard.css',
    './assets/css/inventory.css',
    './assets/css/login.css',
    './assets/css/main.css',
    './assets/css/monitoring.css',
    './assets/css/patients.css',
    './assets/css/quality.css',
    './assets/css/report.css',
    './assets/css/results.css',
    './assets/css/samples.css',
    './assets/css/setting.css',
    './assets/icons/favicon.ico',
    './assets/icons/icon-16.png',
    './assets/icons/icon-32.png',
    './assets/icons/icon-48.png',
    './assets/icons/icon-72.png',
    './assets/icons/icon-96.png',
    './assets/icons/icon-128.png',
    './assets/icons/icon-144.png',
    './assets/icons/icon-152.png',
    './assets/icons/icon-180.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-256.png',
    './assets/icons/icon-384.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/js/app.js',
    './assets/js/auth.js',
    './assets/js/availability.js',
    './assets/js/config.js',
    './assets/js/customization.js',
    './assets/js/dashboard.js',
    './assets/js/equipment.js',
    './assets/js/facilities.js',
    './assets/js/inventory.js',
    './assets/js/login-animations.js',
    './assets/js/multiselect.js',
    './assets/js/notifications.js',
    './assets/js/patients.js',
    './assets/js/qi.js',
    './assets/js/qms-extended.js',
    './assets/js/quality.js',
    './assets/js/report.js',
    './assets/js/results.js',
    './assets/js/sample.js',
    './assets/js/satisfaction.js',
    './assets/js/settings.js',
    './assets/js/sidebar.js',
    './assets/js/staff.js',
    './assets/js/storage.js',
    './assets/js/supabase-sync.js',
    './assets/js/tat.js',
    './assets/js/users.js',
    './assets/js/utils.js',
    './assets/js/validation.js',
    './assets/js/workflow.js',
    './assets/js/workload.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle same-origin GET requests - never intercept CDN calls
    // (jsPDF, Supabase) or POST/PUT requests to a Supabase backend.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Cache-first for the app shell: instant load, works offline.
            // Update the cache in the background so the next launch picks
            // up any change without blocking this one.
            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || networkFetch;
        })
    );
});
