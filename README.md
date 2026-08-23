# Diktierapp — lokale PWA

Diktier-App fuer das Handy (PWA, installierbar als Icon). Alles laeuft lokal auf dem Geraet — keine Cloud, keine API-Keys.

## Funktionen

- Aufnahme per Mikrofon (MediaRecorder)
- Lokale Transkription mit Whisper (transformers.js, Modellwahl base/small)
- Zusammenfassung & Protokoll (feste Struktur: Titel/Datum, Thema, Kernaussagen, Entscheidungen, To-dos) per lokalem LLM (WebLLM, Qwen2.5-1.5B q4)
- Eintraege lokal in IndexedDB, Verlaufsliste
- Export: Markdown (fuer Obsidian, per Teilen-Dialog), HTML, PDF (Druckdialog)

## Starten (lokal testen)

Ein HTTPS- oder localhost-Kontext ist Pflicht (Mikrofon + Service Worker). Am PC:

```bash
cd C:\ZimmermannKI\projects\diktierapp
python -m http.server 8123
# dann http://localhost:8123 im Browser oeffnen
```

Auf dem Handy: am einfachsten den Server vom PC aus im selben WLAN freigeben und die Seite in Chrome am Handy oeffnen (Chrome erlaubt Mikrofon nur auf localhost/HTTPS — dafuer z.B. `npx serve` mit eigenem Zertifikat oder Port-Forwarding via `adb reverse tcp:8123 tcp:8123`).

## Erste Nutzung

1. App ueber Chrome-Menue "Zum Startbildschirm hinzufuegen" installieren.
2. Beim ersten Diktieren laedt die App einmalig das Whisper-Modell (~145 MB) und beim ersten Zusammenfassen das LLM (~1 GB) — danach komplett offline nutzbar.

## Hinweis

Die Modelle werden von HuggingFace/jsDelivr-CDN geladen (nur der einmalige Download). Der Inhalt der Diktate verlaesst das Geraet nie.
