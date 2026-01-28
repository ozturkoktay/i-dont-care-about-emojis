/**
 * StorageManager Tests
 * Tests for the consolidated storage management module
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { StorageManager } from '../src/core/StorageManager';

global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('StorageManager', () => {
  let manager;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      data: {},
      get: jest.fn((key) => Promise.resolve({ [key]: mockStorage.data[key] })),
      set: jest.fn((obj) => {
        Object.assign(mockStorage.data, obj);
        return Promise.resolve();
      })
    };
    
    manager = new StorageManager(mockStorage);
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('static properties', () => {
    test('should have correct KEYS', () => {
      expect(StorageManager.KEYS.WHITELIST).toBe('emojiBlocker_whitelist');
      expect(StorageManager.KEYS.SETTINGS).toBe('emojiBlocker_settings');
    });

    test('should have correct DEFAULT_SETTINGS', () => {
      expect(StorageManager.DEFAULT_SETTINGS.mode).toBe('hide');
      expect(StorageManager.DEFAULT_SETTINGS.enabled).toBe(true);
    });

    test('should use chrome.storage.sync by default', () => {
      const originalChrome = global.chrome;
      const syncMock = { get: jest.fn(), set: jest.fn() };
      global.chrome = { storage: { sync: syncMock } };

      const defaultManager = new StorageManager();
      expect(defaultManager.storage).toBe(syncMock);

      global.chrome = originalChrome;
    });
  });

  describe('normalizeDomain', () => {
    test('should remove protocol', () => {
      expect(manager.normalizeDomain('https://example.com')).toBe('example.com');
      expect(manager.normalizeDomain('http://example.com')).toBe('example.com');
    });

    test('should remove www', () => {
      expect(manager.normalizeDomain('www.example.com')).toBe('example.com');
      expect(manager.normalizeDomain('https://www.example.com')).toBe('example.com');
    });

    test('should remove path', () => {
      expect(manager.normalizeDomain('example.com/path')).toBe('example.com');
      expect(manager.normalizeDomain('https://example.com/path/to/page')).toBe('example.com');
    });

    test('should convert to lowercase', () => {
      expect(manager.normalizeDomain('EXAMPLE.COM')).toBe('example.com');
      expect(manager.normalizeDomain('Example.Com')).toBe('example.com');
    });
  });

  describe('extractDomain', () => {
    test('should extract domain from URL', () => {
      expect(manager.extractDomain('https://www.example.com/page')).toBe('example.com');
      expect(manager.extractDomain('http://subdomain.example.com')).toBe('subdomain.example.com');
    });

    test('should handle invalid URLs gracefully', () => {
      expect(manager.extractDomain('not-a-url')).toBe('not-a-url');
    });
  });

  describe('addToWhitelist', () => {
    test('should add domain to whitelist', async () => {
      const result = await manager.addToWhitelist('example.com');
      expect(result).toBe(true);
      
      const whitelist = await manager.getWhitelist();
      expect(whitelist).toContain('example.com');
    });

    test('should not add duplicate domain', async () => {
      await manager.addToWhitelist('example.com');
      const result = await manager.addToWhitelist('example.com');
      
      expect(result).toBe(false);
      
      const whitelist = await manager.getWhitelist();
      expect(whitelist.filter(d => d === 'example.com').length).toBe(1);
    });

    test('should normalize domain before adding', async () => {
      await manager.addToWhitelist('https://www.example.com');
      
      const whitelist = await manager.getWhitelist();
      expect(whitelist).toContain('example.com');
    });
  });

  describe('removeFromWhitelist', () => {
    test('should remove domain from whitelist', async () => {
      await manager.addToWhitelist('example.com');
      const result = await manager.removeFromWhitelist('example.com');
      
      expect(result).toBe(true);
      
      const whitelist = await manager.getWhitelist();
      expect(whitelist).not.toContain('example.com');
    });

    test('should return false if domain not in whitelist', async () => {
      const result = await manager.removeFromWhitelist('example.com');
      expect(result).toBe(false);
    });
  });

  describe('isWhitelisted', () => {
    test('should return true for whitelisted domain', async () => {
      await manager.addToWhitelist('example.com');
      const result = await manager.isWhitelisted('example.com');
      expect(result).toBe(true);
    });

    test('should return false for non-whitelisted domain', async () => {
      const result = await manager.isWhitelisted('example.com');
      expect(result).toBe(false);
    });

    test('should normalize domain when checking', async () => {
      await manager.addToWhitelist('example.com');
      const result = await manager.isWhitelisted('https://www.example.com');
      expect(result).toBe(true);
    });
  });

  describe('clearWhitelist', () => {
    test('should clear all domains from whitelist', async () => {
      await manager.addToWhitelist('example1.com');
      await manager.addToWhitelist('example2.com');
      await manager.clearWhitelist();
      
      const whitelist = await manager.getWhitelist();
      expect(whitelist).toEqual([]);
    });
  });

  describe('getSettings', () => {
    test('should return default settings when none set', async () => {
      const settings = await manager.getSettings();
      expect(settings.mode).toBe('hide');
      expect(settings.enabled).toBe(true);
    });

    test('should return stored settings', async () => {
      mockStorage.data[StorageManager.KEYS.SETTINGS] = { mode: 'hide', enabled: false };
      
      const settings = await manager.getSettings();
      expect(settings.mode).toBe('hide');
      expect(settings.enabled).toBe(false);
    });
  });

  describe('updateSettings', () => {
    test('should update settings', async () => {
      await manager.updateSettings({ mode: 'blur' });
      
      const settings = await manager.getSettings();
      expect(settings.mode).toBe('blur');
      expect(settings.enabled).toBe(true); // Should preserve default
    });

    test('should merge with existing settings', async () => {
      await manager.updateSettings({ mode: 'hide' });
      await manager.updateSettings({ enabled: false });
      
      const settings = await manager.getSettings();
      expect(settings.mode).toBe('hide');
      expect(settings.enabled).toBe(false);
    });
  });

  describe('error handling', () => {
    test('getWhitelist should return empty array on error', async () => {
      const failingStorage = { get: jest.fn(() => { throw new Error('fail'); }), set: jest.fn() };
      const failingManager = new StorageManager(failingStorage);

      const whitelist = await failingManager.getWhitelist();
      expect(whitelist).toEqual([]);
    });

    test('addToWhitelist should return false on storage error', async () => {
      const failingStorage = {
        get: jest.fn(() => ({ [StorageManager.KEYS.WHITELIST]: [] })),
        set: jest.fn(() => { throw new Error('fail'); })
      };
      const failingManager = new StorageManager(failingStorage);

      const result = await failingManager.addToWhitelist('example.com');
      expect(result).toBe(false);
    });

    test('removeFromWhitelist should return false on storage error', async () => {
      const failingStorage = {
        get: jest.fn(() => ({ [StorageManager.KEYS.WHITELIST]: ['example.com'] })),
        set: jest.fn(() => { throw new Error('fail'); })
      };
      const failingManager = new StorageManager(failingStorage);

      const result = await failingManager.removeFromWhitelist('example.com');
      expect(result).toBe(false);
    });

    test('isWhitelisted should return false on error', async () => {
      const failingStorage = { get: jest.fn(() => { throw new Error('fail'); }), set: jest.fn() };
      const failingManager = new StorageManager(failingStorage);

      const result = await failingManager.isWhitelisted('example.com');
      expect(result).toBe(false);
    });

    test('isWhitelisted should return false on invalid input', async () => {
      const result = await manager.isWhitelisted(null);
      expect(result).toBe(false);
    });

    test('clearWhitelist should return false on error', async () => {
      const failingStorage = { get: jest.fn(), set: jest.fn(() => { throw new Error('fail'); }) };
      const failingManager = new StorageManager(failingStorage);

      const result = await failingManager.clearWhitelist();
      expect(result).toBe(false);
    });

    test('getSettings should return defaults on error', async () => {
      const failingStorage = { get: jest.fn(() => { throw new Error('fail'); }), set: jest.fn() };
      const failingManager = new StorageManager(failingStorage);

      const settings = await failingManager.getSettings();
      expect(settings).toEqual(StorageManager.DEFAULT_SETTINGS);
    });

    test('updateSettings should return false on error', async () => {
      const failingStorage = {
        get: jest.fn(() => ({ [StorageManager.KEYS.SETTINGS]: { mode: 'hide', enabled: true } })),
        set: jest.fn(() => { throw new Error('fail'); })
      };
      const failingManager = new StorageManager(failingStorage);

      const result = await failingManager.updateSettings({ enabled: false });
      expect(result).toBe(false);
    });
  });
});

describe('WhitelistManager alias', () => {
  test('WhitelistManager should be exported as alias', async () => {
    const { WhitelistManager } = await import('../src/core/StorageManager');
    expect(WhitelistManager).toBe(StorageManager);
  });
});
