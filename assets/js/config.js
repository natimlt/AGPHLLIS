/**
 * ======================================================
 * AGPHL LIS - Configuration Manager
 * Version: 1.0
 *
 * Stores lab-wide customization settings that other
 * modules read from: which dashboard widgets are shown,
 * and the priority multipliers used to derive a sample's
 * target TAT from its base test TAT. Backed by a single
 * JSON object in localStorage (not a record collection).
 * ======================================================
 */

class ConfigManager {
    constructor() {
        this.key = 'agphl_config';
    }

    defaults() {
        return {
            tatMultipliers: { Routine: 1, Urgent: 0.7, ASAP: 0.5, Stat: 0.4 },
            widgets: {
                tat: { stats: true, deptChart: true, trendChart: true, table: true },
                availability: { stats: true, table: true },
                qi: { summary: true, register: true },
                workload: { stats: true, deptChart: true, trendChart: true, staffTable: true, equipment: true }
            }
        };
    }

    /**
     * Deep-merge b into a, returning a new object. Arrays in b replace
     * arrays in a wholesale (not merged element-wise).
     */
    deepMerge(a, b) {
        const out = { ...a };
        for (const k in b) {
            if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
                out[k] = this.deepMerge(a[k] || {}, b[k]);
            } else {
                out[k] = b[k];
            }
        }
        return out;
    }

    get() {
        try {
            const raw = window.storage?.storage.getItem(this.key);
            if (!raw) return this.defaults();
            return this.deepMerge(this.defaults(), JSON.parse(raw));
        } catch {
            return this.defaults();
        }
    }

    set(partial) {
        const merged = this.deepMerge(this.get(), partial);
        window.storage?.storage.setItem(this.key, JSON.stringify(merged));
        window.storage?.createAuditLog?.('CONFIG_UPDATED', 'systemConfig', 'global', partial);
        return merged;
    }

    reset() {
        window.storage?.storage.removeItem(this.key);
        return this.defaults();
    }
}

const configManager = new ConfigManager();
window.configManager = configManager;
