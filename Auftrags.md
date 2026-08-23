project_type: app
builder_profile: komplex

# Claude Code Execution Task: Diktierapp - Neubau

## Context Contract

Diese Datei ist der primaere Auftrag.

Erlaubter Startkontext:

1. Diese Datei vollstaendig lesen.
2. AGENTS.md / CLAUDE.md nur fuer Sicherheits-, Git- und Projektregeln lesen.
3. Danach sofort im Zielprojekt arbeiten.

## Ziel

Eine PWA ("Diktierapp") fuer Svens Android-Handy (Pixel 10 Pro), installierbar als App-Icon, komplett lokal und offline:

1. Diktieren per Mikrofon, Transkription lokal per Whisper (WASM/WebGPU, z.B. whisper.cpp via wllama oder transformers.js, Modell "base"/"small" deutsch).
2. Rohtext ansehen und korrigieren.
3. Auf Knopfdruck (nicht automatisch) Zusammenfassung oder Protokoll erstellen, lokal per kleinem quantisiertem LLM (z.B. Qwen2.5/Llama-3.2 3B Instruct Q4 via wllama/WebLLM, ~2 GB einmaliger Download ok).
4. Protokoll mit fester Struktur: Titel/Datum, Thema, Kernaussagen, Entscheidungen, To-dos (kein Teilnehmerfeld — Sven ist immer allein).
5. Eintraege lokal speichern (IndexedDB), Liste alter Eintraege.
6. Export: Markdown-Datei per Teilen-Dialog/Download (fuer Obsidian), HTML- und PDF-Ausgabe des Protokolls (PDF via Druckdialog oder jsPDF).
7. Kein Netzwerkzugriff ausser den einmaligen Modelldownloads (HuggingFace CDN). Keine Cloud, keine API-Keys.

## Zielordner

`C:\ZimmermannKI\projects\diktierapp`

## Aktueller Stand

- Ordner existiert noch nicht, Neubau von Scratch.
- PWA: statisches Frontend (index.html, CSS, JS-Module, manifest.webmanifest, Service Worker fuer Offline-Faehigkeit), kein Build-Framework noetig — Vanilla JS reicht und haelt es wartbar.

## Muss-Fixes

### 1. Projektgeruest + PWA-Grundlagen

Erwartung:
- index.html, styles.css, app.js (oder Module), manifest.webmanifest, service-worker.js, Icons (einfaches SVG/PNG).
- Installierbar auf Android (manifest + SW korrekt).

Akzeptanz:
- Lokaler Server startet, Seite laedt ohne Fehler in der Konsole, Lighthouse-Installierbarkeit Grundvoraussetzungen erfuellt (manifest + SW + Icons).

### 2. Audioaufnahme + lokale Whisper-Transkription

Erwartung:
- Aufnahme-Button (gross, Daumen-freundlich), MediaRecorder-API.
- Transkription lokal im Browser (transformers.js "Xenova/whisper-base" oder wllama mit whisper.cpp-WASM; deutsch).
- Fortschrittsanzeige beim Modell-Download und bei der Transkription.
- Modell im Browser-Cache (Cache Storage), danach offline nutzbar.

Akzeptanz:
- Nach einmaligem Download funktioniert Transkription ohne Netzwerk; Rohtext erscheint editierbar im Editor.

### 3. Zusammenfassung/Protokoll per lokalem LLM

Erwartung:
- Zwei bewusste Knoepfe: "Zusammenfassen" und "Protokoll erstellen" (kein Auto-Trigger).
- Kleines quantisiertes LLM lokal (WebLLM oder wllama, 3B-Klasse Q4), einmaliger Download ~2 GB, danach offline.
- Protokoll-Struktur fix: Titel/Datum, Thema, Kernaussagen, Entscheidungen, To-dos.

Akzeptanz:
- Beide Funktionen erzeugen aus dem Rohtext ein Ergebnis im Protokoll-View; laeuft ohne Cloud.

### 4. Speichern + Verlauf + Export

Erwartung:
- Eintraege in IndexedDB (Titel, Datum, Rohtext, Zusammenfassung, Protokoll).
- Verlaufsliste, Eintraege oeffnen/loeschen.
- Export: Markdown (Teilen/Download, fuer Obsidian), HTML-Datei, PDF (Druckdialog reicht).

Akzeptanz:
- Eintrag ueberlebt App-Neustart; Export-Dateien enthalten vollstaendigen Protokoll-Inhalt.

## Soll-Fixes

### 1. Einstellungsseite

- Modellwahl (whisper base/small), Aufnahmequalitaet, App-Info.

### 2. Design

- Dunkles, klares Design passend zur Marke Zimmermann KI Design (futuristisch, technisch, nicht generisch).

## Nicht umsetzen

- Keine Cloud-Dienste, keine API-Keys, keine Accounts.
- Kein App-Store-Build, kein Capacitor/React Native.
- Keine Englisch-Erkennung (nur Deutsch).
- Kein automatisches Zusammenfassen.

## Arbeitsweise

- Fixes nacheinander bearbeiten.
- Vanilla JS, keine Build-Pipeline.
- Alle Bibliotheken via CDN mit lokaler Fallback-Strategie bzw. so, dass sie vom Service Worker gecacht werden.

## Abschluss

Bitte liefern:

1. Zusammenfassung der geaenderten Dateien.
2. Status je Muss-Fix.
3. Ausgefuehrte Verifikation (lokaler Server, Konsolenfehler, Strukturpruefung).
4. Offene Punkte mit Begruendung.
