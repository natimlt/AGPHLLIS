/**
 * ======================================================
 * AGPHL LIS - Supabase Cloud Sync (optional, online-only)
 * Version: 1.0
 *
 * This app is local-first: all data lives in the browser's
 * localStorage and works fully offline. This module adds an
 * OPTIONAL best-effort mirror to a Supabase project when the
 * browser is online and the person has configured their own
 * Supabase URL + anon key in Settings > Data Sync.
 *
 * Design: rather than requiring a hand-built Supabase schema
 * matching every one of this app's ~30 local collections,
 * everything mirrors into a single generic table:
 *
 *   create table lis_sync (
 *     sync_key    text primary key,   -- `${collection}:${id}`
 *     collection  text not null,
 *     record_id   text not null,
 *     facility_id text,
 *     data        jsonb not null,
 *     updated_at  timestamptz not null default now()
 *   );
 *   alter table lis_sync enable row level security;
 *   create policy "allow all with anon key"
 *     on lis_sync for all using (true) with check (true);
 *
 * (Anon-key-only RLS like the policy above is fine for a
 * single-clinic pilot but is NOT meaningful access control -
 * anyone with the anon key can read/write everything. Treat
 * this as a backup/mirror, not a security boundary, unless
 * proper per-facility RLS policies are added.)
 *
 * This is a best-effort mirror, not a conflict-resolving sync
 * engine: last write wins, and pulling overwrites local data.
 * ======================================================
 */

class SupabaseSync {
    constructor() {
        this.configKey = 'agphl_supabaseConfig';
        this.client = null;
        this.sdkLoadPromise = null;
        this.init();
    }

    init() {
        const config = this.getConfig();
        if (config.url && config.anonKey && navigator.onLine) {
            this.connect().catch(() => { /* offline or misconfigured - app keeps working locally */ });
        }
        window.storage?.onWrite((action, collection, record) => this.mirrorWrite(action, collection, record));
        window.addEventListener('online', () => {
            const cfg = this.getConfig();
            if (cfg.url && cfg.anonKey && !this.client) this.connect().catch(() => {});
            this.renderStatus();
        });
        window.addEventListener('offline', () => this.renderStatus());

        if (document.getElementById('dataSyncPage')) {
            this.setupPageEventListeners();
            this.renderPage();
            document.addEventListener('lis:navigate', (e) => {
                if (e.detail.page === 'data-sync') this.renderPage();
            });
        }
    }

    setupPageEventListeners() {
        document.getElementById('syncTestBtn')?.addEventListener('click', () => this.handleTestConnection());
        document.getElementById('syncSaveBtn')?.addEventListener('click', () => this.handleSaveConfig());
        document.getElementById('syncPushBtn')?.addEventListener('click', () => this.handlePush());
        document.getElementById('syncPullBtn')?.addEventListener('click', () => this.handlePull());
        document.getElementById('syncDisconnectBtn')?.addEventListener('click', () => this.handleDisconnect());
    }

    renderPage() {
        if (!window.auth?.hasPermission('manage_customization')) {
            const container = document.getElementById('dataSyncPage');
            if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><h3>Access Restricted</h3><p>Only Administrators and Quality Officers can manage cloud sync.</p></div>`;
            return;
        }
        const config = this.getConfig();
        const urlInput = document.getElementById('syncUrl');
        const keyInput = document.getElementById('syncAnonKey');
        if (urlInput && !urlInput.value) urlInput.value = config.url || '';
        if (keyInput && !keyInput.value) keyInput.value = config.anonKey || '';
        this.renderStatus();
    }

    renderStatus() {
        const el = document.getElementById('syncStatus');
        if (!el) return;
        const config = this.getConfig();
        const online = this.isOnline();

        if (!config.url || !config.anonKey) {
            el.innerHTML = `<span class="badge badge-secondary">Not configured</span>`;
        } else if (!online) {
            el.innerHTML = `<span class="badge badge-warning">Offline - working locally, will sync when back online</span>`;
        } else if (this.isConnected()) {
            el.innerHTML = `<span class="badge badge-success">Connected</span>`;
        } else {
            el.innerHTML = `<span class="badge badge-danger">Configured but not connected</span>`;
        }
    }

    async handleTestConnection() {
        const url = document.getElementById('syncUrl').value.trim();
        const key = document.getElementById('syncAnonKey').value.trim();
        if (!url || !key) {
            showToast('Enter both the Supabase URL and anon key first', 'error');
            return;
        }
        if (!this.isOnline()) {
            showToast('You appear to be offline - connect to the internet to test', 'error');
            return;
        }
        try {
            await this.testConnection(url, key);
            showToast('Connection successful', 'success');
        } catch (err) {
            showToast('Connection failed: ' + err.message, 'error');
        }
    }

    async handleSaveConfig() {
        const url = document.getElementById('syncUrl').value.trim();
        const key = document.getElementById('syncAnonKey').value.trim();
        if (!url || !key) {
            showToast('Enter both the Supabase URL and anon key', 'error');
            return;
        }
        this.saveConfig(url, key);
        showToast('Supabase configuration saved', 'success');
        if (this.isOnline()) {
            try {
                await this.connect();
                showToast('Connected to Supabase', 'success');
            } catch (err) {
                showToast('Saved, but could not connect yet: ' + err.message, 'warning');
            }
        }
        this.renderStatus();
    }

    async handlePush() {
        if (!this.client) {
            showToast('Not connected - save your configuration and ensure you are online first', 'error');
            return;
        }
        if (!confirm('Push all local data to Supabase now? This uploads every record from this device.')) return;
        const progressEl = document.getElementById('syncProgress');
        try {
            const result = await this.pushAll((done, total, collection) => {
                if (progressEl) progressEl.textContent = `Syncing ${collection}... (${done}/${total})`;
            });
            if (progressEl) progressEl.textContent = '';
            showToast(`Pushed ${result.collections} collection(s) to Supabase`, 'success');
        } catch (err) {
            if (progressEl) progressEl.textContent = '';
            showToast('Push failed: ' + err.message, 'error');
        }
    }

    async handlePull() {
        if (!this.client) {
            showToast('Not connected - save your configuration and ensure you are online first', 'error');
            return;
        }
        if (!confirm('Pull all data from Supabase now? This OVERWRITES local data on this device with what is in the cloud. Use this to restore onto a new device, not on a device with data you want to keep.')) return;
        try {
            const result = await this.pullAll();
            showToast(`Pulled ${result.records} record(s) across ${result.collections} collection(s). Reloading...`, 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            showToast('Pull failed: ' + err.message, 'error');
        }
    }

    handleDisconnect() {
        if (!confirm('Disconnect from Supabase? Your local data is unaffected, but new changes will stop mirroring to the cloud until reconfigured.')) return;
        this.clearConfig();
        document.getElementById('syncUrl').value = '';
        document.getElementById('syncAnonKey').value = '';
        this.renderStatus();
        showToast('Disconnected from Supabase', 'success');
    }

    getConfig() {
        try {
            return JSON.parse(window.storage?.storage.getItem(this.configKey) || '{}');
        } catch {
            return {};
        }
    }

    saveConfig(url, anonKey) {
        window.storage?.storage.setItem(this.configKey, JSON.stringify({ url, anonKey }));
    }

    clearConfig() {
        window.storage?.storage.removeItem(this.configKey);
        this.client = null;
    }

    isOnline() {
        return navigator.onLine;
    }

    isConnected() {
        return !!this.client;
    }

    /** Lazily load the Supabase JS SDK from CDN - only when actually configured, so offline use never depends on it. */
    loadSDK() {
        if (window.supabase) return Promise.resolve();
        if (this.sdkLoadPromise) return this.sdkLoadPromise;

        this.sdkLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load Supabase SDK - check your internet connection'));
            document.head.appendChild(script);
        });
        return this.sdkLoadPromise;
    }

    async connect() {
        const { url, anonKey } = this.getConfig();
        if (!url || !anonKey) throw new Error('Supabase URL and anon key are not configured');
        await this.loadSDK();
        this.client = window.supabase.createClient(url, anonKey);
        return this.client;
    }

    async testConnection(url, anonKey) {
        await this.loadSDK();
        const client = window.supabase.createClient(url, anonKey);
        const { error } = await client.from('lis_sync').select('sync_key').limit(1);
        if (error) throw new Error(error.message || 'Connection failed - check the table exists and credentials are correct');
        return true;
    }

    /** Mirror a single local write to Supabase, best-effort and non-blocking. */
    async mirrorWrite(action, collection, record) {
        if (!this.isOnline() || !this.client || !record?.id) return;
        try {
            const syncKey = `${collection}:${record.id}`;
            if (action === 'DELETE') {
                await this.client.from('lis_sync').delete().eq('sync_key', syncKey);
            } else {
                await this.client.from('lis_sync').upsert({
                    sync_key: syncKey,
                    collection,
                    record_id: record.id,
                    facility_id: record.facilityId ?? null,
                    data: record,
                    updated_at: new Date().toISOString()
                });
            }
        } catch {
            // Best-effort: a failed mirror must never block local work.
        }
    }

    /** Push every local collection up to Supabase in one go (initial sync / manual "Sync Now"). */
    async pushAll(onProgress) {
        if (!this.client) throw new Error('Not connected to Supabase');
        const collections = this.listLocalCollections();
        let done = 0;

        for (const collection of collections) {
            const records = storage.getAll(collection) || [];
            const rows = records.filter(r => r.id).map(r => ({
                sync_key: `${collection}:${r.id}`,
                collection,
                record_id: r.id,
                facility_id: r.facilityId ?? null,
                data: r,
                updated_at: new Date().toISOString()
            }));
            if (rows.length) {
                const { error } = await this.client.from('lis_sync').upsert(rows);
                if (error) throw new Error(`Failed syncing "${collection}": ${error.message}`);
            }
            done++;
            if (onProgress) onProgress(done, collections.length, collection);
        }
        return { collections: collections.length };
    }

    /** Pull all data from Supabase and overwrite local storage - destructive, used for restoring onto a fresh device. */
    async pullAll() {
        if (!this.client) throw new Error('Not connected to Supabase');
        const { data, error } = await this.client.from('lis_sync').select('*');
        if (error) throw new Error(error.message);

        const byCollection = {};
        (data || []).forEach(row => {
            if (!byCollection[row.collection]) byCollection[row.collection] = [];
            byCollection[row.collection].push(row.data);
        });

        Object.entries(byCollection).forEach(([collection, records]) => {
            const key = `${storage.prefix}${collection}`;
            storage.storage.setItem(key, JSON.stringify(records));
        });

        return { collections: Object.keys(byCollection).length, records: (data || []).length };
    }

    /** Every collection name currently present in localStorage under this app's prefix. */
    listLocalCollections() {
        const prefix = storage.prefix;
        const names = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const name = key.slice(prefix.length);
                if (!['session', 'remember', 'config', 'supabaseConfig', 'dismissedNotifications', 'notifiedKeys', 'rosterStaff'].includes(name)) {
                    names.add(name);
                }
            }
        }
        return [...names];
    }
}

let supabaseSync;
document.addEventListener('DOMContentLoaded', function () {
    supabaseSync = new SupabaseSync();
    window.supabaseSync = supabaseSync;
});
