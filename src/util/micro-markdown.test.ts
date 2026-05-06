/**
 * Phase 173 — micro markdown renderer tests.
 */
import { describe, it, expect } from 'vitest';
import { renderMicroMarkdown } from './micro-markdown.js';

describe('renderMicroMarkdown (Phase 173)', () => {
  it('renders empty input as empty string', () => {
    expect(renderMicroMarkdown('')).toBe('');
  });

  it('renders plain text as a <p>', () => {
    expect(renderMicroMarkdown('hello world')).toBe('<p>hello world</p>');
  });

  it('escapes HTML special characters in plain text', () => {
    expect(renderMicroMarkdown('a < b & c > "quoted"')).toBe(
      '<p>a &lt; b &amp; c &gt; &quot;quoted&quot;</p>',
    );
  });

  it('renders bullet lines into a single <ul>', () => {
    const md = '- one\n- two\n- three';
    expect(renderMicroMarkdown(md)).toBe(
      '<ul>\n<li>one</li>\n<li>two</li>\n<li>three</li>\n</ul>',
    );
  });

  it('closes <ul> when a non-bullet line follows', () => {
    const md = '- item\nmore text';
    expect(renderMicroMarkdown(md)).toBe(
      '<ul>\n<li>item</li>\n</ul>\n<p>more text</p>',
    );
  });

  it('renders ### as h4 (depth+1 to leave h3 for the parent header)', () => {
    expect(renderMicroMarkdown('### Foo')).toBe('<h4>Foo</h4>');
  });

  it('renders ## as h3', () => {
    expect(renderMicroMarkdown('## Foo')).toBe('<h3>Foo</h3>');
  });

  it('renders **bold** inline', () => {
    expect(renderMicroMarkdown('this is **bold** text')).toBe(
      '<p>this is <strong>bold</strong> text</p>',
    );
  });

  it('renders `code` inline', () => {
    expect(renderMicroMarkdown('foo `bar` baz')).toBe(
      '<p>foo <code>bar</code> baz</p>',
    );
  });

  it('inline code wins over bold (no bold parsing inside code)', () => {
    expect(renderMicroMarkdown('`**not bold**`')).toBe(
      '<p><code>**not bold**</code></p>',
    );
  });

  it('renders --- as <hr />', () => {
    expect(renderMicroMarkdown('---')).toBe('<hr />');
  });

  it('does NOT execute embedded HTML or scripts (XSS safety)', () => {
    expect(renderMicroMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });
});
