// ── Mind & Matter — Subscribe Function ──────────────────────────────────────
// POST /.netlify/functions/subscribe  |  Zero npm dependencies
// Stores subscribers in Resend Audiences, sends welcome email via Resend API.
//
// Required env vars (Netlify → Site → Settings → Environment variables):
//   RESEND_API_KEY      — from resend.com
//   RESEND_AUDIENCE_ID  — Resend dashboard → Audiences → create one → copy ID
//   FROM_EMAIL          — e.g. "Mind & Matter <onboarding@resend.dev>"
// ────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY     = process.env.RESEND_API_KEY     || '';
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '';
const FROM_EMAIL         = process.env.FROM_EMAIL         || 'Mind & Matter <onboarding@resend.dev>';
const SITE_URL           = (process.env.URL               || 'https://mind-and-matter-blog.netlify.app').replace(//$/, '');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Pre-flight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Parse & validate ─────────────────────────────────────────────────────
  let name, email;
  try {
    const body = JSON.parse(event.body || '{}');
    name  = String(body.name  || '').trim().slice(0, 100);
    email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!name || !email) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Name and email are required' }) };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  // ── Add to Resend Audience (upsert — handles re-subscribes automatically) ─
  try {
    if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
      const audienceRes = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ email, first_name: name, unsubscribed: false }),
      });
      if (!audienceRes.ok) {
        console.error('Resend Audiences error:', await audienceRes.text());
      }
    }

    // ── Send welcome email via Resend ─────────────────────────────────────
    let emailSent = false;
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      [email],
          subject: `Welcome to Mind & Matter! 🔬`,
          html:    buildWelcomeEmail(name, SITE_URL),
        }),
      });
      emailSent = res.ok;
      if (!res.ok) {
        console.error('Resend welcome error:', await res.text());
      }
    }

    return {
      statusCode: 200,
      headers:    CORS_HEADERS,
      body:       JSON.stringify({ status: 'subscribed', emailSent }),
    };
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Subscription failed. Please try again.' }) };
  }
};

// ── Welcome email HTML ────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildWelcomeEmail(name, siteUrl) {
  const n   = esc(name);
  const url = esc(siteUrl);
  const dom = url.replace('https://', '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to Mind &amp; Matter</title>
</head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#111827;border-radius:16px;
                    overflow:hidden;border:1px solid #1e293b;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e0a4a,#0a2a5e);
                        padding:44px 40px 36px;text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">⬡</div>
          <h1 style="margin:0;font-size:30px;color:#fff;letter-spacing:1px;font-weight:900;">
            Mind &amp; Matter
          </h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Science, Chips &amp; Future Tech</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 18px;color:#c084fc;font-size:24px;">Welcome aboard, ${n}! 🎉</h2>
          <p style="margin:0 0 16px;line-height:1.75;color:#cbd5e1;font-size:15px;">
            You've just joined a growing community of curious minds who believe that understanding
            deep technology makes you sharper. Every <strong style="color:#fff;">Tuesday</strong>
            you'll get a focused deep-dive — no filler, no hype.
          </p>
          <p style="margin:0 0 20px;line-height:1.75;color:#cbd5e1;font-size:15px;">
            Here's what you can expect each week:
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              🧠 &nbsp;<strong style="color:#c084fc;">Semiconductors</strong> — EUV, packaging, process nodes
            </td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              🖥️ &nbsp;<strong style="color:#38bdf8;">AI &amp; Compute</strong> — accelerators, datacenters, LLMs
            </td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              🛰️ &nbsp;<strong style="color:#34d399;">Space Systems</strong> — missions, propulsion, astrobiology
            </td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              ⚡ &nbsp;<strong style="color:#fbbf24;">Energy &amp; Climate</strong> — fusion, batteries, grids
            </td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              🧬 &nbsp;<strong style="color:#f87171;">Bioengineering</strong> — CRISPR, diagnostics, synthetic bio
            </td></tr>
          </table>

          <!-- CTA -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${url}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);
                      color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;
                      font-weight:700;font-size:15px;letter-spacing:0.5px;">
              Explore the Archive →
            </a>
          </div>

          <p style="margin:16px 0 0;color:#64748b;font-size:14px;line-height:1.75;">
            Stay curious. Every answer opens a bigger question. 🔬
          </p>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">— Md Mamunuj Zaman</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;background:#0d1117;
                        border-top:1px solid #1e293b;text-align:center;">
          <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
            You're receiving this because you subscribed at
            <a href="${url}" style="color:#7c3aed;text-decoration:none;">${dom}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
