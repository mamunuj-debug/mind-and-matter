// ── Mind & Matter — Weekly Newsletter (Scheduled) ───────────────────────────
// Runs every Tuesday at 09:00 UTC via Netlify Scheduled Functions.
// Schedule configured in netlify.toml: [functions."newsletter"] schedule = "0 9 * * 2"
// Zero npm dependencies — uses Node built-in fetch + Resend REST API.
//
// Required env vars:
//   RESEND_API_KEY      — from resend.com
//   RESEND_AUDIENCE_ID  — Resend dashboard → Audiences → copy ID
//   FROM_EMAIL          — e.g. "Mind & Matter <onboarding@resend.dev>"
// ────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY     = process.env.RESEND_API_KEY     || '';
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '';
const FROM_EMAIL         = process.env.FROM_EMAIL         || 'Mind & Matter <onboarding@resend.dev>';
const SITE_URL           = (process.env.URL               || 'https://mind-and-matter-blog.netlify.app').replace(//$/, '');

exports.handler = async () => {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — newsletter aborted');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  // ── Load active subscribers from Resend Audience ─────────────────────────
  if (!RESEND_AUDIENCE_ID) {
    console.error('RESEND_AUDIENCE_ID not set — newsletter aborted');
    return { statusCode: 500, body: JSON.stringify({ error: 'Audience not configured' }) };
  }

  let subscribers = [];
  try {
    const audienceRes = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
    });
    if (audienceRes.ok) {
      const data = await audienceRes.json();
      subscribers = (data.data || [])
        .filter(c => !c.unsubscribed)
        .map(c => ({ name: c.first_name || 'Reader', email: c.email }));
    } else {
      console.error('Failed to fetch audience contacts:', await audienceRes.text());
    }
  } catch (err) {
    console.error('Audience fetch error:', err.message);
  }

  if (!subscribers.length) {
    console.log('No active subscribers — newsletter skipped');
    return { statusCode: 200, body: JSON.stringify({ message: 'No subscribers' }) };
  }

  console.log(`Sending newsletter to ${subscribers.length} subscriber(s)…`);

  // ── Fetch latest posts ────────────────────────────────────────────────────
  let posts = [];
  try {
    const res = await fetch(`${SITE_URL}/data/posts.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      posts = Array.isArray(data.posts) ? data.posts.filter(p => p.published !== false).slice(0, 4) : [];
    }
  } catch (err) {
    console.warn('Could not load posts.json:', err.message);
  }

  const issueDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Dispatch emails ───────────────────────────────────────────────────────
  let sent = 0, failed = 0;

  for (const sub of subscribers) {
    const unsubToken = Buffer.from(sub.email).toString('base64');
    const unsubUrl   = `${SITE_URL}/.netlify/functions/unsubscribe?t=${encodeURIComponent(unsubToken)}`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      [sub.email],
          subject: `Mind & Matter — ${issueDate}`,
          html:    buildNewsletterEmail(sub.name, posts, issueDate, unsubUrl, SITE_URL),
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        console.error(`Send failed for ${sub.email}: ${await res.text()}`);
        failed++;
      }
    } catch (err) {
      console.error(`Network error for ${sub.email}:`, err.message);
      failed++;
    }
  }

  console.log(`Newsletter complete — sent: ${sent}, failed: ${failed}`);
  return { statusCode: 200, body: JSON.stringify({ sent, failed, total: subscribers.length }) };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Newsletter HTML ───────────────────────────────────────────────────────────
function buildNewsletterEmail(name, posts, issueDate, unsubUrl, siteUrl) {
  const n        = esc(name);
  const date     = esc(issueDate);
  const url      = esc(siteUrl);
  const unsub    = esc(unsubUrl);
  const dom      = url.replace('https://', '');

  // Build article cards
  const postsHtml = posts.length
    ? posts.map(post => {
        const title     = esc(post.title   || 'Untitled');
        const tag       = esc(post.tag     || 'Science');
        const preview   = esc((post.preview || post.content || '').slice(0, 180));
        const readTime  = esc(post.readTime || '5 min');
        const postDate  = esc(post.date     || issueDate);
        const emoji     = esc(post.emoji    || '🔬');
        const tagColor  = /^#[0-9a-f]{3,6}$/i.test(post.tagColor || '') ? post.tagColor : '#7c3aed';
        return `
  <table width="100%" cellpadding="0" cellspacing="0"
         style="margin-bottom:18px;border-radius:12px;overflow:hidden;border:1px solid #1e293b;">
    <tr><td style="background:#1a1f35;padding:20px 24px;">
      <div style="margin-bottom:10px;">
        <span style="background:${tagColor};color:#fff;font-size:11px;font-weight:700;
                     padding:3px 10px;border-radius:20px;letter-spacing:0.5px;">${tag}</span>
        <span style="color:#475569;font-size:12px;margin-left:10px;">${postDate} · ${readTime} read</span>
      </div>
      <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:17px;line-height:1.4;">
        ${emoji}&nbsp; ${title}
      </h3>
      <p style="margin:0 0 14px;color:#94a3b8;font-size:14px;line-height:1.7;">${preview}…</p>
      <a href="${url}#articles"
         style="color:#c084fc;font-size:13px;text-decoration:none;font-weight:600;">
        Read on Mind &amp; Matter →
      </a>
    </td></tr>
  </table>`;
      }).join('')
    : `<table width="100%" cellpadding="0" cellspacing="0"
              style="margin-bottom:18px;border-radius:12px;overflow:hidden;border:1px solid #1e293b;">
         <tr><td style="background:#1a1f35;padding:24px;text-align:center;">
           <p style="margin:0;color:#94a3b8;font-size:15px;">
             New articles are on the way —
             <a href="${url}" style="color:#c084fc;text-decoration:none;">visit the site</a>
             for the latest.
           </p>
         </td></tr>
       </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mind &amp; Matter — ${date}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;padding:40px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0"
             style="max-width:640px;width:100%;background:#111827;border-radius:16px;
                    overflow:hidden;border:1px solid #1e293b;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e0a4a,#0a2a5e);
                        padding:40px 40px 32px;text-align:center;">
          <div style="font-size:32px;margin-bottom:10px;">⬡</div>
          <h1 style="margin:0;font-size:28px;color:#fff;letter-spacing:1px;font-weight:900;">
            Mind &amp; Matter
          </h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">
            Science, Chips &amp; Future Tech · ${date}
          </p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:36px 40px 0;">
          <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;
                    letter-spacing:1.5px;text-transform:uppercase;">Your Weekly Briefing</p>
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;">Hey ${n} 👋</h2>
          <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.75;">
            Here's this week's roundup from Mind &amp; Matter — going below the headlines
            to what actually matters for engineers and curious minds.
          </p>
          <hr style="border:none;border-top:1px solid #1e293b;margin-bottom:24px;"/>
        </td></tr>

        <!-- Articles -->
        <tr><td style="padding:0 40px;">
          <p style="margin:0 0 18px;color:#c084fc;font-size:14px;
                    font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            📚 &nbsp;This Week's Reads
          </p>
          ${postsHtml}
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 40px;text-align:center;">
          <a href="${url}"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);
                    color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;
                    font-weight:700;font-size:15px;letter-spacing:0.5px;">
            Visit Mind &amp; Matter →
          </a>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:0 40px 32px;">
          <hr style="border:none;border-top:1px solid #1e293b;margin-bottom:22px;"/>
          <p style="margin:0 0 6px;color:#94a3b8;font-size:14px;line-height:1.75;">
            That's the roundup for this Tuesday. See you next week. 🔬
          </p>
          <p style="margin:8px 0 0;color:#64748b;font-size:14px;">— Md Mamunuj Zaman</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:18px 40px 24px;background:#0d1117;
                        border-top:1px solid #1e293b;text-align:center;">
          <p style="margin:0 0 8px;color:#475569;font-size:12px;line-height:1.6;">
            You're receiving this because you subscribed at
            <a href="${url}" style="color:#7c3aed;text-decoration:none;">${dom}</a>
          </p>
          <p style="margin:0;">
            <a href="${unsub}" style="color:#475569;font-size:12px;text-decoration:underline;">
              Unsubscribe
            </a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
