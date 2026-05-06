/**
 * Phase 173 — micro markdown renderer for the what's-new modal's
 * release-note bodies.
 *
 * Supports the small subset of markdown the CHANGELOG uses:
 *   - `### Foo` headings (h3)
 *   - `- bullet` list items grouped into `<ul>`
 *   - `**bold**` inline emphasis
 *   - `` `code` `` inline code
 *   - Plain paragraph text separated by blank lines
 *
 * Everything else (links, images, tables, blockquotes, html, etc.)
 * is escaped to plain text. Stays small (~80 lines, ~1 KB
 * minified) — adding a real markdown lib would balloon the lazy
 * chunk. The renderer is permissive: any line that doesn't match
 * a known pattern becomes a plain `<p>`.
 */

/** Escape a string for safe HTML insertion. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Apply inline transforms (`**bold**`, `` `code` ``) to escaped text. */
function applyInline(escaped: string): string {
  // Tokenize inline code spans first into placeholders so bold
  // parsing can't reach inside `<code>` content. (E.g. `**foo**`
  // should render literally as `**foo**` between code tags, not
  // be interpreted as bold.)
  const codeSpans: string[] = [];
  let html = escaped.replace(/`([^`\n]+)`/g, (_, body: string) => {
    const placeholder = `\x00CODE${codeSpans.length}\x00`;
    codeSpans.push(`<code>${body}</code>`);
    return placeholder;
  });
  // Bold: non-greedy across non-newline content.
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Restore code spans.
  html = html.replace(/\x00CODE(\d+)\x00/g, (_, n: string) => codeSpans[+n]!);
  return html;
}

/**
 * Render a markdown subset to HTML. Accepts the markdown text as
 * a string (with `\n` line separators). Output is ready to inject
 * via `innerHTML` — input is escaped first so user-authored
 * markdown can't smuggle scripts.
 */
export function renderMicroMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  function flushList(): void {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line === '') {
      flushList();
      continue;
    }
    // Bullet list line: starts with `- ` or `* `.
    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${applyInline(escapeHtml(bulletMatch[1]!))}</li>`);
      continue;
    }
    flushList();
    // Heading line: `### Foo`. We support up to h4 since the
    // CHANGELOG mostly uses h3.
    const headingMatch = /^(#{2,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const depth = headingMatch[1]!.length;
      const tag = `h${Math.min(6, depth + 1)}`;
      out.push(
        `<${tag}>${applyInline(escapeHtml(headingMatch[2]!))}</${tag}>`,
      );
      continue;
    }
    // Horizontal rule (`---`) — used in the CHANGELOG between
    // entries; render as a thin divider.
    if (/^-{3,}$/.test(line)) {
      out.push('<hr />');
      continue;
    }
    // Plain paragraph. Wrap each non-blank line in its own <p>;
    // blank-line separation is what makes paragraphs distinct.
    out.push(`<p>${applyInline(escapeHtml(line))}</p>`);
  }
  flushList();
  return out.join('\n');
}
