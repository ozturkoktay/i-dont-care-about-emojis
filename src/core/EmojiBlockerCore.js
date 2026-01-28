/**
 * EmojiBlockerCore - Core emoji detection and DOM processing
 * Consolidates EmojiDetector and EmojiProcessor functionality
 * Follows Single Responsibility Principle with focused internal modules
 */

/**
 * Emoji detection utilities
 */
const EmojiDetection = {

  EMOJI_RANGES: [
    [0x1F600, 0x1F64F], // Emoticons
    [0x1F300, 0x1F5FF], // Misc Symbols and Pictographs
    [0x1F680, 0x1F6FF], // Transport and Map
    [0x1F700, 0x1F77F], // Alchemical Symbols
    [0x1F780, 0x1F7FF], // Geometric Shapes Extended
    [0x1F800, 0x1F8FF], // Supplemental Arrows-C
    [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
    [0x1FA00, 0x1FA6F], // Chess Symbols
    [0x1FA70, 0x1FAFF], // Symbols and Pictographs Extended-A
    [0x2600, 0x26FF],   // Misc symbols
    [0x2700, 0x27BF],   // Dingbats
    [0xFE00, 0xFE0F],   // Variation Selectors
    [0x1F1E6, 0x1F1FF], // Regional Indicator Symbols (flags)
    [0x1F191, 0x1F251], // Enclosed characters
    [0x1F004, 0x1F0CF], // Mahjong and playing card symbols
    [0x1F170, 0x1F189]  // Enclosed Alphanumeric Supplement
  ],

  /**
   * Check if a character is an emoji
   * @param {string} char - Character to check
   * @returns {boolean}
   */
  isEmoji(char) {
    const codePoint = char.codePointAt(0);
    return this.EMOJI_RANGES.some(
      ([start, end]) => codePoint >= start && codePoint <= end
    );
  },

  /**
   * Check if text contains emojis
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  containsEmoji(text) {
    if (!text) return false;
    for (const char of text) {
      if (this.isEmoji(char)) return true;
    }
    return false;
  },

  /**
   * Extract all emojis from text
   * @param {string} text - Text to analyze
   * @returns {string[]}
   */
  extractEmojis(text) {
    if (!text) return [];
    return [...text].filter(char => this.isEmoji(char));
  }
};

/**
 * DOM processing configuration and utilities
 */
const ProcessorConfig = {
  EMOJI_CLASS: 'emoji-blocker-emoji',
  BATCH_SIZE: 50,
  MAX_TEXT_LENGTH: 10000,

  MODE_STYLES: {
    'hide': { display: 'none' },
    'desaturate': { filter: 'grayscale(100%) contrast(0.8) brightness(1.1)', opacity: '0.5' },
    'dim': { filter: 'grayscale(60%) brightness(1.1)', opacity: '0.35' },
    'blur': { filter: 'blur(3px) grayscale(50%)', opacity: '0.7' }
  },

  SKIP_TAGS: new Set([
    'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME',
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE',
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION',
    'CODE', 'PRE', 'KBD', 'SAMP',
    'HEAD', 'META', 'LINK', 'TITLE'
  ]),

  SKIP_ROLES: new Set(['textbox', 'searchbox', 'combobox'])
};

class EmojiBlockerCore {
  constructor() {
    this.processedNodes = new WeakSet();
    this.processingQueue = [];
    this.isProcessing = false;
    this.onCompleteCallback = null;
  }

  /**
   * Process a DOM node (queued for performance)
   * @param {Node} node - DOM node to process
   * @param {string} mode - Processing mode
   */
  processNode(node, mode = 'hide') {
    if (!node || this.processedNodes.has(node)) return;

    this.processingQueue.push({ node, mode });
    this._scheduleProcessing();
  }

  /**
   * Process entire document synchronously (for initial load)
   * @param {string} mode - Processing mode
   */
  processDocumentSync(mode = 'hide') {
    if (document.body) {
      this._processNodeImmediate(document.body, mode);
    }
  }

  /**
   * Process entire document with callback
   * @param {string} mode - Processing mode
   * @param {Function} onComplete - Completion callback
   */
  processDocument(mode = 'hide', onComplete = null) {
    this.onCompleteCallback = onComplete;
    if (document.body) {
      this.processNode(document.body, mode);
    } else if (onComplete) {
      onComplete();
    }
  }

  /**
   * Update mode for all processed emojis
   * @param {string} mode - New mode to apply
   */
  updateMode(mode) {
    document.querySelectorAll(`.${ProcessorConfig.EMOJI_CLASS}`).forEach(el => {
      el.setAttribute('data-mode', mode);
      this._applyModeStyles(el, mode);
    });
  }

  /**
   * Remove all emoji processing from page
   */
  revertProcessing() {
    document.querySelectorAll(`.${ProcessorConfig.EMOJI_CLASS}`).forEach(el => {
      try {
        const textNode = document.createTextNode(el.textContent);
        el.parentNode?.replaceChild(textNode, el);
      } catch { /* Element may have been removed */ }
    });
    this.processedNodes = new WeakSet();
    this.processingQueue = [];
  }



  _scheduleProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const callback = () => this._processBatch();

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(callback, { timeout: 100 });
    } else {
      requestAnimationFrame(callback);
    }
  }

  _processBatch() {
    const batch = this.processingQueue.splice(0, ProcessorConfig.BATCH_SIZE);

    for (const { node, mode } of batch) {
      this._processNodeImmediate(node, mode);
    }

    if (this.processingQueue.length > 0) {
      const callback = () => this._processBatch();
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(callback, { timeout: 100 });
      } else {
        requestAnimationFrame(callback);
      }
    } else {
      this.isProcessing = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
    }
  }

  _processNodeImmediate(node, mode) {
    if (!node || this.processedNodes.has(node)) return;

    try {
      if (node.nodeType === Node.TEXT_NODE) {
        this._processTextNode(node, mode);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (this._shouldSkipElement(node)) return;
        this._processElementNode(node, mode);
      }
      this.processedNodes.add(node);
    } catch (error) {
      console.debug('Emoji Blocker: Error processing node', error);
    }
  }

  _processElementNode(element, mode) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (textNode) => {
          if (this.processedNodes.has(textNode)) return NodeFilter.FILTER_REJECT;
          const parent = textNode.parentNode;
          if (parent && this._shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let current;
    while ((current = walker.nextNode())) {
      textNodes.push(current);
    }

    for (const textNode of textNodes) {
      this._processTextNode(textNode, mode);
    }
  }

  _processTextNode(textNode, mode) {
    if (this.processedNodes.has(textNode)) return;

    const text = textNode.textContent;

    if (!text || text.length > ProcessorConfig.MAX_TEXT_LENGTH || !/\S/.test(text)) {
      this.processedNodes.add(textNode);
      return;
    }

    if (!EmojiDetection.containsEmoji(text)) {
      this.processedNodes.add(textNode);
      return;
    }

    const parent = textNode.parentNode;
    if (!parent || this._shouldSkipElement(parent)) {
      this.processedNodes.add(textNode);
      return;
    }

    try {
      const fragment = this._createEmojiFragment(text, mode);
      if (fragment && parent.contains(textNode)) {
        parent.replaceChild(fragment, textNode);
      }
    } catch (error) {
      console.debug('Emoji Blocker: Error processing text node', error);
    }

    this.processedNodes.add(textNode);
  }

  _createEmojiFragment(text, mode) {
    const fragment = document.createDocumentFragment();
    let hasEmojis = false;
    let currentText = '';

    for (const char of text) {
      if (EmojiDetection.isEmoji(char)) {
        hasEmojis = true;
        if (currentText) {
          fragment.appendChild(document.createTextNode(currentText));
          currentText = '';
        }

        const emojiSpan = document.createElement('span');
        emojiSpan.className = ProcessorConfig.EMOJI_CLASS;
        emojiSpan.setAttribute('data-mode', mode);
        this._applyModeStyles(emojiSpan, mode);
        emojiSpan.textContent = char;
        fragment.appendChild(emojiSpan);
      } else {
        currentText += char;
      }
    }

    if (currentText) {
      fragment.appendChild(document.createTextNode(currentText));
    }

    return hasEmojis ? fragment : null;
  }

  _shouldSkipElement(element) {
    if (!element?.tagName) return true;

    const tagName = element.tagName.toUpperCase();
    if (ProcessorConfig.SKIP_TAGS.has(tagName)) return true;
    if (element.isContentEditable) return true;

    const role = element.getAttribute('role');
    if (role && ProcessorConfig.SKIP_ROLES.has(role)) return true;
    if (element.hidden || element.style?.display === 'none') return true;
    if (element.classList?.contains(ProcessorConfig.EMOJI_CLASS)) return true;

    return false;
  }

  _applyModeStyles(element, mode) {
    const styles = ProcessorConfig.MODE_STYLES[mode] || ProcessorConfig.MODE_STYLES['hide'];

    element.style.removeProperty('display');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');

    if (styles.display) {
      element.style.display = styles.display;
      return;
    }

    if (styles.filter) element.style.filter = styles.filter;
    if (styles.opacity) element.style.opacity = styles.opacity;
  }



  static isEmoji(char) {
    return EmojiDetection.isEmoji(char);
  }

  static containsEmoji(text) {
    return EmojiDetection.containsEmoji(text);
  }

  static extractEmojis(text) {
    return EmojiDetection.extractEmojis(text);
  }
}

export { EmojiBlockerCore, EmojiDetection, ProcessorConfig };
