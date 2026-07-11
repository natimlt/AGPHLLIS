/**
 * ======================================================
 * AGPHL LIS - Utilities Module
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * Common utility functions used throughout the application.
 * ======================================================
 */

class Utils {
    /**
     * Format date
     * @param {string|Date} date - Date to format
     * @param {string} format - Format string
     * @returns {string} Formatted date
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

        return format
            .replace('ddd', weekday)
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency symbol
     * @returns {string} Formatted currency
     */
    static formatCurrency(amount, currency = 'ETB') {
        return `${currency} ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    /**
     * Generate random ID
     * @param {number} length - Length of ID
     * @returns {string} Random ID
     */
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < length; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Generate barcode number
     * @returns {string} Barcode number
     */
    static generateBarcode() {
        let barcode = '';
        for (let i = 0; i < 13; i++) {
            barcode += Math.floor(Math.random() * 10);
        }
        return barcode;
    }

    /**
     * Generate laboratory number
     * @returns {string} Laboratory number
     */
    static generateLabNumber() {
        const prefix = 'LAB';
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `${prefix}${year}${month}${day}${random}`;
    }

    /**
     * Generate MRN (Medical Record Number)
     * @returns {string} MRN
     */
    static generateMRN() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const prefix = letters.charAt(Math.floor(Math.random() * 26)) + 
                      letters.charAt(Math.floor(Math.random() * 26));
        const numbers = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        return `${prefix}${numbers}`;
    }

    /**
     * Get age from birth date
     * @param {string} birthDate - Birth date
     * @returns {number} Age in years
     */
    static getAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in ms
     * @returns {Function} Throttled function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Merge objects deeply
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    static deepMerge(target, source) {
        const result = { ...target };
        for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.deepMerge(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate color from string
     * @param {string} str - String to generate color from
     * @returns {string} Color hex code
     */
    static stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean} True if empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Get initials from name
     * @param {string} name - Full name
     * @returns {string} Initials
     */
    static getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ').filter(part => part.length > 0);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    /**
     * Truncate text
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add
     * @returns {string} Truncated text
     */
    static truncate(text, length = 50, suffix = '...') {
        if (!text) return '';
        text = String(text);
        if (text.length <= length) return text;
        return text.substring(0, length) + suffix;
    }

    /**
     * Escape HTML
     * @param {string} html - HTML to escape
     * @returns {string} Escaped HTML
     */
    static escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} type - MIME type
     */
    static downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Copy to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise} Promise
     */
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text);
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise} Promise
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file);
        });
    }

    /**
     * Read file as Data URL
     * @param {File} file - File to read
     * @returns {Promise} Promise
     */
    static readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Generate pagination
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @param {number} maxVisible - Maximum visible pages
     * @returns {Array} Page numbers
     */
    static generatePagination(currentPage, totalPages, maxVisible = 5) {
        const pages = [];
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        const halfVisible = Math.floor(maxVisible / 2);
        let start = Math.max(1, currentPage - halfVisible);
        let end = Math.min(totalPages, currentPage + halfVisible);

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    }

    /**
     * Get status color
     * @param {string} status - Status string
     * @returns {string} Color class
     */
    static getStatusColor(status) {
        const colors = {
            'active': 'success',
            'inactive': 'danger',
            'pending': 'warning',
            'completed': 'success',
            'rejected': 'danger',
            'cancelled': 'danger',
            'in-progress': 'info',
            'review': 'warning',
            'approved': 'success',
            'failed': 'danger'
        };
        if (!status) return 'secondary';
        return colors[String(status).toLowerCase()] || 'secondary';
    }

    /**
     * Get status badge HTML
     * @param {string} status - Status string
     * @returns {string} Badge HTML
     */
    static getStatusBadge(status) {
        const color = this.getStatusColor(status);
        return `<span class="badge badge-${color}">${status}</span>`;
    }

    /**
     * Get time ago string
     * @param {string|Date} date - Date
     * @returns {string} Time ago
     */
    static timeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        if (months < 12) return `${months}mo ago`;
        return `${years}y ago`;
    }

    /**
     * Draw a simple bar chart on a canvas. Shared helper so new modules
     * (TAT, Workload, Quality Indicators...) don't duplicate canvas code.
     * @param {string} canvasId
     * @param {string[]} labels
     * @param {number[]} values
     * @param {Object} opts - {colors, valueFormatter, emptyText}
     */
    static drawBarChart(canvasId, labels, values, opts = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const colors = opts.colors || ['#1a66f5', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#fd7e14', '#6f42c1'];
        const fmt = opts.valueFormatter || (v => v);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!values.length || values.every(v => !v)) {
            ctx.fillStyle = '#adb5bd';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(opts.emptyText || 'No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 45;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const barWidth = Math.min(50, chartWidth / values.length - 10);
        const maxValue = Math.max(...values, 1);

        // target line
        if (typeof opts.targetLine === 'number') {
            const y = padding + chartHeight - (opts.targetLine / maxValue) * chartHeight;
            ctx.strokeStyle = '#dc3545';
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        values.forEach((value, index) => {
            const x = padding + index * (barWidth + 10);
            const barHeight = (value / maxValue) * chartHeight;
            const y = padding + chartHeight - barHeight;

            ctx.fillStyle = (opts.barColor && opts.barColor(value, index)) || colors[index % colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);

            ctx.fillStyle = '#495057';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(fmt(value), x + barWidth / 2, y - 5);

            ctx.fillStyle = '#6c757d';
            ctx.font = '10px sans-serif';
            const label = (labels[index] || '').substring(0, 12);
            ctx.fillText(label, x + barWidth / 2, padding + chartHeight + 15);
        });
    }

    /**
     * Draw a simple line chart on a canvas (trend over time).
     * @param {string} canvasId
     * @param {string[]} labels
     * @param {number[]} values
     * @param {Object} opts - {color, valueFormatter, emptyText, targetLine}
     */
    static drawLineChart(canvasId, labels, values, opts = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const color = opts.color || '#1a66f5';
        const fmt = opts.valueFormatter || (v => v);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!values.length || values.every(v => v === 0)) {
            ctx.fillStyle = '#adb5bd';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(opts.emptyText || 'No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const maxValue = Math.max(...values, opts.minMax || 1) * 1.1;

        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }

        if (typeof opts.targetLine === 'number') {
            const y = padding + chartHeight - (opts.targetLine / maxValue) * chartHeight;
            ctx.strokeStyle = '#dc3545';
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        values.forEach((value, index) => {
            const x = padding + (index / Math.max(values.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        values.forEach((value, index) => {
            const x = padding + (index / Math.max(values.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#6c757d';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            if (labels.length > 10 && index % Math.ceil(labels.length / 10) !== 0) return;
            const x = padding + (index / Math.max(values.length - 1, 1)) * chartWidth;
            ctx.fillText(label, x, padding + chartHeight + 15);
        });
    }
}

// Make utils globally available
window.Utils = Utils;