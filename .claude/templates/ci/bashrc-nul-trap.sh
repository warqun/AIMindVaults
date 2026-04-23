# Append to ~/.bashrc (or to whatever bash init file an AI agent actually sources).
# Intercepts every command right before it runs and blocks Windows CMD-style NUL redirection.
#
# The DEBUG trap sees BASH_COMMAND before execution, unlike PROMPT_COMMAND which only
# runs between interactive prompts and misses non-interactive agent calls.
#
# Source: deep research 2026-04-21 (`20260421_nul_파일_누적_생성_이슈_리서치.md`)
block_nul_redir() {
  local re='(^|[[:space:];|&])(1?>|2>|>>|1>>|2>>|&>)[[:space:]]*[Nn][Uu][Ll]([[:space:];|&]|$)'
  if [[ $BASH_COMMAND =~ $re ]]; then
    printf 'BLOCKED: dangerous Windows-style NUL redirection detected: %s\n' "$BASH_COMMAND" >&2
    false
  fi
}

trap 'block_nul_redir' DEBUG
