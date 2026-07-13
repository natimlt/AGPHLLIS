/**
 * ======================================================
 * AGPHL LIS - Storage Manager
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * This module handles all Local Storage operations.
 * Designed to be easily replaceable with SQLite, MySQL,
 * PostgreSQL, Firebase, or REST APIs in future versions.
 * ======================================================
 */

class StorageManager {
    /**
     * Initialize the storage manager
     * @param {string} prefix - Prefix for all storage keys
     */
    constructor(prefix = 'agphl_') {
        this.prefix = prefix;
        this.storage = window.localStorage;
        // Modules (e.g. supabase-sync.js) can push a callback here to be
        // notified of every create/update/delete, so cloud sync stays
        // decoupled from the core storage engine.
        this.writeHooks = [];
    }

    onWrite(callback) {
        this.writeHooks.push(callback);
    }

    _notifyWrite(action, collection, record) {
        this.writeHooks.forEach(cb => {
            try { cb(action, collection, record); } catch { /* a broken hook must not break local storage */ }
        });
    }

    /**
     * Generate a unique ID for new records
     * @param {string} collection - Collection name
     * @returns {string} Unique ID
     */
    generateId(collection) {
        const key = `${this.prefix}${collection}_counter`;
        let counter = parseInt(this.storage.getItem(key)) || 0;
        counter++;
        this.storage.setItem(key, counter.toString());
        return `${collection}_${Date.now()}_${counter}`;
    }

    /**
     * Create a new record
     * @param {string} collection - Collection name
     * @param {Object} data - Record data
     * @returns {Object} Created record with ID
     */
    /**
     * Collections that belong to one facility (hospital) and must stay
     * separated between facilities sharing this LIS deployment. Records
     * in these collections get auto-tagged with the creating user's
     * facilityId, and getAllScoped() filters reads by it.
     */
    static FACILITY_SCOPED_COLLECTIONS = ['patients', 'samples', 'results'];

    create(collection, data) {
        try {
            const key = `${this.prefix}${collection}`;
            let records = this.getAll(collection);
            
            // Generate ID
            const id = this.generateId(collection);
            const record = {
                id: id,
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (StorageManager.FACILITY_SCOPED_COLLECTIONS.includes(collection) && record.facilityId === undefined) {
                const session = this.getCurrentUser();
                record.facilityId = session ? (session.facilityId ?? null) : null;
            }

            records.push(record);
            this.storage.setItem(key, JSON.stringify(records));
            
            // Audit trail
            this.createAuditLog('CREATE', collection, id, data);
            this._notifyWrite('CREATE', collection, record);
            
            return record;
        } catch (error) {
            console.error('Storage Create Error:', error);
            throw new Error('Failed to create record: ' + error.message);
        }
    }

    /**
     * Like getAll(), but for facility-scoped collections (patients,
     * samples, results) it also filters to the current user's facility -
     * unless they're an Administrator (facilityId null = all facilities)
     * or the collection isn't facility-scoped, in which case it behaves
     * exactly like getAll().
     */
    getAllScoped(collection) {
        const all = this.getAll(collection);
        if (!StorageManager.FACILITY_SCOPED_COLLECTIONS.includes(collection)) return all;

        const session = this.getCurrentUser();
        if (!session || session.facilityId === null || session.facilityId === undefined) return all;
        return all.filter(r => r.facilityId === session.facilityId || r.facilityId === undefined);
    }

    /**
     * Get all records from a collection
     * @param {string} collection - Collection name
     * @returns {Array} Array of records
     */
    getAll(collection) {
        try {
            const key = `${this.prefix}${collection}`;
            const data = this.storage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Storage GetAll Error:', error);
            return [];
        }
    }

    /**
     * Get a single record by ID
     * @param {string} collection - Collection name
     * @param {string} id - Record ID
     * @returns {Object|null} Record or null if not found
     */
    getById(collection, id) {
        try {
            const records = this.getAll(collection);
            return records.find(record => record.id === id) || null;
        } catch (error) {
            console.error('Storage GetById Error:', error);
            return null;
        }
    }

    /**
     * Update a record
     * @param {string} collection - Collection name
     * @param {string} id - Record ID
     * @param {Object} data - Updated data
     * @returns {Object|null} Updated record or null
     */
    update(collection, id, data) {
        try {
            const key = `${this.prefix}${collection}`;
            let records = this.getAll(collection);
            const index = records.findIndex(record => record.id === id);
            
            if (index === -1) {
                throw new Error('Record not found');
            }

            const oldData = { ...records[index] };
            records[index] = {
                ...records[index],
                ...data,
                updatedAt: new Date().toISOString()
            };

            this.storage.setItem(key, JSON.stringify(records));
            
            // Audit trail
            this.createAuditLog('UPDATE', collection, id, {
                old: oldData,
                new: records[index]
            });
            this._notifyWrite('UPDATE', collection, records[index]);

            return records[index];
        } catch (error) {
            console.error('Storage Update Error:', error);
            throw new Error('Failed to update record: ' + error.message);
        }
    }

    /**
     * Delete a record
     * @param {string} collection - Collection name
     * @param {string} id - Record ID
     * @returns {boolean} True if deleted
     */
    delete(collection, id) {
        try {
            const key = `${this.prefix}${collection}`;
            let records = this.getAll(collection);
            const record = records.find(r => r.id === id);
            
            if (!record) {
                throw new Error('Record not found');
            }

            records = records.filter(record => record.id !== id);
            this.storage.setItem(key, JSON.stringify(records));
            
            // Audit trail
            this.createAuditLog('DELETE', collection, id, record);
            this._notifyWrite('DELETE', collection, record);

            return true;
        } catch (error) {
            console.error('Storage Delete Error:', error);
            throw new Error('Failed to delete record: ' + error.message);
        }
    }

    /**
     * Search records by field value
     * @param {string} collection - Collection name
     * @param {string} field - Field to search
     * @param {string} value - Value to search for
     * @param {boolean} exactMatch - If true, exact match; else partial
     * @returns {Array} Matching records
     */
    search(collection, field, value, exactMatch = false) {
        try {
            const records = this.getAll(collection);
            return records.filter(record => {
                const recordValue = record[field];
                if (recordValue === undefined || recordValue === null) return false;
                
                if (exactMatch) {
                    return String(recordValue).toLowerCase() === String(value).toLowerCase();
                } else {
                    return String(recordValue).toLowerCase().includes(String(value).toLowerCase());
                }
            });
        } catch (error) {
            console.error('Storage Search Error:', error);
            return [];
        }
    }

    /**
     * Sort records by field
     * @param {string} collection - Collection name
     * @param {string} field - Field to sort by
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted records
     */
    sort(collection, field, order = 'asc') {
        try {
            const records = this.getAll(collection);
            return records.sort((a, b) => {
                const aVal = a[field];
                const bVal = b[field];
                if (aVal === undefined || bVal === undefined) return 0;
                
                let comparison = 0;
                if (typeof aVal === 'string') {
                    comparison = aVal.localeCompare(bVal);
                } else {
                    comparison = aVal - bVal;
                }
                return order === 'asc' ? comparison : -comparison;
            });
        } catch (error) {
            console.error('Storage Sort Error:', error);
            return [];
        }
    }

    /**
     * Filter records by multiple criteria
     * @param {string} collection - Collection name
     * @param {Object} filters - Key-value pairs to filter by
     * @returns {Array} Filtered records
     */
    filter(collection, filters) {
        try {
            const records = this.getAll(collection);
            return records.filter(record => {
                for (const [key, value] of Object.entries(filters)) {
                    if (record[key] !== value) return false;
                }
                return true;
            });
        } catch (error) {
            console.error('Storage Filter Error:', error);
            return [];
        }
    }

    /**
     * Check if a record exists by field value
     * @param {string} collection - Collection name
     * @param {string} field - Field to check
     * @param {string} value - Value to check
     * @returns {boolean} True if exists
     */
    exists(collection, field, value) {
        try {
            const records = this.getAll(collection);
            return records.some(record => record[field] === value);
        } catch (error) {
            console.error('Storage Exists Error:', error);
            return false;
        }
    }

    /**
     * Get count of records in collection
     * @param {string} collection - Collection name
     * @returns {number} Count of records
     */
    count(collection) {
        try {
            return this.getAll(collection).length;
        } catch (error) {
            console.error('Storage Count Error:', error);
            return 0;
        }
    }

    /**
     * Export all data as JSON
     * @returns {string} JSON string of all data
     */
    exportAll() {
        try {
            const data = {};
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    const value = this.storage.getItem(key);
                    data[key] = JSON.parse(value);
                }
            }
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Storage Export Error:', error);
            throw new Error('Failed to export data: ' + error.message);
        }
    }

    /**
     * Import data from JSON
     * @param {string} json - JSON string of data
     * @param {boolean} merge - If true, merge with existing data
     */
    importAll(json, merge = true) {
        try {
            const data = JSON.parse(json);
            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith(this.prefix)) {
                    if (merge) {
                        const existing = this.storage.getItem(key);
                        if (existing) {
                            const existingData = JSON.parse(existing);
                            const mergedData = this.mergeArrays(existingData, value);
                            this.storage.setItem(key, JSON.stringify(mergedData));
                            continue;
                        }
                    }
                    this.storage.setItem(key, JSON.stringify(value));
                }
            }
            return true;
        } catch (error) {
            console.error('Storage Import Error:', error);
            throw new Error('Failed to import data: ' + error.message);
        }
    }

    /**
     * Merge two arrays with unique IDs
     * @param {Array} existing - Existing array
     * @param {Array} incoming - Incoming array
     * @returns {Array} Merged array
     */
    mergeArrays(existing, incoming) {
        const existingIds = new Set(existing.map(item => item.id));
        const merged = [...existing];
        for (const item of incoming) {
            if (!existingIds.has(item.id)) {
                merged.push(item);
            }
        }
        return merged;
    }

    /**
     * Backup all data to JSON file
     * @param {string} filename - Backup filename
     */
    backup(filename = 'agphl_backup.json') {
        try {
            const data = this.exportAll();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Log backup
            this.createAuditLog('BACKUP', 'system', null, { filename, timestamp: new Date().toISOString() });
            
            return true;
        } catch (error) {
            console.error('Storage Backup Error:', error);
            throw new Error('Failed to backup data: ' + error.message);
        }
    }

    /**
     * Restore data from JSON file
     * @param {File} file - JSON file
     * @param {boolean} merge - If true, merge with existing data
     */
    restore(file, merge = true) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.importAll(e.target.result, merge);
                    this.createAuditLog('RESTORE', 'system', null, { 
                        filename: file.name, 
                        timestamp: new Date().toISOString(),
                        merge 
                    });
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Clear all data
     * @param {string} collection - Optional specific collection
     */
    clear(collection = null) {
        try {
            if (collection) {
                const key = `${this.prefix}${collection}`;
                this.storage.removeItem(key);
                this.storage.removeItem(`${this.prefix}${collection}_counter`);
            } else {
                const keys = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keys.push(key);
                    }
                }
                for (const key of keys) {
                    this.storage.removeItem(key);
                }
            }
            return true;
        } catch (error) {
            console.error('Storage Clear Error:', error);
            throw new Error('Failed to clear data: ' + error.message);
        }
    }

    /**
     * Create audit trail entry
     * @param {string} action - CREATE, UPDATE, DELETE, BACKUP, RESTORE
     * @param {string} collection - Collection name
     * @param {string} recordId - Record ID
     * @param {Object} data - Audit data
     */
    createAuditLog(action, collection, recordId, data) {
        try {
            const audit = {
                id: this.generateId('audit'),
                action: action,
                collection: collection,
                recordId: recordId,
                data: data,
                user: this.getCurrentUser(),
                timestamp: new Date().toISOString()
            };
            
            const key = `${this.prefix}audit`;
            let records = this.getAll('audit');
            records.push(audit);
            this.storage.setItem(key, JSON.stringify(records));
            
            return audit;
        } catch (error) {
            console.error('Audit Log Error:', error);
        }
    }

    /**
     * Get current user from session
     * @returns {Object|null} Current user or null
     */
    getCurrentUser() {
        try {
            const session = this.storage.getItem(`${this.prefix}session`);
            return session ? JSON.parse(session) : null;
        } catch {
            return null;
        }
    }
}

// Initialize storage manager
const storage = new StorageManager('agphl_');

// Make it globally available
window.storage = storage;