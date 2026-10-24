#!/usr/bin/env bash
# Used by .github/workflows/app-check.yml.
# Runs a command, shows its output in the log, and — if it fails — also reports the last lines
# (last 200 lines) as one GitHub annotation on the commit, so the error is readable without opening the Actions log.
#   usage: tools/ci-step.sh "<title>" <command…>
title="$1"; shift
log="$(mktemp)"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  body="$(tail -n 200 "$log" | sed -e 's/%/%25/g' -e 's/\r//g' | sed -e ':a;N;$!ba;s/\n/%0A/g')"
  echo "::error title=${title} failed::${body}"
fi
exit "$status"
