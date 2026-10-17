#!/usr/bin/env bash
# Demo account for App Store review, in production.
#
#   scripts/apple-review.sh up   | pbcopy   # paste in the Supabase SQL Editor before submitting a version
#   scripts/apple-review.sh down | pbcopy   # paste after Apple approves
#
# `up` = supabase/seed.sql (Festa & Cia, idempotent, dates relative to today) + a cleanup that keeps
# only the owner login, with a new random password printed on stderr (it never goes to the clipboard
# or the repo). Put that password and the test phone in App Store Connect → App Review.
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-}" in
  up)
    password="Demo-$(openssl rand -hex 6)"
    cat supabase/seed.sql
    printf '\n'
    sed "s/__DEMO_PASSWORD__/${password}/" supabase/demo/apple-review-after-seed.sql
    {
      echo ""
      echo "Conta demo para o App Review:"
      echo "  buffet:  dona@festabuffet.test / ${password}"
      echo "  cliente: celular 11999990002, código 123456"
      echo "No Supabase: Authentication → Sign In / Providers → Phone → Test Phone Numbers: 5511999990002=123456"
    } >&2
    ;;
  down)
    cat supabase/demo/apple-review-down.sql
    echo "Depois: tire o 5511999990002 de Test Phone Numbers no Supabase." >&2
    ;;
  *)
    echo "uso: scripts/apple-review.sh up|down" >&2
    exit 1
    ;;
esac
