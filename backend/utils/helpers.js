// utils/helpers.js
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

class Helpers {
  /**
   * Generate a unique ID for various entities
   */
  static generateId(prefix = '') {
    const id = uuidv4().replace(/-/g, '').substring(0, 12);
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const isValid = Object.values(requirements).every(Boolean);
    const score = Object.values(requirements).filter(Boolean).length;

    return {
      isValid,
      score,
      requirements,
      feedback: this._getPasswordFeedback(requirements)
    };
  }

  /**
   * Calculate reading time for text content
   */
  static calculateReadingTime(text, wordsPerMinute = 200) {
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return {
      minutes,
      words,
      display: minutes > 1 ? `${minutes} minutes` : 'Less than a minute'
    };
  }

  /**
   * Format duration in seconds to human readable format
   */
  static formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Calculate percentage with safe division
   */
  static calculatePercentage(numerator, denominator, decimalPlaces = 2) {
    if (!denominator || denominator === 0) return 0;
    const percentage = (numerator / denominator) * 100;
    return Number(percentage.toFixed(decimalPlaces));
  }

  /**
   * Generate progress percentage for study goals
   */
  static calculateProgress(completed, total) {
    if (!total || total === 0) return 0;
    const progress = (completed / total) * 100;
    return Math.min(100, Math.max(0, Number(progress.toFixed(1))));
  }

  /**
   * Sanitize user input for database queries
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>&"']/g, '')
      .substring(0, 1000); // Limit length
  }

  /**
   * Format numbers with commas for display
   */
  static formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-IN');
  }

  /**
   * Generate a random string for various purposes
   */
  static generateRandomString(length = 8, type = 'alphanumeric') {
    const chars = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      numeric: '0123456789',
      alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      hex: '0123456789ABCDEF'
    };

    const characterSet = chars[type] || chars.alphanumeric;
    let result = '';

    for (let i = 0; i < length; i++) {
      result += characterSet.charAt(Math.floor(Math.random() * characterSet.length));
    }

    return result;
  }

  /**
   * Deep clone an object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      Object.keys(obj).forEach(key => {
        clonedObj[key] = this.deepClone(obj[key]);
      });
      return clonedObj;
    }
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
  }

  /**
   * Convert MongoDB document to plain object
   */
  static toPlainObject(doc) {
    if (doc instanceof mongoose.Document) {
      return doc.toObject();
    }
    if (Array.isArray(doc)) {
      return doc.map(item => this.toPlainObject(item));
    }
    return doc;
  }

  /**
   * Group array of objects by key
   */
  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * Sort array by multiple criteria
   */
  static sortByMultiple(array, criteria) {
    return array.sort((a, b) => {
      for (const { key, order = 'asc' } of criteria) {
        const aValue = a[key];
        const bValue = b[key];
        
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Debounce function for performance optimization
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function for rate limiting
   */
  static throttle(func, limit) {
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
   * Parse query parameters with validation
   */
  static parseQueryParams(query, allowedParams = []) {
    const parsed = {};
    
    Object.keys(query).forEach(key => {
      if (allowedParams.length === 0 || allowedParams.includes(key)) {
        let value = query[key];
        
        // Convert string numbers to numbers
        if (!isNaN(value) && value !== '') {
          value = Number(value);
        }
        
        // Convert string booleans
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        
        // Handle arrays
        if (typeof value === 'string' && value.includes(',')) {
          value = value.split(',').map(item => item.trim());
        }
        
        parsed[key] = value;
      }
    });
    
    return parsed;
  }

  /**
   * Generate pagination metadata
   */
  static generatePagination(page, limit, totalItems) {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (currentPage - 1) * pageSize;

    return {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      skip,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1
    };
  }

  /**
   * Calculate average from array of numbers
   */
  static calculateAverage(numbers, decimalPlaces = 2) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const average = sum / numbers.length;
    return Number(average.toFixed(decimalPlaces));
  }

  /**
   * Calculate standard deviation
   */
  static calculateStandardDeviation(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    
    const average = this.calculateAverage(numbers);
    const squareDiffs = numbers.map(num => {
      const diff = num - average;
      return diff * diff;
    });
    
    const avgSquareDiff = this.calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Generate color based on performance score
   */
  static getPerformanceColor(score, type = 'hex') {
    let color;
    
    if (score >= 90) color = '#10B981'; // Green
    else if (score >= 75) color = '#3B82F6'; // Blue
    else if (score >= 60) color = '#F59E0B'; // Yellow
    else if (score >= 40) color = '#EF4444'; // Red
    else color = '#6B7280'; // Gray
    
    if (type === 'rgb') {
      return this.hexToRgb(color);
    }
    
    return color;
  }

  /**
   * Convert hex color to RGB
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate and parse JSON safely
   */
  static safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Get current timestamp in various formats
   */
  static getTimestamp(format = 'iso') {
    const now = new Date();
    
    switch (format) {
      case 'iso':
        return now.toISOString();
      case 'unix':
        return Math.floor(now.getTime() / 1000);
      case 'mysql':
        return now.toISOString().slice(0, 19).replace('T', ' ');
      case 'human':
        return now.toLocaleString('en-IN');
      default:
        return now.toISOString();
    }
  }

  /**
   * Calculate age from birth date
   */
  static calculateAge(birthDate) {
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
   * Generate ordinal suffix for numbers
   */
  static getOrdinalSuffix(num) {
    if (!Number.isInteger(num)) return '';
    
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  }

  /**
   * Private method for password feedback
   */
  static _getPasswordFeedback(requirements) {
    const feedback = [];
    
    if (!requirements.minLength) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!requirements.hasUpperCase) {
      feedback.push('Include at least one uppercase letter');
    }
    if (!requirements.hasLowerCase) {
      feedback.push('Include at least one lowercase letter');
    }
    if (!requirements.hasNumbers) {
      feedback.push('Include at least one number');
    }
    if (!requirements.hasSpecialChar) {
      feedback.push('Include at least one special character');
    }
    
    return feedback;
  }
}

module.exports = Helpers;