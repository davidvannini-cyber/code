#!/bin/bash
# Si lancia DENTRO la cartella di un repository nuovo.
# Copia l'hook di avvio (le domande iniziali). La skill karpathy-guidelines NON viene copiata qui:
# al primo avvio Claude ti chiede se installarla.
# Non sovrascrive file già esistenti.
set -e
BASE="${BASE_URL:-https://raw.githubusercontent.com/davidvannini-cyber/code/main}"
[ -d .git ] || { echo "Errore: questa cartella non e' un repository git. Entra nella cartella del repository nuovo e riprova."; exit 1; }

mkdir -p .claude/hooks
curl -fsSL "$BASE/.claude/hooks/consensi-avvio.sh" -o .claude/hooks/consensi-avvio.sh
chmod +x .claude/hooks/consensi-avvio.sh

if [ -f .claude/settings.json ]; then
  echo "ATTENZIONE: .claude/settings.json esiste gia' e NON l'ho toccato: l'hook non e' collegato. Chiedi a Claude di aggiungerlo."
else
cat > .claude/settings.json <<'JSON'
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/consensi-avvio.sh\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
JSON
fi

[ -f REGISTRO-SALVATAGGI.md ] || printf '# Registro dei salvataggi\n\n| Data | Commit di partenza | File modificati | Come tornare indietro |\n|---|---|---|---|\n' > REGISTRO-SALVATAGGI.md
echo "Fatto. Ora fai commit e push di .claude e REGISTRO-SALVATAGGI.md (o chiedilo a Claude)."
