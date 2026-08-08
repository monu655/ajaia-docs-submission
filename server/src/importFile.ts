// Converts an uploaded .txt or .md file into a simple HTML string that the
// TipTap editor on the client can load directly. This is intentionally
// lightweight: it is not a full Markdown parser. It handles the common
// cases (headings, bold, italic, list items, paragraphs) which is enough
// to prove out "upload a file -> get an editable document" end to end.
// Anything fancier (tables, nested lists, images) is out of scope — see
// ARCHITECTURE.md for what was cut and why.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  return out;
}

export function fileToHtml(raw: string, ext: string): string {
  if (ext !== ".md") {
    // Plain text: one paragraph per non-empty line.
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return "<p></p>";
    return lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  }

  const lines = raw.split(/\r?\n/);
  const html: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      html.push(`<ul>${listBuffer.map((li) => `<li>${li}</li>`).join("")}</ul>`);
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      listBuffer.push(inlineMarkdown(bullet[1]));
      continue;
    }
    flushList();
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }
  flushList();
  return html.join("") || "<p></p>";
}
