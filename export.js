// Export-Helfer: Markdown und HTML aus einem Ergebnis

export function buildMarkdown(result, transcript) {
  let md = `# ${result.title}\n\n_${new Date().toLocaleString('de-DE')}_\n\n${result.markdown}`;
  if (transcript) md += `\n\n## Original-Diktat\n\n${transcript}`;
  return md;
}

export function buildHtml(result) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(result.title)}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a2233; }
h1 { border-bottom: 2px solid #4fd1c5; padding-bottom: 8px; }
.meta { color: #667; font-size: 0.9rem; }
h3 { color: #0d7a70; margin-top: 24px; }
</style>
</head>
<body>
<h1>${esc(result.title)}</h1>
<p class="meta">${new Date().toLocaleString('de-DE')}</p>
${mdToHtml(result.markdown)}
</body>
</html>`;
}

function mdToHtml(md) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return md.split(/\n/).map((line) => {
    if (/^#{1,3} /.test(line)) {
      const level = Math.min(3, line.match(/^#+/)[0].length);
      return `<h${level}>${esc(line.replace(/^#+ /, ''))}</h${level}>`;
    }
    if (/^\s*[-*] /.test(line)) return `<li>${esc(line.replace(/^\s*[-*] /, ''))}</li>`;
    if (!line.trim()) return '';
    return `<p>${esc(line)}</p>`;
  }).join('\n');
}
