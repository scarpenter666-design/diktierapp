// Diktierapp — 100% lokal. Whisper (transformers.js) + kleines LLM (WebLLM).
import { openDB, saveEntry, listEntries, getEntry, deleteEntry, clearAll } from './db.js';
import { buildMarkdown, buildHtml } from './export.js';

const $ = (id) => document.getElementById(id);

function status(msg) {
  const el = $('model-status');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

// ---------- Ansichten ----------
const views = ['view-record', 'view-result', 'view-history', 'view-settings'];
function show(viewId) {
  views.forEach(v => $(v).classList.toggle('hidden', v !== viewId));
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === viewId));
}
document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => { if (t.dataset.view === 'view-history') renderHistory(); show(t.dataset.view); }));

$('btn-settings').addEventListener('click', () => show('view-settings'));
$('btn-settings-back').addEventListener('click', () => show('view-record'));
$('btn-back').addEventListener('click', () => show('view-record'));

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ---------- Aufnahme ----------
let mediaRecorder = null;
let chunks = [];
let recStart = 0;
let timerHandle = null;

$('btn-record').addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(timerHandle);
      $('btn-record').classList.remove('recording');
      $('record-label').textContent = 'Diktieren';
      $('rec-timer').classList.add('hidden');
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      await transcribe(blob);
    };
    mediaRecorder.start();
    $('btn-record').classList.add('recording');
    $('record-label').textContent = 'Stopp';
    recStart = Date.now();
    $('rec-timer').classList.remove('hidden');
    timerHandle = setInterval(() => {
      const s = Math.floor((Date.now() - recStart) / 1000);
      $('rec-timer').textContent =
        String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 500);
  } catch (err) {
    toast('Mikrofon nicht verfuegbar: ' + err.message);
  }
});

// ---------- Whisper (transformers.js, lokal im Browser) ----------
let asrPipeline = null;
let asrModelId = null;

async function loadWhisper() {
  const modelId = $('whisper-model').value;
  if (asrPipeline && asrModelId === modelId) return asrPipeline;

  status('Lade Whisper-Modell (einmalig, danach offline nutzbar)...');
  $('dl-progress').classList.remove('hidden');
  const { pipeline, env } = await import(
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1'
  );
  env.allowLocalModels = false;
  asrPipeline = await pipeline('automatic-speech-recognition', modelId, {
    dtype: 'q8',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) {
        const pct = Math.round((p.loaded / p.total) * 100);
        $('dl-progress').value = pct;
        status(`${p.file}: ${pct}%`);
      }
    },
  });
  asrModelId = modelId;
  $('dl-progress').classList.add('hidden');
  return asrPipeline;
}

async function transcribe(audioBlob) {
  try {
    const pipe = await loadWhisper();
    status('Transkribiere ...');
    const arrayBuffer = await audioBlob.arrayBuffer();
    // Audio dekodieren per AudioContext
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const wav = encodeWav(decoded.getChannelData(0), decoded.sampleRate);
    const out = await pipe(wav, { language: 'german', task: 'transcribe' });
    $('transcript').value = ($('transcript').value ? $('transcript').value + ' ' : '') + out.text.trim();
    status('');
    toast('Transkription fertig');
  } catch (err) {
    console.error(err);
    status('');
    toast('Transkription fehlgeschlagen: ' + err.message);
  }
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// ---------- Lokales LLM (WebLLM) ----------
let llmEngine = null;
const LLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'; // klein genug fuer das Handy

async function loadLlm() {
  if (llmEngine) return llmEngine;
  status('Lade Sprachmodell (einmalig ~1 GB, danach offline)...');
  $('dl-progress').classList.remove('hidden');
  const webllm = await import('https://esm.run/@mlc-ai/web-llm');
  llmEngine = await webllm.CreateMLCEngine(LLM_MODEL, {
    initProgressCallback: (p) => {
      $('dl-progress').value = Math.round(p.progress * 100);
      if (p.text) status(p.text.split('(')[0]);
    },
  });
  $('dl-progress').classList.add('hidden');
  return llmEngine;
}

async function runPrompt(prompt) {
  const engine = await loadLlm();
  const res = await engine.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 900,
  });
  return res.choices[0].message.content;
}

const SUMMARIZE_PROMPT = (text) =>
  'Fasse den folgenden deutschen Diktat-Text klar und sachlich in Stichpunkten zusammen. Antworte auf Deutsch.\n\nText:\n' + text;

const PROTOCOL_PROMPT = (text) =>
  'Erstelle aus dem folgenden deutschen Diktat ein Protokoll in exakt dieser Markdown-Struktur:\n' +
  '# <Titel>\n## Thema\n## Kernaussagen\n## Entscheidungen\n## To-dos\n' +
  'Verwende nur Informationen aus dem Text. Wenn eine Sektion keine Inhalte hat, schreibe "-". Antworte nur mit dem Protokoll.\n\nText:\n' + text;

// ---------- Ergebnis-Status ----------
let currentResult = null; // { title, markdown }

$('entry-title').addEventListener('input', () => {
  if (currentResult) currentResult.title = $('entry-title').value;
});

$('btn-summarize').addEventListener('click', async () => {
  const text = $('transcript').value.trim();
  if (!text) { toast('Kein Text zum Zusammenfassen'); return; }
  setBusy(true);
  try {
    const md = await runPrompt(SUMMARIZE_PROMPT(text));
    setResult($('entry-title').value || 'Zusammenfassung', md);
    toast('Zusammenfassung fertig');
  } catch (err) { console.error(err); toast('Fehler: ' + err.message); }
  setBusy(false);
});

$('btn-protocol').addEventListener('click', async () => {
  const text = $('transcript').value.trim();
  if (!text) { toast('Kein Text fuer ein Protokoll'); return; }
  setBusy(true);
  try {
    const md = await runPrompt(PROTOCOL_PROMPT(text));
    const m = md.match(/^#\s+(.+)$/m);
    setResult(m ? m[1] : 'Protokoll', md);
    toast('Protokoll erstellt');
  } catch (err) { console.error(err); toast('Fehler: ' + err.message); }
  setBusy(false);
});

function setResult(title, markdown) {
  currentResult = { title, markdown };
  $('entry-title').value = title;
  $('result-content').innerHTML = renderMarkdownLite(markdown);
  show('view-result');
}

function renderMarkdownLite(md) {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*)$/gm, '<h3>$1</h3>')
    .replace(/^\s*[-*] (.*)$/gm, '&bull; $1<br>');
  html += '';
  return html;
}

function setBusy(busy) {
  ['btn-summarize', 'btn-protocol'].forEach(id => $(id).disabled = busy);
  if (busy) status('Arbeite ...'); else status('');
}

// ---------- Speichern / Verlauf ----------
$('btn-save').addEventListener('click', async () => {
  const text = $('transcript').value.trim();
  if (!text && !currentResult) { toast('Nichts zu speichern'); return; }
  await saveEntry({
    title: $('entry-title').value || 'Eintrag ' + new Date().toLocaleString('de-DE'),
    transcript: text,
    resultTitle: currentResult?.title || '',
    resultMd: currentResult?.markdown || '',
  });
  toast('Gespeichert');
});

async function renderHistory() {
  const entries = await listEntries();
  const ul = $('history-list');
  ul.innerHTML = '';
  for (const e of entries.sort((a, b) => b.createdAt - a.createdAt)) {
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'entry-meta';
    meta.innerHTML = `<div class="entry-title"></div><div class="entry-date">${new Date(e.createdAt).toLocaleString('de-DE')}</div>`;
    meta.querySelector('.entry-title').textContent = e.title;
    meta.addEventListener('click', () => {
      $('transcript').value = e.transcript || '';
      setResult(e.resultTitle || e.title, e.resultMd || '');
      show('view-result');
    });
    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = '\u2715';
    del.addEventListener('click', async () => {
      await deleteEntry(e.id);
      renderHistory();
      toast('Geloescht');
    });
    li.append(meta, del);
    ul.appendChild(li);
  }
}

$('btn-clear-db').addEventListener('click', async () => {
  if (!confirm('Wirklich alle Eintraege loeschen?')) return;
  await clearAll();
  toast('Alle Eintraege geloescht');
});

// ---------- Export ----------
$('btn-export-md').addEventListener('click', async () => {
  if (!currentResult) { toast('Kein Ergebnis vorhanden'); return; }
  const md = buildMarkdown(currentResult, $('transcript').value);
  await shareOrDownload(md, 'text/markdown', safeName(currentResult.title) + '.md');
});
$('btn-export-html').addEventListener('click', async () => {
  if (!currentResult) { toast('Kein Ergebnis vorhanden'); return; }
  const html = buildHtml(currentResult);
  await shareOrDownload(html, 'text/html', safeName(currentResult.title) + '.html');
});
$('btn-export-pdf').addEventListener('click', () => window.print());

async function shareOrDownload(content, mime, filename) {
  const file = new File([content], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (_) { /* Nutzer abgebrochen */ }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeName(s) {
  return (s || 'export').replace(/[^\w\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df -]/g, '').trim() || 'export';
}

// ---------- Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  // Alle 60 Sekunden auf Updates pruefen; neues SW-Update sofort aktivieren.
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update());
  }, 60000);
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}
