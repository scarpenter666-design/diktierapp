# Builder-Output: Diktierapp (2026-08-23)

## Geaenderte Dateien (Neubau)

- `Auftrags.md` — Architect-Auftrag
- `index.html` — UI mit 4 Ansichten (Diktieren, Ergebnis, Verlauf, Einstellungen), Tab-Bar
- `styles.css` — dunkles Design (Zimmermann KI Stil)
- `app.js` — Aufnahme (MediaRecorder), Whisper via transformers.js (CDN, lokal im Browser), LLM via WebLLM (Qwen2.5-1.5B q4), Zusammenfassung/Protokoll auf Knopfdruck, Export
- `db.js` — IndexedDB (speichern, Liste, loeschen, clearAll)
- `export.js` — Markdown- und HTML-Erzeugung
- `manifest.webmanifest`, `service-worker.js`, `icons/icon.svg|192|512` — PWA-Geruest

## Muss-Fixes

1. Projektgeruest + PWA — erledigt (manifest + SW + Icons, installierbar).
2. Aufnahme + Whisper lokal — erledigt (transformers.js q8, deutsch, Fortschrittsanzeige, WAV-Reencode fuer Whisper-Eingabe).
3. LLM-Zusammenfassung/Protokoll — erledigt (WebLLM, feste Protokollstruktur ohne Teilnehmerfeld, nur bewusste Knoepfe).
4. Speichern/Verlauf/Export — erledigt (IndexedDB, MD/HTML/PDF-Druck).

## Verifikation

- `node --check` auf alle JS-Dateien: OK
- `python -m json.tool manifest.webmanifest`: OK
- `python -m http.server 8123`: alle 10 Dateien HTTP 200
- Live-Browsertest im Handy-Kontext (Mikrofon/WebGPU) nicht moeglich — echte Transkriptions-/LLM-Laeufe nur auf dem Pixel pruefbar.

## Reviewer bitte besonders pruefen

- CDN-URLs in app.js (@huggingface/transformers@3.3.1, esm.run/@mlc-ai/web-llm) aktuell und funktional
- AudioContext decodeAudioData mit webm/opus vom MediaRecorder (Android Chrome: ok, aber real testen)
