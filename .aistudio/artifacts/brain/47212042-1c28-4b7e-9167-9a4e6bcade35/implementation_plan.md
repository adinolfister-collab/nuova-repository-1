# Audit Pre-Rilascio e Piano di Pubblicazione IBD Care

Audit tecnico completo dell'applicazione prima della pubblicazione: verifica della build di produzione, consistenza del periodo di prova (45 giorni), sincronizzazione dei dati guest e controllo degli stati di accesso.

## Decisioni Confermate dall'Utente

> [!IMPORTANT]
> - **Ambito di verifica**: Audit completo (build, console, flussi guest, auth e trial).
> - **Modalità di intervento**: Presentazione dell'elenco delle anomalie rilevate con relative soluzioni nel piano prima di procedere.
> - **Gestione dati di prova**: Mantenimento della persistenza dei dati locali con opzione di reset pulito accessibile.

---

## 1. Risultati dell'Audit Pre-Rilascio

L'analisi dell'intera codebase ha evidenziato che l'applicazione è in uno stato molto solido per il rilascio, ma presenta alcune discrepanze residue da risolvere prima della pubblicazione:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ESITO AUDIT APPLICAZIONE                       │
├────────────────────────────┬───────────┬───────────────────────────────┤
│ Ambito                     │ Stato     │ Dettaglio                     │
├────────────────────────────┼───────────┼───────────────────────────────┤
│ Build di produzione        │  OK       │ 0 errori con Vite & Tailwind  │
│ Rimozione Sezione Founder  │  OK       │ Pagine, hook, link e menu OK  │
│ Routing /founders          │  OK       │ Redirect automatico su /      │
│ Server Node / Proxy Gemini │  OK       │ Endpoint /api/gemini/chat OK  │
│ Metadata & Tag SEO         │  OK       │ Titolo e meta sincronizzati   │
│ Coerenza giorni Trial      │  ATTENZIONE│ Residui "30 giorni" in 3 file │
│ Sincronizzazione Guest     │  ATTENZIONE│ Mancano farmaci/dosi in check │
│ Opzione Reset Dati Demo    │  ATTENZIONE│ Presente in banner, non in    │
│                            │           │ Impostazioni                  │
└────────────────────────────┴───────────┴───────────────────────────────┘
```

---

## 2. Anomalie Rilevate e Relative Soluzioni

### Anomalia 1: Riferimenti Residui a "30 giorni" invece di 45 giorni
- **Descrizione**: In alcune schermate amministrative e documenti di supporto (`MarketingAdmin.jsx`, `DemoGuestReport.jsx`, `accessReportData.js`) sono ancora presenti testi e placeholder con "30 giorni".
- **Soluzione**: Sostituire con "45 giorni" per garantire assoluta coerenza su tutte le viste dell'app.

### Anomalia 2: Controllo di Sincronizzazione Dati Guest Incompleto in `AppLayout.jsx`
- **Descrizione**: Il controllo al login verificava solo `guestSymptoms`, `guestFoods` e `guestRecords`, trascurando terapie (`guestMeds`) e dosi (`guestDoses`).
- **Soluzione**: Utilizzare la funzione omnicomprensiva `guestHasAnyEntries()` per migrare al cloud tutte le registrazioni dell'ospite.

### Anomalia 3: Strumento di "Reset Dati di Prova" Centralizzato
- **Descrizione**: L'utente ha richiesto di mantenere i dati di prova con un'opzione di reset pulito. Al momento il reset è accessibile solo nel banner in cima al diario; se l'utente naviga in Impostazioni, trova solo l'eliminazione dell'account.
- **Soluzione**: Aggiungere in `Settings.jsx` una sezione chiara e sicura ("Dati locali & Modalità Demo") con pulsante "Ripristina dati demo", protetto da finestra di conferma, che ripulisce la cache locale senza toccare l'eventuale account cloud.

---

## 3. Architettura dei Flussi di Rilascio

```
                       ┌─────────────────────────┐
                       │   Ospite / Visitatore   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Demo Locale (45 giorni) │
                       │   - Dati su localStorage│
                       │   - Opzione Reset Demo  │
                       └────────────┬────────────┘
                                    │
                       (Registrazione o Login)
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Sincronizzazione      │
                       │   - Migrazione completa │
                       │     (sintomi, pasti,    │
                       │      farmaci, referti)  │
                       │   - Svuotamento locale  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Account Cloud         │
                       │   - 45 gg trial cloud   │
                       │   - Lettura dopo scad.  │
                       └─────────────────────────┘
```

---

## 4. Piano di Azione Operativo

1. **Rettifica copie e durate residue**:
   - Aggiornare `MarketingAdmin.jsx` per usare `45 giorni` nel generatore di post e CTA.
   - Aggiornare `DemoGuestReport.jsx` e `accessReportData.js` con il periodo effettivo di 45 giorni.
2. **Perfezionamento sincronizzazione in `AppLayout.jsx`**:
   - Sostituire il controllo parziale con `guestHasAnyEntries()`.
3. **Integrazione sezione Reset Dati Demo in `Settings.jsx`**:
   - Inserire scheda dedicata per il ripristino dei dati locali con dialogo di conferma e notifica di successo.
4. **Verifica finale di compilazione**:
   - Eseguire `compile_applet` e confermare l'assenza di errori bloccanti.
