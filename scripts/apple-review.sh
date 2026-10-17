#!/usr/bin/env bash
# App Store review uses the permanent demo buffet "Komyx Buffet" (/p/komyx-buffet), rebuilt every
# night by app.reset_demo_buffet() (supabase/migrations/20261017150000_demo_buffet.sql).
#
#   scripts/apple-review.sh   # prints what to do before submitting a version
set -euo pipefail

cat <<'TXT'
Antes de enviar uma versão para a Apple:

1. Supabase (produção) → SQL Editor:  select app.reset_demo_buffet();
   (recria a demo com datas a partir de hoje; ela também roda sozinha toda noite às 03:30)
2. App Store Connect → App Review → Sign-in information:
     buffet:  demo@komyx.com.br  (senha da conta demo, guardada pelo Thiago)
     cliente: celular 11900000001 com o código do Test Phone Number
3. Supabase → Authentication → Sign In / Providers → Phone → Test Phone Numbers:
     5511900000001=<código de 6 dígitos>   (deixe fixo: é o login do cliente demo)

Nada para desfazer depois da aprovação.
TXT
