# Ablage

Verträge, Rechnungen, Briefe, Garantien, Reisekosten und persönliche Dokumente. Eigenständige Web-App (PWA), verbunden mit CashFlow über dasselbe Supabase-Projekt.

## Einrichtung
1. Auf GitHub ein neues Repo `ablage` anlegen und diesen Ordner hochladen.
2. Settings › Pages › Branch `main`, Ordner `/ (root)` → `https://dortenestler-cyber.github.io/ablage/`.
3. In Supabase (SQL Editor) das SQL aus der App ausführen: Mehr › Einrichtung › SQL kopieren. Legt die Tabelle `ablage` an.
4. In der App unter Mehr mit dem CashFlow-Konto anmelden (gleiches Passwort, gleiches Sync-Passwort).
5. Auf iPhone/iPad in Safari öffnen › Teilen › Zum Home-Bildschirm.

## Technik
- Daten: Tabelle `ablage` (eine verschlüsselte Zeile je Konto), gleicher Schlüssel wie CashFlow (PBKDF2 aus Sync-Passwort + Salt der `cashflow`-Zeile, AES-GCM).
- Dateien: Bucket `belege`, Ordner `uid/a/`, verschlüsselt. Lokal in IndexedDB `ab-docs`.
- CashFlow wird nur gelesen: Verträge, Kosten, Kündigungsfristen, Buchungen mit `e.ab=<Dokument-ID>` (bezahlt/erstattet).
- KI-Auslesen über die vorhandene Funktion `ai` (op `chat`, strukturierte Ausgabe), nur auf Knopfdruck.
- Version erhöhen: `./bump.sh 2`.
