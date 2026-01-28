/**
 * UIController - Base controller for popup and options pages
 * Consolidates shared UI logic between popup.js and options.js
 * Follows DRY principle by extracting common functionality
 */

/**
 * Shared utility functions
 */
const UIUtils = {
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Reload tabs matching a domain
   * @param {string} domain - Domain to match
   */
  async reloadTabsForDomain(domain) {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        if (tab.url?.includes(domain)) {
          chrome.tabs.reload(tab.id).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error reloading tabs:', error);
    }
  },

  /**
   * Broadcast message to all tabs
   * @param {string} action - Action name
   * @param {Object} data - Additional data
   */
  async broadcastToTabs(action, data = {}) {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {});
      });
    } catch (error) {
      console.error('Error broadcasting to tabs:', error);
    }
  }
};

/**
 * Base UI Controller with shared functionality
 */
class BaseUIController {
  constructor() {
    this.storageManager = null;
  }

  /**
   * Get or create StorageManager instance
   * @returns {StorageManager}
   */
  getStorage() {
    if (!this.storageManager) {
      this.storageManager = new StorageManager();
    }
    return this.storageManager;
  }

  /**
   * Load and apply current settings to UI elements
   * @param {Object} elements - DOM elements with modeSelect and enabledCheckbox
   */
  async loadSettings(elements) {
    try {
      const settings = await this.getStorage().getSettings();
      if (elements.modeSelect) elements.modeSelect.value = settings.mode;
      if (elements.enabledCheckbox) elements.enabledCheckbox.checked = settings.enabled;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Update blocking mode
   * @param {string} mode - New mode value
   */
  async updateMode(mode) {
    try {
      await this.getStorage().updateSettings({ mode });
      await UIUtils.broadcastToTabs('updateMode', { mode });
    } catch (error) {
      console.error('Error updating mode:', error);
      throw error;
    }
  }

  /**
   * Toggle enabled state
   * @param {boolean} enabled - New enabled state
   */
  async toggleEnabled(enabled) {
    try {
      await this.getStorage().updateSettings({ enabled });
      await UIUtils.broadcastToTabs('toggleEnabled', { enabled });
    } catch (error) {
      console.error('Error toggling enabled:', error);
      throw error;
    }
  }

  /**
   * Render whitelist items in a container
   * @param {HTMLElement} container - Container element
   * @param {string[]} whitelist - List of domains
   * @param {Function} onRemove - Callback when remove is clicked
   * @param {string} emptyMessage - Message when empty
   */
  renderWhitelist(container, whitelist, onRemove, emptyMessage = 'No websites whitelisted') {
    if (whitelist.length === 0) {
      container.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
      return;
    }

    container.innerHTML = whitelist
      .map(
        (domain) => `
      <div class="whitelist-item">
        <span class="whitelist-domain">${UIUtils.escapeHtml(domain)}</span>
        <button class="btn btn-danger btn-remove" data-domain="${UIUtils.escapeHtml(domain)}">
          Remove
        </button>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.getAttribute('data-domain');
        onRemove(domain);
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════

class PopupController extends BaseUIController {
  constructor() {
    super();
    this.currentDomain = '';
    this.isCurrentDomainWhitelisted = false;
    this.elements = {
      currentDomain: document.getElementById('currentDomain'),
      toggleWhitelist: document.getElementById('toggleWhitelist'),
      modeSelect: document.getElementById('modeSelect'),
      enabledCheckbox: document.getElementById('enabledCheckbox'),
      enabledLabel: document.getElementById('enabledLabel'),
      whitelistContainer: document.getElementById('whitelistContainer'),
      openOptions: document.getElementById('openOptions')
    };
  }

  async init() {
    await this.loadCurrentDomain();
    await this.loadSettings(this.elements);
    this.updateEnabledLabel();
    await this.loadWhitelist();
    this.attachEventListeners();
  }

  async loadCurrentDomain() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url) {
        this.elements.currentDomain.textContent = 'N/A';
        this.elements.toggleWhitelist.disabled = true;
        return;
      }

      this.currentDomain = this.getStorage().extractDomain(tab.url);
      this.elements.currentDomain.textContent = this.currentDomain;
      this.isCurrentDomainWhitelisted = await this.getStorage().isWhitelisted(this.currentDomain);
      this.updateWhitelistButton();
    } catch (error) {
      console.error('Error loading current domain:', error);
      this.elements.currentDomain.textContent = 'Error';
    }
  }

  async loadWhitelist() {
    try {
      const whitelist = await this.getStorage().getWhitelist();
      this.renderWhitelist(this.elements.whitelistContainer, whitelist, (domain) =>
        this.removeFromWhitelist(domain)
      );
    } catch (error) {
      console.error('Error loading whitelist:', error);
    }
  }

  updateWhitelistButton() {
    const btn = this.elements.toggleWhitelist;
    if (this.isCurrentDomainWhitelisted) {
      btn.textContent = 'Remove from Whitelist';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
    } else {
      btn.textContent = 'Add to Whitelist';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
    }
  }

  attachEventListeners() {
    this.elements.toggleWhitelist.addEventListener('click', () =>
      this.toggleCurrentDomainWhitelist()
    );
    this.elements.modeSelect.addEventListener('change', () =>
      this.updateMode(this.elements.modeSelect.value)
    );
    this.elements.enabledCheckbox.addEventListener('change', () => {
      this.toggleEnabled(this.elements.enabledCheckbox.checked);
      this.updateEnabledLabel();
    });
    this.elements.openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }

  updateEnabledLabel() {
    if (!this.elements.enabledLabel) return;
    this.elements.enabledLabel.textContent = this.elements.enabledCheckbox.checked
      ? 'Enable'
      : 'Disable';
  }

  async toggleCurrentDomainWhitelist() {
    try {
      if (this.isCurrentDomainWhitelisted) {
        await this.getStorage().removeFromWhitelist(this.currentDomain);
        this.isCurrentDomainWhitelisted = false;
      } else {
        await this.getStorage().addToWhitelist(this.currentDomain);
        this.isCurrentDomainWhitelisted = true;
      }

      this.updateWhitelistButton();
      await this.loadWhitelist();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.reload(tab.id);
    } catch (error) {
      console.error('Error toggling whitelist:', error);
    }
  }

  async removeFromWhitelist(domain) {
    try {
      await this.getStorage().removeFromWhitelist(domain);
      await this.loadWhitelist();

      if (domain === this.currentDomain) {
        this.isCurrentDomainWhitelisted = false;
        this.updateWhitelistButton();
      }

      await UIUtils.reloadTabsForDomain(domain);
    } catch (error) {
      console.error('Error removing from whitelist:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════

class OptionsController extends BaseUIController {
  constructor() {
    super();
    this.currentWhitelist = [];
    this.elements = {
      modeSelect: document.getElementById('modeSelect'),
      enabledCheckbox: document.getElementById('enabledCheckbox'),
      domainInput: document.getElementById('domainInput'),
      addDomainBtn: document.getElementById('addDomainBtn'),
      whitelistContainer: document.getElementById('whitelistContainer'),
      clearWhitelistBtn: document.getElementById('clearWhitelistBtn'),
      toast: document.getElementById('toast'),
      suggestedMessaging: document.getElementById('suggestedMessaging'),
      suggestedSocial: document.getElementById('suggestedSocial'),
      suggestedEmail: document.getElementById('suggestedEmail'),
      suggestedProductivity: document.getElementById('suggestedProductivity'),
      suggestedDeveloper: document.getElementById('suggestedDeveloper'),
      suggestedReference: document.getElementById('suggestedReference')
    };

    this.suggestedSites = {
      messaging: [
        { domain: 'web.whatsapp.com', name: 'WhatsApp' },
        { domain: 'messenger.com', name: 'Messenger' },
        { domain: 'discord.com', name: 'Discord' },
        { domain: 'slack.com', name: 'Slack' },
        { domain: 'telegram.org', name: 'Telegram' },
        { domain: 'teams.microsoft.com', name: 'Teams' }
      ],
      social: [
        { domain: 'twitter.com', name: 'Twitter/X' },
        { domain: 'x.com', name: 'X' },
        { domain: 'facebook.com', name: 'Facebook' },
        { domain: 'instagram.com', name: 'Instagram' },
        { domain: 'tiktok.com', name: 'TikTok' },
        { domain: 'reddit.com', name: 'Reddit' },
        { domain: 'linkedin.com', name: 'LinkedIn' }
      ],
      email: [
        { domain: 'mail.google.com', name: 'Gmail' },
        { domain: 'outlook.live.com', name: 'Outlook' },
        { domain: 'outlook.office.com', name: 'Office 365' },
        { domain: 'mail.yahoo.com', name: 'Yahoo Mail' },
        { domain: 'proton.me', name: 'ProtonMail' }
      ],
      productivity: [
        { domain: 'docs.google.com', name: 'Google Docs' },
        { domain: 'notion.so', name: 'Notion' },
        { domain: 'coda.io', name: 'Coda' },
        { domain: 'airtable.com', name: 'Airtable' },
        { domain: 'trello.com', name: 'Trello' },
        { domain: 'asana.com', name: 'Asana' }
      ],
      developer: [
        { domain: 'github.com', name: 'GitHub' },
        { domain: 'gitlab.com', name: 'GitLab' },
        { domain: 'bitbucket.org', name: 'Bitbucket' },
        { domain: 'stackoverflow.com', name: 'Stack Overflow' }
      ],
      reference: [
        { domain: 'emojipedia.org', name: 'Emojipedia' },
        { domain: 'unicode.org', name: 'Unicode' },
        { domain: 'getemoji.com', name: 'Get Emoji' }
      ]
    };
  }

  async init() {
    await this.loadSettings(this.elements);
    this.renderSuggestedSites();
    await this.loadWhitelist();
    this.attachEventListeners();
  }

  async loadWhitelist() {
    try {
      this.currentWhitelist = await this.getStorage().getWhitelist();
      this.renderWhitelist(
        this.elements.whitelistContainer,
        this.currentWhitelist,
        (domain) => this.removeDomain(domain),
        'No domains whitelisted yet'
      );
      this.updateSuggestedSitesState();
    } catch (error) {
      console.error('Error loading whitelist:', error);
      this.showToast('Error loading whitelist', 'error');
    }
  }

  renderSuggestedSites() {
    const categoryMap = {
      messaging: this.elements.suggestedMessaging,
      social: this.elements.suggestedSocial,
      email: this.elements.suggestedEmail,
      productivity: this.elements.suggestedProductivity,
      developer: this.elements.suggestedDeveloper,
      reference: this.elements.suggestedReference
    };

    for (const [category, container] of Object.entries(categoryMap)) {
      if (!container) continue;

      const sites = this.suggestedSites[category];
      container.innerHTML = sites
        .map(
          (site) => `
        <button 
          class="suggested-site-btn" 
          data-domain="${UIUtils.escapeHtml(site.domain)}"
          title="${UIUtils.escapeHtml(site.domain)}"
        >
          <span class="site-name">${UIUtils.escapeHtml(site.name)}</span>
          <span class="site-status">+</span>
        </button>
      `
        )
        .join('');

      container.querySelectorAll('.suggested-site-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.toggleSuggestedSite(btn.getAttribute('data-domain'), btn);
        });
      });
    }
  }

  updateSuggestedSitesState() {
    document.querySelectorAll('.suggested-site-btn').forEach((btn) => {
      const domain = btn.getAttribute('data-domain');
      const isWhitelisted = this.currentWhitelist.some(
        (d) => d === domain || domain.includes(d) || d.includes(domain)
      );

      btn.classList.toggle('added', isWhitelisted);
      btn.querySelector('.site-status').textContent = isWhitelisted ? '✓' : '+';
    });
  }

  attachEventListeners() {
    this.elements.modeSelect.addEventListener('change', async () => {
      try {
        await this.updateMode(this.elements.modeSelect.value);
        this.showToast('Mode updated successfully', 'success');
      } catch {
        this.showToast('Error updating mode', 'error');
      }
    });

    this.elements.enabledCheckbox.addEventListener('change', async () => {
      try {
        const enabled = this.elements.enabledCheckbox.checked;
        await this.toggleEnabled(enabled);
        this.showToast(enabled ? 'Emoji blocking enabled' : 'Emoji blocking disabled', 'success');
      } catch {
        this.showToast('Error updating settings', 'error');
      }
    });

    this.elements.addDomainBtn.addEventListener('click', () => this.addDomain());
    this.elements.domainInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addDomain();
    });
    this.elements.clearWhitelistBtn.addEventListener('click', () => this.clearWhitelist());
  }

  async toggleSuggestedSite(domain, btn) {
    const isAdded = btn.classList.contains('added');

    try {
      if (isAdded) {
        await this.getStorage().removeFromWhitelist(domain);
        this.showToast(`Removed ${domain} from whitelist`, 'success');
      } else {
        await this.getStorage().addToWhitelist(domain);
        this.showToast(`Added ${domain} to whitelist`, 'success');
      }

      await this.loadWhitelist();
      await UIUtils.reloadTabsForDomain(domain);
    } catch (error) {
      console.error('Error toggling suggested site:', error);
      this.showToast('Error updating whitelist', 'error');
    }
  }

  async addDomain() {
    const domain = this.elements.domainInput.value.trim();
    if (!domain) {
      this.showToast('Please enter a domain', 'error');
      return;
    }

    try {
      const success = await this.getStorage().addToWhitelist(domain);
      if (success) {
        this.elements.domainInput.value = '';
        await this.loadWhitelist();
        this.showToast('Domain added to whitelist', 'success');
        await UIUtils.reloadTabsForDomain(domain);
      } else {
        this.showToast('Domain already in whitelist', 'error');
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      this.showToast('Error adding domain', 'error');
    }
  }

  async removeDomain(domain) {
    try {
      await this.getStorage().removeFromWhitelist(domain);
      await this.loadWhitelist();
      this.showToast('Domain removed from whitelist', 'success');
      await UIUtils.reloadTabsForDomain(domain);
    } catch (error) {
      console.error('Error removing domain:', error);
      this.showToast('Error removing domain', 'error');
    }
  }

  async clearWhitelist() {
    if (!confirm('Are you sure you want to clear the entire whitelist?')) return;

    try {
      await this.getStorage().clearWhitelist();
      await this.loadWhitelist();
      this.showToast('Whitelist cleared', 'success');

      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => chrome.tabs.reload(tab.id).catch(() => {}));
    } catch (error) {
      console.error('Error clearing whitelist:', error);
      this.showToast('Error clearing whitelist', 'error');
    }
  }

  showToast(message, type = 'success') {
    this.elements.toast.textContent = message;
    this.elements.toast.className = `toast ${type} show`;
    setTimeout(() => this.elements.toast.classList.remove('show'), 3000);
  }
}

export { UIUtils, BaseUIController, PopupController, OptionsController };
