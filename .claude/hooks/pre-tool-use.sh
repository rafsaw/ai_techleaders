#!/usr/bin/env bash
# .claude/hooks/pre-tool-use.sh
# Hook PreToolUse dla narzędzia Bash. Claude Code podaje na stdin JSON
# (wzór: example.json obok), a kod wyjścia decyduje o losie komendy:
#   0 – komenda przechodzi,
#   2 – komenda zablokowana, treść stderr trafia do modelu jako błąd narzędzia,
#   inny – błąd hooka, komenda PRZECHODZI, a komunikat widzisz tylko Ty.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# .env.example i .env.template nie zawierają sekretów (op run musi je czytać),
# więc wycinamy je przed sprawdzeniem wzmianek o .env.
without_templates=${cmd//.env.example/}
without_templates=${without_templates//.env.template/}

block() {
  echo "Zablokowane przez politykę zespołu: $1. Nie próbuj obejść tej blokady innymi komendami." >&2
  exit 2
}

case "$cmd" in
  *"curl"*"|"*"sh"*|*"wget"*"|"*"sh"*) block "pobieranie skryptu prosto do powłoki" ;;
  *"rm -rf"*|*"rm -fr"*|*"rm -r "*|*"rm -R "*) block "rekursywne usuwanie (rm -r)" ;;
  *"~/.ssh"*|*"~/.aws"*|*'$HOME/.ssh'*|*'$HOME/.aws'*|*"$HOME/.ssh"*|*"$HOME/.aws"*) block "dostęp do kluczy i poświadczeń" ;;
esac

case "$without_templates" in
  *".env"*) block "odczyt pliku .env" ;;
esac

exit 0
