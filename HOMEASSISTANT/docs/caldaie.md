# Riepilogo: caldaie Tuya in Home Assistant (Montagna, Pepi, Vapi)

Data del riepilogo: 24 ottobre 2026
Versioni viste: Home Assistant 2026.10.2 · HACS 2.0.5 · NextFloor v0.11.0 · Template Climate (HACS) · Mushroom · card-mod

Questo file riassume la chat: problema di partenza, cosa abbiamo scoperto, cosa è configurato adesso (con il codice finale) e cosa resta in sospeso. Dove una cosa non è stata verificata, è scritto.

---

## 1. Problema di partenza e obiettivo

- Il termostato Tuya della caldaia di montagna ("Caldaia casa nostra", Tuya "Temp", prodotto `gw173aldekvpzalg`) compariva in Home Assistant come un condizionatore: modi "Raffreddamento", "Ventilazione", "Riscaldamento", ecc.
- Un assistente precedente (Google) aveva lasciato un blocco `template: climate:` sbagliato in `configuration.yaml` e in `packages/caldaia_montagna.yaml`. Il componente `template` di Home Assistant non ha una piattaforma `climate`, quindi quella sintassi non poteva funzionare.
- Obiettivo: un termostato semplice (solo acceso/spento e temperatura), senza i modi da condizionatore, con tasti ON/OFF che non cambino la temperatura, e una scheda sempre visibile in NextFloor. Poi la programmazione oraria (ancora da fare).

## 2. Cosa abbiamo scoperto

- **I modi sbagliati arrivano dal termostato.** Tuya classifica il dispositivo come termostato generico (`wk`) e Home Assistant mostra i modi standard (cold, hot, wind, ...). Non si possono cambiare dall'entità.
- **Ogni modalità dell'app ricorda la sua temperatura.** Cambiare modalità da Home Assistant fa cambiare anche la temperatura, come nell'app. I salti a 22 °C e a 16 °C venivano da lì: il tasto "Riscaldamento" mandava `heat` (Program) e il tasto "Acceso" mandava `fan_only` (Temporary Program).
- **"Uscita attivata" (la caldaia che sta davvero scaldando) non arriva a Home Assistant.** Il cloud Tuya passa solo 5 dati all'integrazione ufficiale (acceso/spento, temperatura impostata, temperatura attuale, modo, blocco bambini). Nel log del dispositivo sulla piattaforma Tuya compare come "Working status" (1 = uscita attiva, 0 = spenta), ma Home Assistant non lo legge.
- **Tuya Local non è utilizzabile per la montagna.** Parla con il termostato sulla rete locale, e la caldaia di montagna è su un'altra rete rispetto a Home Assistant (che è a casa). Servirebbe una VPN (per esempio Tailscale) e un dispositivo sempre acceso in montagna.
- **Xtend Tuya (HACS) provato e rimosso.** Con le credenziali del progetto cloud non ha aggiunto "Working status" per la caldaia, e probabilmente ha contribuito a far disabilitare il termostato originale.
- **Soluzione adottata: Template Climate** (HACS, repository personalizzato `jcwillox/hass-template-climate`). Crea termostati nuovi con solo `off` e `heat`, che leggono l'originale e passano solo la temperatura.

## 3. Entità e nomi

| | Montagna ("Casa nostra") | Pepi | Vapi |
|---|---|---|---|
| Termostato originale Tuya | `climate.montagna_caldaia` | `climate.caldaia_pepi` | `climate.caldaia_vapi` |
| Termostato nuovo (Template Climate) | `climate.caldaia_montagna` | `climate.caldaia_pepi_termostato` | `climate.caldaia_vapi_termostato` |
| Selettore modalità | `select.montagna_mode` | `select.pepi_mode` | `select.vapi_mode` |
| Scena ON | `scene.montagna_caldaia_montagna_on` | `scene.montagna_caldaia_pepi_on` | `scene.montagna_caldaia_vapi_on` |
| Scena OFF | `scene.montagna_caldaia_montagna_off` | `scene.montagna_caldaia_pepi_off` | `scene.montagna_caldaia_vapi_off` |
| Scena "Manuale" | (non serve) | `scene.pepi_manuale` | `scene.vapi_manuale` |

Le scene sono "Tocca per eseguire" create in Smart Life. Quelle di Montagna le ha sistemate l'utente per spegnere/accendere senza toccare la temperatura.

## 4. Tabelle dei modi

**Montagna** (stato dell'entità originale `climate.montagna_caldaia`):

| Modalità in Smart Life | Stato in Home Assistant |
|---|---|
| Manual | `cool` |
| Program | `heat` |
| Temporary Program | `fan_only` |

Con la caldaia spenta lo stato è `off`: da spenta non si sa quale modalità sia rimasta.

**Pepi e Vapi** (stessa tabella, verificata su entrambe):

| Modalità | Stato | `preset_mode` |
|---|---|---|
| Manuale | `heat_cool` | `null` |
| Eco | `unknown` | `eco` |
| Program | `unknown` | `program` |

Per Pepi e Vapi, `climate.set_hvac_mode: heat_cool` **non** rimette Manuale. Si usa una scena Tuya che imposta la modalità Manuale (`scene.pepi_manuale`, `scene.vapi_manuale`).

## 5. `configuration.yaml` finale

Il blocco `set_hvac_mode` collega i tasti Off/Heat dei termostati nuovi alle scene (Off → scena OFF, qualunque altro → scena ON). Serve un riavvio dopo ogni modifica a questo file. Montagna ha `max_temp: 35`; Pepi e Vapi sono a 30.

```yaml
# Configurazione di default di Home Assistant (Non rimuovere)
default_config:

# Caricamento dei temi grafici
frontend:
  themes: !include_dir_merge_named themes

automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml

homeassistant:
  packages: !include_dir_named packages

# Integrazione SmartIR per il controllo dei dispositivi remoti
smartir:

# Condizionatore Comfee e termostati caldaie
climate:
  - platform: smartir
    name: "Condizionatore Comfee"
    unique_id: condizionatore_comfee
    device_code: 1125
    controller_data: remote.universal_remote

  - platform: climate_template
    name: "Caldaia Montagna"
    unique_id: caldaia_montagna_termostato
    modes:
      - "off"
      - "heat"
    min_temp: 5
    max_temp: 35
    temp_step: 0.5
    current_temperature_template: "{{ state_attr('climate.montagna_caldaia', 'current_temperature') }}"
    target_temperature_template: "{{ state_attr('climate.montagna_caldaia', 'temperature') }}"
    hvac_mode_template: "{{ 'off' if is_state('climate.montagna_caldaia', 'off') else 'heat' }}"
    set_temperature:
      - action: climate.set_temperature
        data:
          entity_id: climate.montagna_caldaia
          temperature: "{{ temperature }}"
    set_hvac_mode:
      - choose:
          - conditions:
              - condition: template
                value_template: "{{ hvac_mode == 'off' }}"
            sequence:
              - action: scene.turn_on
                target:
                  entity_id: scene.montagna_caldaia_montagna_off
        default:
          - action: scene.turn_on
            target:
              entity_id: scene.montagna_caldaia_montagna_on

  - platform: climate_template
    name: "Caldaia Pepi Termostato"
    unique_id: caldaia_pepi_termostato
    modes:
      - "off"
      - "heat"
    min_temp: 5
    max_temp: 30
    temp_step: 0.5
    current_temperature_template: "{{ state_attr('climate.caldaia_pepi', 'current_temperature') }}"
    target_temperature_template: "{{ state_attr('climate.caldaia_pepi', 'temperature') }}"
    hvac_mode_template: "{{ 'off' if is_state('climate.caldaia_pepi', 'off') else 'heat' }}"
    set_temperature:
      - action: climate.set_temperature
        data:
          entity_id: climate.caldaia_pepi
          temperature: "{{ temperature }}"
    set_hvac_mode:
      - choose:
          - conditions:
              - condition: template
                value_template: "{{ hvac_mode == 'off' }}"
            sequence:
              - action: scene.turn_on
                target:
                  entity_id: scene.montagna_caldaia_pepi_off
        default:
          - action: scene.turn_on
            target:
              entity_id: scene.montagna_caldaia_pepi_on

  - platform: climate_template
    name: "Caldaia Vapi Termostato"
    unique_id: caldaia_vapi_termostato
    modes:
      - "off"
      - "heat"
    min_temp: 5
    max_temp: 30
    temp_step: 0.5
    current_temperature_template: "{{ state_attr('climate.caldaia_vapi', 'current_temperature') }}"
    target_temperature_template: "{{ state_attr('climate.caldaia_vapi', 'temperature') }}"
    hvac_mode_template: "{{ 'off' if is_state('climate.caldaia_vapi', 'off') else 'heat' }}"
    set_temperature:
      - action: climate.set_temperature
        data:
          entity_id: climate.caldaia_vapi
          temperature: "{{ temperature }}"
    set_hvac_mode:
      - choose:
          - conditions:
              - condition: template
                value_template: "{{ hvac_mode == 'off' }}"
            sequence:
              - action: scene.turn_on
                target:
                  entity_id: scene.montagna_caldaia_vapi_off
        default:
          - action: scene.turn_on
            target:
              entity_id: scene.montagna_caldaia_vapi_on
```

Il file `packages/caldaia_montagna.yaml` è stato svuotato (resta un commento) perché conteneva il vecchio blocco `template:` sbagliato.

## 6. Selettori "Mode" (Impostazioni → Dispositivi e servizi → Helper → Template → Select)

**Montagna Mode** (`select.montagna_mode`)

- State: `{{ {'cool':'Manual','heat':'Program','fan_only':'Temporary Program'}.get(states('climate.montagna_caldaia'), 'Manual') }}`
- Available options: `{{ ['Manual', 'Program', 'Temporary Program'] }}`
- Actions on select:

```yaml
action: climate.set_hvac_mode
target:
  entity_id: climate.montagna_caldaia
data:
  hvac_mode: "{{ {'Manual':'cool','Program':'heat','Temporary Program':'fan_only'}[option] }}"
```

**Pepi Mode** (`select.pepi_mode`)

- State: `{% set p = state_attr('climate.caldaia_pepi','preset_mode') %}{{ 'Eco' if p == 'eco' else 'Program' if p == 'program' else 'Manuale' }}`
- Available options: `{{ ['Manuale', 'Eco', 'Program'] }}`
- Actions on select:

```yaml
choose:
  - conditions:
      - condition: template
        value_template: "{{ option == 'Manuale' }}"
    sequence:
      - action: scene.turn_on
        target:
          entity_id: scene.pepi_manuale
  - conditions:
      - condition: template
        value_template: "{{ option == 'Eco' }}"
    sequence:
      - action: climate.set_preset_mode
        target:
          entity_id: climate.caldaia_pepi
        data:
          preset_mode: eco
  - conditions:
      - condition: template
        value_template: "{{ option == 'Program' }}"
    sequence:
      - action: climate.set_preset_mode
        target:
          entity_id: climate.caldaia_pepi
        data:
          preset_mode: program
```

**Vapi Mode** (`select.vapi_mode`): identico a Pepi, con `climate.caldaia_vapi` e `scene.vapi_manuale`, e nello State `state_attr('climate.caldaia_vapi','preset_mode')`.

## 7. Scheda della plancia (esempio Montagna)

Pila verticale: termostato (+/−), tendina Mode (Mushroom), pulsanti ON e OFF che avviano le scene. ON si colora arancio chiaro quando il termostato nuovo è `heat`, OFF diventa grigio quando è `off`.

```yaml
type: vertical-stack
cards:
  - type: thermostat
    entity: climate.caldaia_montagna
    name: Montagna
  - type: custom:mushroom-select-card
    entity: select.montagna_mode
    icon_type: none
    primary_info: none
    secondary_info: none
  - type: horizontal-stack
    cards:
      - type: button
        name: 'ON'
        show_name: true
        show_icon: false
        tap_action:
          action: perform-action
          perform_action: scene.turn_on
          target:
            entity_id: scene.montagna_caldaia_montagna_on
        card_mod:
          style: |
            ha-card {
              height: 130px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              {% if is_state('climate.caldaia_montagna', 'heat') %}
              background: color-mix(in srgb, var(--state-climate-heat-color, #ff8100) 40%, white);
              {% endif %}
            }
            span {
              font-size: 25px;
              font-weight: bold;
            }
      - type: button
        name: 'OFF'
        show_name: true
        show_icon: false
        tap_action:
          action: perform-action
          perform_action: scene.turn_on
          target:
            entity_id: scene.montagna_caldaia_montagna_off
        card_mod:
          style: |
            ha-card {
              height: 130px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              {% if is_state('climate.caldaia_montagna', 'off') %}
              background: #e6e6e6;
              {% endif %}
            }
            span {
              font-size: 25px;
              font-weight: bold;
            }
grid_options:
  columns: 8
  rows: auto
```

**Pepi e Vapi:** stessa scheda, cambiando `name`, il termostato (`climate.caldaia_pepi_termostato` / `climate.caldaia_vapi_termostato`), il selettore (`select.pepi_mode` / `select.vapi_mode`), le scene (`scene.montagna_caldaia_pepi_on` e `_off`, `scene.montagna_caldaia_vapi_on` e `_off`) e l'entità negli `is_state` dei colori.

## 8. NextFloor

- **Plugin `caldaie5.js`** (file `www/nextfloor/caldaie5.js`, aggiunto in NextFloor → Extensions → Plugins con `/local/nextfloor/caldaie5.js`). Mostra tre schede fluttuanti (Casa nostra, Pepi, Vapi) con anello, Stato/Attuale/Impostata e tasti −, +, ON, OFF, solo nelle pagine in cui c'è un elemento NextFloor. Non l'ho potuto provare in anticipo: l'utente ha confermato che funziona. I file vecchi (`caldaie.js` … `caldaie4.js`) sono stati eliminati.
  - Nota tecnica: Home Assistant/Cloudflare tengono in memoria i file `.js`; quando un file cambiava e il browser mostrava quello vecchio, si è risolto dando al file un nome nuovo.
  - Il codice completo è nella chat (versione 5.0.0).
- **Termostati nel pannello della stanza:** nell'Editor, stanza SALA (piano CASA NOSTRA), stellina ☆ su "Caldaia Montagna" (il termostato nuovo, **non** quello originale "Caldaia casa nostra"). I tasti Off/Heat del pannello ora avviano le scene.
- **Preferiti** (Editor → FAVOURITES): "Caldaia montagna ON" e "Caldaia montagna OFF", visibili nel menu della stella ☆ della vista 3D.
- **Interruttori:** "Corrente Pepi" e "Corrente Vapi" piazzati con **Place** (veri interruttori, pillola con On e watt).
- **Vista di partenza** (Editor → START VIEW): il pulsante azzurro **Remember the current 3D view as the start** salva l'inquadratura. **Default** *ripristina* la vista standard: non va premuto dopo il salvataggio. Il salvataggio è stato fatto, ma resta da verificare se la vista d'insieme **All floors** usa davvero l'inquadratura salvata (l'utente riferisce che All floors riporta sempre alla stessa vista).
- **Lampadine smart:** si piazzano con **Place** dall'elenco DEVICES e diventano lampade nel 3D, accese con un tocco; la pressione lunga apre il menu rapido. Resta da provare se una lampadina può avere la stessa pillola degli interruttori ("Back to device pin" o simile).

## 9. Cose installate e rimosse

- Installati e usati: Template Climate (repository personalizzato HACS), Mushroom, card-mod (già presente), Simple Thermostat (già presente, non più usato nelle schede finali), NextFloor + plugin `caldaie5.js`.
- Provati e tolti: Xtend Tuya.
- Scaricato e mai configurato: Tuya Local (da togliere da HACS: Rimuovi).
- Script `script.apri_termostato_montagna`: non scritto da me, non funzionava (errore `fire-dom-event`); eliminato dall'utente.
- Vecchi file `www/nextfloor/caldaie.js`–`caldaie4.js`: eliminati.

## 10. Da sapere e rischi

- **Il termostato originale di Montagna si è disabilitato due volte da solo** (una volta anche cambiato di nome, `climate.caldaia`). Non so perché. Se le schede mostrano valori fermi, riattivarlo da Impostazioni → Dispositivi e servizi → Tuya → Caldaia casa nostra → "+1 entità disabilitata" → Abilita (e controllare che l'ID entità sia `climate.montagna_caldaia`).
- **Non usare i tasti dei modi del termostato Tuya originale** (cambiano modalità e temperatura). Usare i termostati nuovi, i selettori Mode e i pulsanti ON/OFF.
- **Stato "heat" del termostato nuovo = caldaia accesa, non "sta scaldando".** Quella informazione non arriva a Home Assistant.
- Ogni modifica a `configuration.yaml` richiede un riavvio (circa 10 minuti con il tunnel Cloudflare, a volte pagina 502 durante il riavvio). Controllare sempre prima in Strumenti per sviluppatori → YAML → Controlla configurazione.
- Pepi e Vapi: min 5, max 30. Montagna: min 5, max 35.
- Le scene di Pepi e Vapi sono state provate dalle schede della plancia (temperatura e modalità restano invariate, secondo l'utente).

## 11. In sospeso

1. **Programmazione oraria** (l'obiettivo iniziale): usare la modalità Program dei termostati da Smart Life, oppure la Scheduler Card di Home Assistant.
2. **Vista d'insieme in NextFloor:** verificare se All floors usa l'inquadratura salvata (test suggerito: salvare un'inquadratura molto diversa, ricaricare la pagina e guardare come si apre). Se non la usa, scrivere all'autore (discussione "Ideas" su GitHub, `therealMRBK/NextFloor`).
3. **Lampadina smart** con pillola On/Off come gli interruttori, e **lampione LED da giardino** (cercare nella libreria Furniture `garden`, `bollard`, `lamp`).
4. **Tuya Local:** rimuoverlo da HACS.
5. Se serve la lettura vera di "caldaia che sta scaldando": solo via VPN + Tuya Local con un dispositivo sempre acceso in montagna.

## Fonti consultate

- [NextFloor, repository](https://github.com/therealMRBK/NextFloor), [manuale](https://github.com/therealMRBK/NextFloor/blob/main/docs/manual.md), [plugin](https://github.com/therealMRBK/NextFloor/blob/main/docs/plugins.md), [changelog](https://github.com/therealMRBK/NextFloor/blob/main/CHANGELOG.md)
- [Template Climate](https://github.com/jcwillox/hass-template-climate)
- [Tuya Local](https://github.com/make-all/tuya-local), [Xtend Tuya](https://github.com/azerty9971/xtend_tuya)
- [Mushroom](https://github.com/piitaya/lovelace-mushroom)
