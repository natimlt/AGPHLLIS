/**
 * ======================================================
 * AGPHL LIS - Validation Module
 * Version: 1.0
 * Developer: Asrat Genet
 * 
 * Provides validation functions for forms and data.
 * ======================================================
 */

class Validator {
    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    static isEmail(email) {
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return pattern.test(email);
    }

    /**
     * Validate phone number (Ethiopian format)
     * @param {string} phone - Phone to validate
     * @returns {boolean} True if valid
     */
    static isPhone(phone) {
        const pattern = /^(\+251|0)?[97][0-9]{8}$/;
        return pattern.test(phone);
    }

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {boolean} True if valid
     */
    static isUsername(username) {
        const pattern = /^[a-zA-Z0-9_]{3,30}$/;
        return pattern.test(username);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    static validatePassword(password) {
        const result = {
            isValid: false,
            errors: []
        };

        if (password.length < 6) {
            result.errors.push('Password must be at least 6 characters');
        }

        if (!/[A-Z]/.test(password)) {
            result.errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            result.errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            result.errors.push('Password must contain at least one number');
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * Validate required field
     * @param {string} value - Value to check
     * @param {string} fieldName - Field name for error message
     * @returns {string|null} Error message or null
     */
    static required(value, fieldName = 'Field') {
        if (!value || value.trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    }

    /**
     * Validate minimum length
     * @param {string} value - Value to check
     * @param {number} min - Minimum length
     * @param {string} fieldName - Field name
     * @returns {string|null} Error message or null
     */
    static minLength(value, min, fieldName = 'Field') {
        if (value && value.length < min) {
            return `${fieldName} must be at least ${min} characters`;
        }
        return null;
    }

    /**
     * Validate maximum length
     * @param {string} value - Value to check
     * @param {number} max - Maximum length
     * @param {string} fieldName - Field name
     * @returns {string|null} Error message or null
     */
    static maxLength(value, max, fieldName = 'Field') {
        if (value && value.length > max) {
            return `${fieldName} must not exceed ${max} characters`;
        }
        return null;
    }

    /**
     * Validate date
     * @param {string} date - Date to validate
     * @returns {boolean} True if valid
     */
    static isDate(date) {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d);
    }

    /**
     * Validate date range
     * @param {string} start - Start date
     * @param {string} end - End date
     * @returns {boolean} True if valid range
     */
    static isDateRange(start, end) {
        if (!this.isDate(start) || !this.isDate(end)) return false;
        return new Date(start) <= new Date(end);
    }

    /**
     * Validate numeric value
     * @param {*} value - Value to check
     * @returns {boolean} True if numeric
     */
    static isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Validate integer
     * @param {*} value - Value to check
     * @returns {boolean} True if integer
     */
    static isInteger(value) {
        return Number.isInteger(Number(value));
    }

    /**
     * Validate positive number
     * @param {*} value - Value to check
     * @returns {boolean} True if positive
     */
    static isPositive(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate Medical Record Number (Ethiopian format)
     * @param {string} mrn - Medical Record Number
     * @returns {boolean} True if valid
     */
    static isMRN(mrn) {
        const pattern = /^[A-Z]{2}[0-9]{6}$/;
        return pattern.test(mrn);
    }

    /**
     * Validate laboratory number
     * @param {string} labNo - Laboratory number
     * @returns {boolean} True if valid
     */
    static isLabNumber(labNo) {
        const pattern = /^[A-Z]{3}[0-9]{8}$/;
        return pattern.test(labNo);
    }

    /**
     * Validate barcode
     * @param {string} barcode - Barcode to validate
     * @returns {boolean} True if valid
     */
    static isBarcode(barcode) {
        const pattern = /^[0-9]{13}$/;
        return pattern.test(barcode);
    }

    /**
     * Validate form data with rules
     * @param {Object} data - Form data
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    static validateForm(data, rules) {
        const errors = {};
        let isValid = true;

        for (const [field, ruleSet] of Object.entries(rules)) {
            const value = data[field] || '';
            const errorsList = [];

            for (const [rule, param] of Object.entries(ruleSet)) {
                let error = null;

                switch (rule) {
                    case 'required':
                        error = this.required(value, field);
                        break;
                    case 'email':
                        if (value && !this.isEmail(value)) {
                            error = 'Please enter a valid email address';
                        }
                        break;
                    case 'phone':
                        if (value && !this.isPhone(value)) {
                            error = 'Please enter a valid phone number';
                        }
                        break;
                    case 'username':
                        if (value && !this.isUsername(value)) {
                            error = 'Username must be 3-30 characters (letters, numbers, underscore)';
                        }
                        break;
                    case 'minLength':
                        error = this.minLength(value, param, field);
                        break;
                    case 'maxLength':
                        error = this.maxLength(value, param, field);
                        break;
                    case 'numeric':
                        if (value && !this.isNumeric(value)) {
                            error = 'Please enter a valid number';
                        }
                        break;
                    case 'integer':
                        if (value && !this.isInteger(value)) {
                            error = 'Please enter a whole number';
                        }
                        break;
                    case 'positive':
                        if (value && !this.isPositive(value)) {
                            error = 'Please enter a positive number';
                        }
                        break;
                    case 'date':
                        if (value && !this.isDate(value)) {
                            error = 'Please enter a valid date';
                        }
                        break;
                    case 'url':
                        if (value && !this.isUrl(value)) {
                            error = 'Please enter a valid URL';
                        }
                        break;
                    case 'mrn':
                        if (value && !this.isMRN(value)) {
                            error = 'Please enter a valid MRN (e.g., AB123456)';
                        }
                        break;
                    case 'labNumber':
                        if (value && !this.isLabNumber(value)) {
                            error = 'Please enter a valid lab number (e.g., LAB12345678)';
                        }
                        break;
                    case 'barcode':
                        if (value && !this.isBarcode(value)) {
                            error = 'Please enter a valid barcode (13 digits)';
                        }
                        break;
                    case 'match':
                        if (value !== data[param]) {
                            error = 'Fields do not match';
                        }
                        break;
                    default:
                        break;
                }

                if (error) {
                    errorsList.push(error);
                }
            }

            if (errorsList.length > 0) {
                errors[field] = errorsList;
                isValid = false;
            }
        }

        return {
            isValid,
            errors
        };
    }

    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    static sanitize(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitize form data
     * @param {Object} data - Form data
     * @returns {Object} Sanitized data
     */
    static sanitizeForm(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitize(value).trim();
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}

// Make validator globally available
window.Validator = Validator;