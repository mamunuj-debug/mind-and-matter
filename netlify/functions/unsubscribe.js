// ── Mind & Matter — Unsubscribe Function ────────────────────────────────────
// GET /.netlify/functions/unsubscribe?t=<base64-encoded-email>
// Renders a confirmation page and marks the subscriber inactive in Blobs.
// ────────────────────────────────────────────────────────────────────────────

const { getStore } = require('@netlify/blobs');

const SITE_URL = (process.env.URL || 'https://mind-and-matter-mamunuj.netlify.app').replace(/\/$/, '');

exports.handler = async (event) => {
  const token = (event.queryStringParameters || {}).t || '';

  if (!token) {
    return htmlResponse(400, page('Invalid Link', 'This unsubscribe link appears to be invalid.', false));
  }

  // Decode email from base64 token
  let email;
  try {
    email = Buffer.from(decodeURIComponent(token), 'base64').toString('utf-8').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('bad email');
  } catch {
    return htmlResponse(400, page('Invalid Link', 'This unsubscribe link is malformed.', false));
  }

  try {
    const store = getStore({ name: 'subscribers', consistency: 'strong' });
    const raw   = await store.get(email, { type: 'text' }).catch(() => null);

    if (raw) {
      const sub = JSON.parse(raw);
      sub.active          = false;
      sub.unsubscribedAt  = new Date().toISOString();
      await store.set(email, JSON.stringify(sub));
    }
    // Respond the same whether they existed or not (prevents email enumeration)
    return htmlResponse(200, page(
      'Unsubscribed',
      "You've been removed from the Mind &amp; Matter newsletter. We'll miss you!",
      true,
    ));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return htmlResponse(500, page('Error', 'Something went wrong. Please try again later.', false));
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function htmlResponse(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body };
}

function page(title, message, success) {
  const color = success ? '#10b981' : '#ef4444';
  const icon  = success ? '✓' : '✕';
  const url   = SITE_URL.replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Mind &amp; Matter</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:0;background:#0a0a14;font-family:Arial,Helvetica,sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;color:#e2e8f0}
    .card{background:#111827;border-radius:16px;border:1px solid #1e293b;
          padding:48px 40px;text-align:center;max-width:440px;width:90%;margin:20px}
    .icon{font-size:52px;color:${color};margin-bottom:20px}
    h1{margin:0 0 14px;font-size:24px;color:#f1f5f9}
    p{margin:0 0 28px;color:#94a3b8;line-height:1.7;font-size:15px}
    a.btn{display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);
          color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;
          font-weight:700;font-size:14px;letter-spacing:0.4px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="${url}">← Back to Mind &amp; Matter</a>
  </div>
</body>
</html>`;
}
