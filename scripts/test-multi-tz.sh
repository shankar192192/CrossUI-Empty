#!/usr/bin/env bash
# Runs the test suite once per system timezone below. All timezone math in
# this app is meant to be entirely independent of the machine's own system
# timezone — it only ever reasons about client timezones and IST via
# explicit IANA identifiers. A real bug shipped once where that assumption
# quietly broke (a Date object was fed through a date-fns-tz function that
# reads it via the JS runtime's *local* getters), and every test still
# passed because CI/dev happened to run on a UTC machine. Run this before
# trusting a change to lib/followups.ts.
set -euo pipefail

ZONES=(
  "UTC"
  "Asia/Kolkata"
  "America/New_York"
  "America/Los_Angeles"
  "Europe/London"
  "Australia/Sydney"
  "Pacific/Midway"
  "Pacific/Kiritimati"
  "Asia/Kathmandu"
  "Pacific/Chatham"
)

fail=0
for tz in "${ZONES[@]}"; do
  echo "=== TZ=$tz ==="
  if ! TZ="$tz" npx vitest run; then
    fail=1
  fi
done

exit $fail
