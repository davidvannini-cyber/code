# REA

Installazione di REA (https://github.com/morluto/rea), Reverse Engineer Anything, **tutta dentro `/code`**.

- Installazione locale (nessuna installazione globale): `npm install --prefix REA --ignore-scripts`
- Comando: `REA/node_modules/.bin/rea` (esempio: `REA/node_modules/.bin/rea --help`)
- `REA/node_modules/` e `REA/analisi/` sono esclusi dal repository (`.gitignore`): i risultati delle analisi vanno in `REA/analisi/`
- Frida (script di installazione) non abilitata: `npm rebuild frida --prefix REA` solo se serve
- Registrazione per Claude Code (scrive fuori da /code, in ~/.claude.json): non eseguita
- Il clone sorgente `REA/rea` e' escluso dal repository: `git clone --depth 1 https://github.com/morluto/rea REA/rea`
