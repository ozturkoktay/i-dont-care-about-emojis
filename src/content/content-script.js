/**
 * Content Script - Main entry point for emoji blocking
 * Orchestrates the emoji blocking functionality
 * Optimized for performance with throttling and debouncing
 */

/* global EmojiBlockerCore */


if (document.documentElement) {
  document.documentElement.classList.add('emoji-blocker-hold');
}

class EmojiBlockerContent {
  constructor() {
    this.storage = new StorageManager();
    this.processor = new EmojiBlockerCore();
    this.observer = null;
    this.isEnabled = true;
    this.currentMode = 'hide';

    this.initialHoldActive = true;
    this.holdReleaseTimeout = null;
    this.HOLD_RELEASE_DELAY = 100;

    this.pendingMutations = [];
    this.mutationTimeout = null;
    this.MUTATION_DELAY = 100;
  }

  /**
   * Initialize the emoji blocker
   */
  async init() {
    try {
      const currentDomain = this.storage.extractDomain(window.location.href);
      const isWhitelisted = await this.storage.isWhitelisted(currentDomain);

      if (isWhitelisted) {
        console.log('Emoji Blocker: Domain is whitelisted');
        this.releaseHold();
        return;
      }

      const settings = await this.storage.getSettings();
      this.isEnabled = settings.enabled;
      this.currentMode = settings.mode;

      if (!this.isEnabled) {
        this.releaseHold();
        return;
      }

      if (document.body) {
        this.startProcessing();
      } else {
        this.waitForBodyAndStart();
      }

      this.setupMessageListener();
      console.log('Emoji Blocker: Active on this page');
    } catch (error) {
      console.error('Emoji Blocker: Initialization error', error);
    }
  }

  /**
   * Start processing as soon as <body> is available
   */
  waitForBodyAndStart() {
    if (document.body) {
      this.startProcessing();
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        this.startProcessing();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      if (document.body) {
        observer.disconnect();
        this.startProcessing();
      }
    }, 500);
  }

  /**
   * Start processing the page
   */
  startProcessing() {
    this.setupMutationObserver();
    this.processor.processDocumentSync(this.currentMode);

    this.releaseHold();
    this.scheduleHoldRelease();
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            this.pendingMutations.push(node);
          }
        }
      }

      if (this.mutationTimeout) clearTimeout(this.mutationTimeout);
      this.mutationTimeout = setTimeout(() => this.processPendingMutations(), this.MUTATION_DELAY);
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Process collected mutations in batch
   */
  processPendingMutations() {
    if (!this.isEnabled || this.pendingMutations.length === 0) {
      this.pendingMutations = [];
      this.scheduleHoldRelease();
      return;
    }

    const uniqueNodes = new Set();
    for (const node of this.pendingMutations) {
      if (!document.body.contains(node)) continue;

      let dominated = false;
      for (const existing of uniqueNodes) {
        if (existing.contains?.(node)) {
          dominated = true;
          break;
        }
      }

      if (!dominated) {
        for (const existing of uniqueNodes) {
          if (node.contains?.(existing)) {
            uniqueNodes.delete(existing);
          }
        }
        uniqueNodes.add(node);
      }
    }

    for (const node of uniqueNodes) {
      this.processor.processNode(node, this.currentMode);
    }

    this.pendingMutations = [];
    this.scheduleHoldRelease();
  }

  /**
   * Release the initial hold (show page)
   */
  releaseHold() {
    if (!this.initialHoldActive) return;
    this.initialHoldActive = false;
    if (this.holdReleaseTimeout) {
      clearTimeout(this.holdReleaseTimeout);
      this.holdReleaseTimeout = null;
    }
    document.documentElement.classList.remove('emoji-blocker-hold');
  }

  /**
   * Schedule hold release after a quiet period
   */
  scheduleHoldRelease() {
    if (!this.initialHoldActive) return;
    if (this.holdReleaseTimeout) clearTimeout(this.holdReleaseTimeout);

    this.holdReleaseTimeout = setTimeout(() => {
      if (this.pendingMutations.length === 0 && !this.processor.isProcessing) {
        this.releaseHold();
      }
    }, this.HOLD_RELEASE_DELAY);
  }

  /**
   * Setup message listener for runtime communication
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.action) {
      case 'toggleEnabled':
        this.toggleEnabled(message.enabled);
        sendResponse({ success: true });
        break;
      case 'updateMode':
        this.updateMode(message.mode);
        sendResponse({ success: true });
        break;
      case 'reloadPage':
        window.location.reload();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
      }
      return true;
    });
  }

  /**
   * Toggle emoji blocking
   * @param {boolean} enabled
   */
  toggleEnabled(enabled) {
    this.isEnabled = enabled;

    if (enabled) {
      this.processor.processDocument(this.currentMode);
      if (!this.observer) this.setupMutationObserver();
    } else {
      this.processor.revertProcessing();
      this.releaseHold();
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.pendingMutations = [];
      if (this.mutationTimeout) {
        clearTimeout(this.mutationTimeout);
        this.mutationTimeout = null;
      }
    }
  }

  /**
   * Update processing mode
   * @param {string} mode
   */
  updateMode(mode) {
    this.currentMode = mode;
    this.processor.updateMode(mode);
  }
}

const initBlocker = () => {
  const blocker = new EmojiBlockerContent();
  blocker.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlocker);
} else {
  initBlocker();
}
