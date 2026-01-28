/**
 * Service Worker - Background script for extension
 * Handles extension lifecycle and cross-page communication
 */

/**
 * StorageManager - Embedded for service worker (ES module context)
 * Mirrors src/core/StorageManager.js
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

  async getWhitelist() {
    try {
      const result = await this.storage.get(StorageManager.KEYS.WHITELIST);
      return result[StorageManager.KEYS.WHITELIST] || [];
    } catch (error) {
      console.error('StorageManager: Error fetching whitelist:', error);
      return [];
    }
  }

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

  async isWhitelisted(domain) {
    try {
      const whitelist = await this.getWhitelist();
      return whitelist.includes(this.normalizeDomain(domain));
    } catch (error) {
      console.error('StorageManager: Error checking whitelist:', error);
      return false;
    }
  }

  async clearWhitelist() {
    try {
      await this.storage.set({ [StorageManager.KEYS.WHITELIST]: [] });
      return true;
    } catch (error) {
      console.error('StorageManager: Error clearing whitelist:', error);
      return false;
    }
  }

  async getSettings() {
    try {
      const result = await this.storage.get(StorageManager.KEYS.SETTINGS);
      return { ...StorageManager.DEFAULT_SETTINGS, ...result[StorageManager.KEYS.SETTINGS] };
    } catch (error) {
      console.error('StorageManager: Error fetching settings:', error);
      return { ...StorageManager.DEFAULT_SETTINGS };
    }
  }

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

  normalizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }

  extractDomain(url) {
    try {
      return this.normalizeDomain(new URL(url).hostname);
    } catch {
      return this.normalizeDomain(url);
    }
  }
}

/**
 * Background Service - Handles extension lifecycle
 */
class BackgroundService {
  constructor() {
    this.storage = new StorageManager();
    this.NORMAL_ICON = {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    };
    this.CROSSED_ICON = {
      16: 'icons/icon16-crossed.png',
      32: 'icons/icon32-crossed.png',
      48: 'icons/icon48-crossed.png',
      128: 'icons/icon128-crossed.png'
    };
  }

  init() {
    chrome.runtime.onInstalled.addListener(() => this.handleInstall());
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[StorageManager.KEYS.SETTINGS]) {
        const enabled = changes[StorageManager.KEYS.SETTINGS].newValue?.enabled;
        if (typeof enabled === 'boolean') this.setActionIcon(enabled);
      }
    });
    chrome.runtime.onMessage.addListener((msg, sender, respond) => {
      this.handleMessage(msg, sender, respond);
      return true;
    });

    chrome.tabs.onActivated.addListener(({ tabId }) => this.updateIcon(tabId));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') this.updateIcon(tabId);
    });

    this.updateIcon();
  }

  async handleInstall() {
    const settings = await this.storage.getSettings();
    if (!settings.mode) {
      await this.storage.updateSettings({ mode: 'desaturate', enabled: true });
    }
    await this.setActionIcon(settings.enabled);
    console.log('Emoji Blocker: Extension installed');
  }

  async handleMessage(message, _sender, sendResponse) {
    try {
      switch (message.action) {
        case 'getWhitelist': {
          const whitelist = await this.storage.getWhitelist();
          sendResponse({ success: true, data: whitelist });
          break;
        }
        case 'addToWhitelist':
          await this.storage.addToWhitelist(message.domain);
          sendResponse({ success: true });
          this.notifyContentScripts(message.domain, 'reloadPage');
          break;
        case 'removeFromWhitelist':
          await this.storage.removeFromWhitelist(message.domain);
          sendResponse({ success: true });
          this.notifyContentScripts(message.domain, 'reloadPage');
          break;
        case 'isWhitelisted': {
          const isWhitelisted = await this.storage.isWhitelisted(message.domain);
          sendResponse({ success: true, data: isWhitelisted });
          break;
        }
        case 'getSettings': {
          const settings = await this.storage.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        }
        case 'updateSettings':
          await this.storage.updateSettings(message.settings);
          sendResponse({ success: true });
          this.broadcastToAllTabs('updateMode', { mode: message.settings.mode });
          if (typeof message.settings.enabled === 'boolean') {
            await this.setActionIcon(message.settings.enabled);
          }
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async notifyContentScripts(domain, action) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.url?.includes(domain)) {
        chrome.tabs.sendMessage(tab.id, { action }).catch(() => {});
      }
    });
  }

  async broadcastToAllTabs(action, data = {}) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {});
    });
  }

  async updateIcon(tabId) {
    try {
      if (tabId) {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url) return;
      }

      const settings = await this.storage.getSettings();
      await this.setActionIcon(settings.enabled);
    } catch {
      /* Ignore errors for chrome:// pages etc. */
    }
  }

  async setActionIcon(enabled) {
    const path = this.getIconPath(enabled);
    try {
      await chrome.action.setIcon({ path });
    } catch {
      try {
        await chrome.action.setIcon({ path: this.getIconPath(false) });
      } catch {
        /* ignore */
      }
    }
  }

  getIconPath(enabled) {
    const icons = enabled ? this.CROSSED_ICON : this.NORMAL_ICON;
    return Object.fromEntries(
      Object.entries(icons).map(([size, iconPath]) => [size, chrome.runtime.getURL(iconPath)])
    );
  }
}

const backgroundService = new BackgroundService();
backgroundService.init();
