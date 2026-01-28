/**
 * StorageManager - Manages extension storage operations
 * Handles whitelist and settings with a clean, unified API
 * Single Responsibility: Chrome storage abstraction
 */

class StorageManager {
  static KEYS = {
    WHITELIST: 'emojiBlocker_whitelist',
    SETTINGS: 'emojiBlocker_settings'
  };

  static DEFAULT_SETTINGS = {
    mode: 'hide',
    enabled: true
  };

  constructor(storage = chrome.storage.sync) {
    this.storage = storage;
  }

  /**
   * Get the current whitelist
   * @returns {Promise<string[]>}
   */
  async getWhitelist() {
    try {
      const result = await this.storage.get(StorageManager.KEYS.WHITELIST);
      return result[StorageManager.KEYS.WHITELIST] || [];
    } catch (error) {
      console.error('StorageManager: Error fetching whitelist:', error);
      return [];
    }
  }

  /**
   * Add a domain to whitelist
   * @param {string} domain - Domain to whitelist
   * @returns {Promise<boolean>} - True if added, false if already exists
   */
  async addToWhitelist(domain) {
    try {
      const whitelist = await this.getWhitelist();
      const normalized = this.normalizeDomain(domain);

      if (whitelist.includes(normalized)) return false;

      whitelist.push(normalized);
      await this.storage.set({ [StorageManager.KEYS.WHITELIST]: whitelist });
      return true;
    } catch (error) {
      console.error('StorageManager: Error adding to whitelist:', error);
      return false;
    }
  }

  /**
   * Remove a domain from whitelist
   * @param {string} domain - Domain to remove
   * @returns {Promise<boolean>} - True if removed, false if not found
   */
  async removeFromWhitelist(domain) {
    try {
      const whitelist = await this.getWhitelist();
      const normalized = this.normalizeDomain(domain);
      const index = whitelist.indexOf(normalized);

      if (index === -1) return false;

      whitelist.splice(index, 1);
      await this.storage.set({ [StorageManager.KEYS.WHITELIST]: whitelist });
      return true;
    } catch (error) {
      console.error('StorageManager: Error removing from whitelist:', error);
      return false;
    }
  }

  /**
   * Check if a domain is whitelisted
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>}
   */
  async isWhitelisted(domain) {
    try {
      const whitelist = await this.getWhitelist();
      return whitelist.includes(this.normalizeDomain(domain));
    } catch (error) {
      console.error('StorageManager: Error checking whitelist:', error);
      return false;
    }
  }

  /**
   * Clear entire whitelist
   * @returns {Promise<boolean>}
   */
  async clearWhitelist() {
    try {
      await this.storage.set({ [StorageManager.KEYS.WHITELIST]: [] });
      return true;
    } catch (error) {
      console.error('StorageManager: Error clearing whitelist:', error);
      return false;
    }
  }

  /**
   * Get current settings
   * @returns {Promise<{mode: string, enabled: boolean}>}
   */
  async getSettings() {
    try {
      const result = await this.storage.get(StorageManager.KEYS.SETTINGS);
      return { ...StorageManager.DEFAULT_SETTINGS, ...result[StorageManager.KEYS.SETTINGS] };
    } catch (error) {
      console.error('StorageManager: Error fetching settings:', error);
      return { ...StorageManager.DEFAULT_SETTINGS };
    }
  }

  /**
   * Update settings
   * @param {Object} settings - Partial settings to update
   * @returns {Promise<boolean>}
   */
  async updateSettings(settings) {
    try {
      const current = await this.getSettings();
      const merged = { ...current, ...settings };
      await this.storage.set({ [StorageManager.KEYS.SETTINGS]: merged });
      return true;
    } catch (error) {
      console.error('StorageManager: Error updating settings:', error);
      return false;
    }
  }

  /**
   * Normalize domain for consistent storage
   * @param {string} domain - Domain to normalize
   * @returns {string}
   */
  normalizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string}
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return this.normalizeDomain(urlObj.hostname);
    } catch {
      return this.normalizeDomain(url);
    }
  }
}

const WhitelistManager = StorageManager;

export { StorageManager, WhitelistManager };
