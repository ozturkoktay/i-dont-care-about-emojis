/**
 * EmojiBlockerCore Tests
 * Tests for the consolidated emoji detection and processing module
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EmojiBlockerCore, EmojiDetection, ProcessorConfig } from '../src/core/EmojiBlockerCore';

describe('EmojiDetection', () => {
  describe('isEmoji', () => {
    test('should detect basic emoticons', () => {
      expect(EmojiDetection.isEmoji('😀')).toBe(true);
      expect(EmojiDetection.isEmoji('😊')).toBe(true);
      expect(EmojiDetection.isEmoji('🎉')).toBe(true);
    });

    test('should not detect regular text as emoji', () => {
      expect(EmojiDetection.isEmoji('a')).toBe(false);
      expect(EmojiDetection.isEmoji('A')).toBe(false);
      expect(EmojiDetection.isEmoji('1')).toBe(false);
    });

    test('should not detect special characters as emoji', () => {
      expect(EmojiDetection.isEmoji('!')).toBe(false);
      expect(EmojiDetection.isEmoji('@')).toBe(false);
      expect(EmojiDetection.isEmoji('#')).toBe(false);
    });

    test('should detect various emoji categories', () => {
      expect(EmojiDetection.isEmoji('🚀')).toBe(true); // Transport
      expect(EmojiDetection.isEmoji('🏠')).toBe(true); // Buildings
      expect(EmojiDetection.isEmoji('🌍')).toBe(true); // Nature
      expect(EmojiDetection.isEmoji('🍕')).toBe(true); // Food
    });
  });

  describe('containsEmoji', () => {
    test('should return true for strings with emojis', () => {
      expect(EmojiDetection.containsEmoji('Hello 😀')).toBe(true);
      expect(EmojiDetection.containsEmoji('😀 World')).toBe(true);
      expect(EmojiDetection.containsEmoji('Hello 😀 World')).toBe(true);
    });

    test('should return false for strings without emojis', () => {
      expect(EmojiDetection.containsEmoji('Hello World')).toBe(false);
      expect(EmojiDetection.containsEmoji('123')).toBe(false);
      expect(EmojiDetection.containsEmoji('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(EmojiDetection.containsEmoji(null)).toBe(false);
      expect(EmojiDetection.containsEmoji(undefined)).toBe(false);
    });

    test('should detect multiple emojis', () => {
      expect(EmojiDetection.containsEmoji('😀😊🎉')).toBe(true);
    });
  });

  describe('extractEmojis', () => {
    test('should extract all emojis from text', () => {
      const emojis = EmojiDetection.extractEmojis('Hello 😀 World 🎉');
      expect(emojis).toContain('😀');
      expect(emojis).toContain('🎉');
      expect(emojis.length).toBe(2);
    });

    test('should return empty array for text without emojis', () => {
      expect(EmojiDetection.extractEmojis('Hello World')).toEqual([]);
    });

    test('should handle empty and null input', () => {
      expect(EmojiDetection.extractEmojis('')).toEqual([]);
      expect(EmojiDetection.extractEmojis(null)).toEqual([]);
      expect(EmojiDetection.extractEmojis(undefined)).toEqual([]);
    });
  });
});

describe('ProcessorConfig', () => {
  test('should have correct EMOJI_CLASS', () => {
    expect(ProcessorConfig.EMOJI_CLASS).toBe('emoji-blocker-emoji');
  });

  test('should have MODE_STYLES for all modes', () => {
    expect(ProcessorConfig.MODE_STYLES.hide).toBeDefined();
    expect(ProcessorConfig.MODE_STYLES.desaturate).toBeDefined();
    expect(ProcessorConfig.MODE_STYLES.dim).toBeDefined();
    expect(ProcessorConfig.MODE_STYLES.blur).toBeDefined();
  });

  test('should have correct SKIP_TAGS', () => {
    expect(ProcessorConfig.SKIP_TAGS.has('SCRIPT')).toBe(true);
    expect(ProcessorConfig.SKIP_TAGS.has('STYLE')).toBe(true);
    expect(ProcessorConfig.SKIP_TAGS.has('IMG')).toBe(true);
    expect(ProcessorConfig.SKIP_TAGS.has('INPUT')).toBe(true);
  });
});

describe('EmojiBlockerCore', () => {
  let processor;

  beforeEach(() => {
    document.body.innerHTML = '';
    processor = new EmojiBlockerCore();
    global.requestAnimationFrame = (cb) => cb();
    delete global.requestIdleCallback;
  });

  describe('static methods', () => {
    test('static isEmoji should work', () => {
      expect(EmojiBlockerCore.isEmoji('😀')).toBe(true);
      expect(EmojiBlockerCore.isEmoji('a')).toBe(false);
    });

    test('static containsEmoji should work', () => {
      expect(EmojiBlockerCore.containsEmoji('Hello 😀')).toBe(true);
      expect(EmojiBlockerCore.containsEmoji('Hello')).toBe(false);
    });

    test('static extractEmojis should work', () => {
      const emojis = EmojiBlockerCore.extractEmojis('😀🎉');
      expect(emojis.length).toBe(2);
    });
  });

  describe('processNode early return', () => {
    test('should skip already processed nodes', () => {
      const textNode = document.createTextNode('😀');
      processor.processedNodes.add(textNode);

      processor.processNode(textNode, 'hide');
      expect(processor.processingQueue.length).toBe(0);
    });

    test('should use default mode argument', () => {
      const textNode = document.createTextNode('😀');
      const rafSpy = jest.fn((cb) => cb());
      global.requestAnimationFrame = rafSpy;

      processor.processNode(textNode);

      expect(rafSpy).toHaveBeenCalled();
    });
  });

  describe('_shouldSkipElement', () => {
    test('should skip image elements', () => {
      const img = document.createElement('img');
      expect(processor._shouldSkipElement(img)).toBe(true);
    });

    test('should skip svg elements', () => {
      const svg = document.createElement('svg');
      expect(processor._shouldSkipElement(svg)).toBe(true);
    });

    test('should skip script elements', () => {
      const script = document.createElement('script');
      expect(processor._shouldSkipElement(script)).toBe(true);
    });

    test('should not skip regular elements', () => {
      const div = document.createElement('div');
      expect(processor._shouldSkipElement(div)).toBe(false);
    });

    test('should not skip text elements', () => {
      const p = document.createElement('p');
      expect(processor._shouldSkipElement(p)).toBe(false);
    });

    test('should skip input elements', () => {
      const input = document.createElement('input');
      expect(processor._shouldSkipElement(input)).toBe(true);
    });

    test('should skip textarea elements', () => {
      const textarea = document.createElement('textarea');
      expect(processor._shouldSkipElement(textarea)).toBe(true);
    });

    test('should skip nodes without tagName', () => {
      const textNode = document.createTextNode('text');
      expect(processor._shouldSkipElement(textNode)).toBe(true);
    });
  });

  describe('_processTextNode', () => {
    test('should wrap emojis in span', () => {
      const textNode = document.createTextNode('Hello 😀 World');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      processor._processTextNode(textNode, 'desaturate');

      const emojiSpans = parent.querySelectorAll('.emoji-blocker-emoji');
      expect(emojiSpans.length).toBeGreaterThan(0);
    });

    test('should not process text without emojis', () => {
      const textNode = document.createTextNode('Hello World');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'desaturate');

      const emojiSpans = parent.querySelectorAll('.emoji-blocker-emoji');
      expect(emojiSpans.length).toBe(0);
    });

    test('should preserve non-emoji text', () => {
      const textNode = document.createTextNode('Hello 😀 World');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'desaturate');

      expect(parent.textContent).toContain('Hello');
      expect(parent.textContent).toContain('World');
    });

    test('should set correct mode attribute', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'hide');

      const emojiSpan = parent.querySelector('.emoji-blocker-emoji');
      expect(emojiSpan?.getAttribute('data-mode')).toBe('hide');
    });

    test('should skip whitespace-only text', () => {
      const textNode = document.createTextNode('   ');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'desaturate');

      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
    });

    test('should skip very long text', () => {
      const longText = 'a'.repeat(ProcessorConfig.MAX_TEXT_LENGTH + 1) + '😀';
      const textNode = document.createTextNode(longText);
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'desaturate');

      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
    });

    test('should skip when parent should be ignored', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.setAttribute('role', 'textbox');
      parent.appendChild(textNode);

      processor._processTextNode(textNode, 'desaturate');

      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
    });

    test('should skip already processed text nodes', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      processor.processedNodes.add(textNode);

      processor._processTextNode(textNode, 'hide');
      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
    });
  });

  describe('processDocumentSync', () => {
    test('should process entire document', () => {
      const div = document.createElement('div');
      div.textContent = 'Hello 😀 World';
      document.body.appendChild(div);

      processor.processDocumentSync('desaturate');

      const emojiSpans = document.querySelectorAll('.emoji-blocker-emoji');
      expect(emojiSpans.length).toBeGreaterThan(0);
    });

    test('should handle missing body and default mode', () => {
      const originalBody = document.body;
      Object.defineProperty(document, 'body', { value: null, configurable: true });

      processor.processDocumentSync();

      Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
    });
  });

  describe('processDocument', () => {
    test('should call completion callback after async processing', () => {
      const div = document.createElement('div');
      div.textContent = 'Hello 😀 World';
      document.body.appendChild(div);

      const onComplete = jest.fn();
      processor.processDocument('desaturate', onComplete);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test('should call completion callback if body is missing', () => {
      const originalBody = document.body;
      Object.defineProperty(document, 'body', { value: null, configurable: true });

      const onComplete = jest.fn();
      processor.processDocument('hide', onComplete);

      expect(onComplete).toHaveBeenCalledTimes(1);
      Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
    });

    test('should use default arguments and no completion callback', () => {
      const originalBody = document.body;
      Object.defineProperty(document, 'body', { value: null, configurable: true });

      processor.processDocument();

      Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
    });
  });

  describe('updateMode', () => {
    test('should update mode for processed emojis', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      processor._processTextNode(textNode, 'hide');
      processor.updateMode('desaturate');

      const emojiSpan = parent.querySelector('.emoji-blocker-emoji');
      expect(emojiSpan?.getAttribute('data-mode')).toBe('desaturate');
    });
  });

  describe('_createEmojiFragment', () => {
    test('should return null when no emojis', () => {
      const fragment = processor._createEmojiFragment('hello world', 'hide');
      expect(fragment).toBeNull();
    });
  });

  describe('_applyModeStyles', () => {
    test('should fall back to hide mode for unknown mode', () => {
      const span = document.createElement('span');
      processor._applyModeStyles(span, 'unknown');
      expect(span.style.display).toBe('none');
    });

    test('should apply filter and opacity when defined', () => {
      const span = document.createElement('span');
      processor._applyModeStyles(span, 'desaturate');
      expect(span.style.filter).toContain('grayscale');
      expect(span.style.opacity).toBe('0.5');
    });

    test('should handle styles without filter or opacity', () => {
      const span = document.createElement('span');
      ProcessorConfig.MODE_STYLES.custom = {};

      processor._applyModeStyles(span, 'custom');

      expect(span.style.filter).toBe('');
      expect(span.style.opacity).toBe('');
      delete ProcessorConfig.MODE_STYLES.custom;
    });
  });

  describe('_shouldSkipElement extra cases', () => {
    test('should skip contenteditable', () => {
      const div = document.createElement('div');
      Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });
      expect(processor._shouldSkipElement(div)).toBe(true);
    });

    test('should skip hidden or display none', () => {
      const divHidden = document.createElement('div');
      divHidden.hidden = true;
      expect(processor._shouldSkipElement(divHidden)).toBe(true);

      const divDisplayNone = document.createElement('div');
      divDisplayNone.style.display = 'none';
      expect(processor._shouldSkipElement(divDisplayNone)).toBe(true);
    });

    test('should skip element with emoji class', () => {
      const div = document.createElement('div');
      div.classList.add(ProcessorConfig.EMOJI_CLASS);
      expect(processor._shouldSkipElement(div)).toBe(true);
    });
  });

  describe('_processNodeImmediate error handling', () => {
    test('should swallow processing errors', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const spy = jest.spyOn(processor, '_processTextNode').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => processor._processNodeImmediate(textNode, 'hide')).not.toThrow();
      spy.mockRestore();
      debugSpy.mockRestore();
    });
  });

  describe('_processNodeImmediate element skipping', () => {
    test('should skip elements when _shouldSkipElement returns true', () => {
      const script = document.createElement('script');
      const skipSpy = jest.spyOn(processor, '_shouldSkipElement');

      processor._processNodeImmediate(script, 'hide');

      expect(skipSpy).toHaveBeenCalled();
      skipSpy.mockRestore();
    });

    test('should return early for already processed nodes', () => {
      const textNode = document.createTextNode('😀');
      processor.processedNodes.add(textNode);

      processor._processNodeImmediate(textNode, 'hide');
      expect(processor.processingQueue.length).toBe(0);
    });

    test('should ignore unsupported node types', () => {
      const commentNode = document.createComment('comment');
      processor._processNodeImmediate(commentNode, 'hide');
      expect(processor.processingQueue.length).toBe(0);
    });
  });

  describe('_processElementNode filtering', () => {
    test('should reject already processed text nodes', () => {
      const container = document.createElement('div');
      const textNode = document.createTextNode('😀');
      container.appendChild(textNode);
      processor.processedNodes.add(textNode);

      const textSpy = jest.spyOn(processor, '_processTextNode');
      processor._processElementNode(container, 'hide');

      expect(textSpy).not.toHaveBeenCalled();
      textSpy.mockRestore();
    });

    test('should reject text nodes whose parent should be skipped', () => {
      const container = document.createElement('div');
      const parent = document.createElement('span');
      parent.setAttribute('role', 'textbox');
      const textNode = document.createTextNode('😀');
      parent.appendChild(textNode);
      container.appendChild(parent);

      const textSpy = jest.spyOn(processor, '_processTextNode');
      processor._processElementNode(container, 'hide');

      expect(textSpy).not.toHaveBeenCalled();
      textSpy.mockRestore();
    });
  });

  describe('_processTextNode error handling', () => {
    test('should handle fragment creation errors', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const fragmentSpy = jest.spyOn(processor, '_createEmojiFragment').mockImplementation(() => {
        throw new Error('boom');
      });

      processor._processTextNode(textNode, 'hide');

      fragmentSpy.mockRestore();
      debugSpy.mockRestore();
    });

    test('should skip replacement when parent does not contain node', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      parent.contains = () => false;

      processor._processTextNode(textNode, 'hide');

      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
    });
  });

  describe('_processBatch continuation', () => {
    test('should schedule another batch when queue remains', () => {
      const rafSpy = jest.fn((cb) => cb());
      global.requestAnimationFrame = rafSpy;

      const nodes = Array.from({ length: ProcessorConfig.BATCH_SIZE + 1 }, () => document.createTextNode('😀'));
      processor.processingQueue = nodes.map(node => ({ node, mode: 'hide' }));

      const processSpy = jest.spyOn(processor, '_processNodeImmediate').mockImplementation(() => {});
      processor._processBatch();

      expect(rafSpy).toHaveBeenCalled();
      processSpy.mockRestore();
    });

    test('should use requestIdleCallback when available for continuation', () => {
      const idleSpy = jest.fn((cb) => cb());
      global.requestIdleCallback = idleSpy;

      const nodes = Array.from({ length: ProcessorConfig.BATCH_SIZE + 1 }, () => document.createTextNode('😀'));
      processor.processingQueue = nodes.map(node => ({ node, mode: 'hide' }));

      const processSpy = jest.spyOn(processor, '_processNodeImmediate').mockImplementation(() => {});
      processor._processBatch();

      expect(idleSpy).toHaveBeenCalled();
      processSpy.mockRestore();
      delete global.requestIdleCallback;
    });
  });

  describe('_scheduleProcessing using requestIdleCallback', () => {
    test('should use requestIdleCallback when available', () => {
      const idleSpy = jest.fn((cb) => cb());
      global.requestIdleCallback = idleSpy;

      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      processor.processNode(textNode, 'hide');
      expect(idleSpy).toHaveBeenCalled();

      delete global.requestIdleCallback;
    });
  });

  describe('_scheduleProcessing early return', () => {
    test('should return immediately when already processing', () => {
      processor.isProcessing = true;
      const rafSpy = jest.fn();
      global.requestAnimationFrame = rafSpy;

      processor._scheduleProcessing();
      expect(rafSpy).not.toHaveBeenCalled();
    });
  });

  describe('revertProcessing', () => {
    test('should remove emoji processing', () => {
      const textNode = document.createTextNode('😀');
      const parent = document.createElement('div');
      parent.appendChild(textNode);
      document.body.appendChild(parent);

      processor._processTextNode(textNode, 'hide');
      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(1);

      processor.revertProcessing();
      expect(parent.querySelectorAll('.emoji-blocker-emoji').length).toBe(0);
      expect(parent.textContent).toBe('😀');
    });
  });
});
