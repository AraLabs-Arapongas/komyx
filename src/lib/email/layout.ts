// No "server-only": the admin template editor renders the same HTML for its live preview.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain branded layout: one message, one button. Inline styles only (email clients). */
export function buttonEmail({ title, intro, button, url, outro }: { title: string; intro: string; button: string; url: string; outro: string }) {
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#1b1f3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:800;color:#c2410c;padding-bottom:24px">Komyx</td></tr>
<tr><td style="font-size:22px;font-weight:800;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;padding-bottom:24px">${esc(intro).replace(/\n/g, "<br>")}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${esc(url)}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:999px">${esc(button)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#5b5f7a">${esc(outro)}</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#8a8ea8;padding-top:24px;word-break:break-all">Se o botão não funcionar, copie este endereço no navegador:<br>${esc(url)}</td></tr>
</table>
<p style="font-size:12px;color:#8a8ea8;margin-top:16px">Komyx · Gestão para buffets</p>
</td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${button}: ${url}\n\n${outro}\n\nKomyx · Gestão para buffets`;
  return { html, text };
}
