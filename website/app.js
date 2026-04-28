/* ===================================================
  Mind & Matter  –  app.js
   =================================================== */

// ── Particle canvas ──────────────────────────────────
(function initParticles () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -9999, y: -9999 };

  function resize () {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function makeParticle () {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4,
      dx: (Math.random() - .5) * .35,
      dy: (Math.random() - .5) * .35,
      hue: Math.random() < .5 ? 200 : Math.random() < .5 ? 270 : 155,
      alpha: Math.random() * .5 + .2
    };
  }

  for (let i = 0; i < 130; i++) particles.push(makeParticle());

  function draw () {
    ctx.clearRect(0, 0, W, H);

    particles.forEach((p, i) => {
      // drift toward mouse slightly
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) { p.x += dx * .00012; p.y += dy * .00012; }

      p.x += p.dx;  p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},90%,70%,${p.alpha})`;
      ctx.fill();

      // draw connecting lines
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `hsla(${p.hue},80%,65%,${(1 - d / 110) * .12})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

function escapeHtml (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildSafeParagraphs (paragraphs) {
  return paragraphs
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

// ── Navbar scroll shadow ──────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
});

function setupMobileMenu () {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  const navCta = document.querySelector('.nav-cta');

  if (!hamburger || !navLinks || !navCta) {
    return;
  }

  function closeMenu () {
    navLinks.classList.remove('open');
    navCta.classList.remove('open');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu () {
    const isOpen = navLinks.classList.toggle('open');
    navCta.classList.toggle('open', isOpen);
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  }

  hamburger.addEventListener('click', toggleMenu);

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  navCta.addEventListener('click', closeMenu);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 600) {
      closeMenu();
    }
  });
}

// ── Animated counter ─────────────────────────────────
function animateCounters () {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.target;
    let current = 0, step = target / 80;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = target > 999
        ? Math.floor(current).toLocaleString()
        : Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, 20);
  });
}
// trigger once hero is in view
const heroObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) { animateCounters(); heroObs.disconnect(); }
}, { threshold: .3 });
heroObs.observe(document.querySelector('.hero-stats'));

// ── Scroll reveal ─────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: .12, rootMargin: '0px 0px -60px 0px' });

function addReveal (selector) {
  document.querySelectorAll(selector).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 3) * 80 + 'ms';
    revealObs.observe(el);
  });
}

// ── Article data ─────────────────────────────────────
const staticArticleData = [
  {
    title: 'How High-NA EUV Could Decide the Future of Sub-2 nm Chips',
    tag: 'Semiconductors', tagColor: '#8b5cf6',
    thumb: '🧠', bg: 'linear-gradient(135deg,#180d34,#2d1060)',
    date: 'Apr 23, 2026', readTime: '9 min',
    preview: 'High-NA EUV is changing the economics of patterning right when advanced scaling is getting painfully hard.',
    paragraphs: [
      'High-NA EUV is not just another tool upgrade. It changes the economics of patterning at the exact moment the industry is running out of easy scaling wins.',
      'Why it matters: At advanced nodes, transistor density is no longer determined by transistor design alone. Lithography precision, resist behavior, overlay control, and mask complexity now sit at the center of the roadmap.',
      'The most interesting shift is strategic: high-NA can reduce multipatterning steps, but it introduces tighter focus budgets, new stochastics problems, and enormous capital intensity. That means the winning fabs will not just be the ones with better equipment. They will be the ones that co-optimize design rules, process integration, and yield learning the fastest.',
      'For readers trying to understand the next decade of computing, this is the story behind the story. AI servers, phones, cars, and edge devices all depend on how this manufacturing transition plays out.'
    ]
  },
  {
    title: 'Why Photonic Interconnects Could Save the AI Datacenter',
    tag: 'AI Compute', tagColor: '#7c3aed',
    thumb: '🖥️', bg: 'linear-gradient(135deg,#1b1035,#0a3060)',
    date: 'Apr 22, 2026', readTime: '6 min',
    preview: 'AI clusters are becoming network-limited, and optics may be the cleanest way past the bottleneck.',
    paragraphs: [
      'AI clusters are hitting a wall that has less to do with model quality and more to do with moving data around fast enough. Copper traces burn too much power. SerDes links add latency. Rack-scale communication is becoming the bottleneck.',
      'Photonic interconnects promise a cleaner path. Light can move huge amounts of data with lower heat and lower loss, especially across board-to-board and rack-to-rack distances.',
      'The big question is integration. Can silicon photonics be packaged tightly enough with GPUs, switches, and high-bandwidth memory to matter in the real world? The answer appears to be moving from maybe to sooner than expected.'
    ]
  },
  {
    title: 'Solid-State Batteries Are Finally Facing the Right Question',
    tag: 'Energy', tagColor: '#ef4444',
    thumb: '🔋', bg: 'linear-gradient(135deg,#230d0d,#5a1111)',
    date: 'Apr 20, 2026', readTime: '7 min',
    preview: 'Solid-state batteries are no longer just a chemistry story; they are becoming a manufacturing story.',
    paragraphs: [
      'For years, solid-state batteries were discussed as a chemistry breakthrough. That was incomplete. The harder question is manufacturability at automotive scale.',
      'What changed: Several developers are now reporting cell designs that survive fast-charging and repeated cycling without catastrophic interface degradation. That shifts the discussion from is the chemistry real to can it be built cheaply and repeatedly.',
      'If solid-state packs reach cost targets, they could alter EV design, grid storage, and even aviation pathways. But the real race is happening in process control, not in headlines.'
    ]
  },
  {
    title: 'Europa Clipper and the Most Important Ocean We Cannot See',
    tag: 'Space', tagColor: '#38bdf8',
    thumb: '🛰️', bg: 'linear-gradient(135deg,#071a3b,#0b4f8c)',
    date: 'Apr 18, 2026', readTime: '8 min',
    preview: 'Europa may hide an ocean with the chemistry and energy gradients that make life plausible.',
    paragraphs: [
      'Europa is a moon wrapped in ice, but its scientific pull comes from what may exist underneath: a deep salty ocean in contact with rock, chemistry, and time.',
      'Europa Clipper will not look for little green lifeforms. It will do something more rigorous and more powerful: measure whether the moon has the conditions that make life plausible.',
      'Magnetometer data, radar sounding, thermal mapping, and plume analysis together could turn Europa from a compelling idea into the strongest target in the Solar System for astrobiology after Earth.'
    ]
  },
  {
    title: 'Quantum Error Correction Has Entered Its Engineering Era',
    tag: 'Quantum', tagColor: '#10b981',
    thumb: '⚛️', bg: 'linear-gradient(135deg,#0b1b12,#105c3d)',
    date: 'Apr 16, 2026', readTime: '7 min',
    preview: 'Quantum computing progress is becoming less about demos and more about disciplined systems engineering.',
    paragraphs: [
      'The public conversation around quantum computing often swings between impossible hype and total dismissal. The reality is more interesting: the field is becoming an engineering discipline.',
      'Recent progress in error correction suggests that the important milestone is no longer just raw qubit count. It is whether a logical qubit can be made more stable as systems scale.',
      'That may sound incremental, but it is the exact kind of progress mature technologies depend on. Better calibration, cleaner control electronics, and smarter decoding are turning quantum hardware into a system problem rather than a physics demo.'
    ]
  },
  {
    title: 'CRISPR Diagnostics Are Quietly Becoming a Computing Story',
    tag: 'Bioengineering', tagColor: '#f59e0b',
    thumb: '🧬', bg: 'linear-gradient(135deg,#2c1d00,#6a4500)',
    date: 'Apr 14, 2026', readTime: '5 min',
    preview: 'Modern diagnostics are becoming a full-stack systems problem, not only a biology problem.',
    paragraphs: [
      'New molecular diagnostics are shrinking the path from sample to answer. But what makes this transformation compelling is not only biology. It is the stack built around it: sensors, microfluidics, edge compute, and AI-assisted interpretation.',
      'CRISPR-based tests are increasingly being designed as systems platforms rather than one-off assays. The result is faster detection, decentralized testing, and new possibilities for outbreak tracking in lower-resource settings.'
    ]
  },
  {
    title: 'Why Advanced Packaging May Matter More Than Moore\'s Law',
    tag: 'Semiconductors', tagColor: '#8b5cf6',
    thumb: '📦', bg: 'linear-gradient(135deg,#120826,#2a1460)',
    date: 'Apr 12, 2026', readTime: '8 min',
    preview: 'Packaging is no longer an afterthought; it is where system performance and product strategy now meet.',
    paragraphs: [
      'For decades, the chip story was simple: smaller transistors win. Today, performance leadership is increasingly being built above the transistor level through chiplets, advanced packaging, and memory proximity.',
      'The shift is profound: system architecture is becoming inseparable from manufacturing strategy. Packaging is no longer the back end. It is where product differentiation happens.',
      'This is especially visible in AI accelerators, where bandwidth and power efficiency often matter more than raw transistor bragging rights.'
    ]
  },
  {
    title: 'The New Climate Race Is About Industrial Heat',
    tag: 'Climate', tagColor: '#ef4444',
    thumb: '🌍', bg: 'linear-gradient(135deg,#1b1408,#5c2f10)',
    date: 'Apr 10, 2026', readTime: '6 min',
    preview: 'Some of the hardest climate problems are hidden inside furnaces, kilns, and industrial process lines.',
    paragraphs: [
      'Electric cars and rooftop solar get attention, but some of the hardest climate problems sit inside furnaces, kilns, refineries, and chemical plants.',
      'Industrial heat is a quiet giant in decarbonization. New work in thermal storage, electric cracking, hydrogen substitution, and process redesign could matter more than many consumer-facing innovations combined.'
    ]
  }
];

staticArticleData.forEach(article => {
  article.body = buildSafeParagraphs(article.paragraphs);
});

let articleData = [...staticArticleData];
const FEATURED_COUNT = 4;

function normalizeManagedPost (post) {
  if (!post || typeof post !== 'object' || !post.title) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(post, 'published') && !post.published) {
    return null;
  }

  const content = typeof post.content === 'string' ? post.content : '';
  const paragraphs = content
    .split(/\n{2,}/)
    .map(line => line.trim())
    .filter(Boolean);

  const preview = typeof post.preview === 'string' && post.preview.trim()
    ? post.preview.trim()
    : (paragraphs[0] || 'New post from Mind & Matter.');

  return {
    title: String(post.title).trim(),
    tag: post.tag ? String(post.tag).trim() : 'Science',
    tagColor: post.tagColor ? String(post.tagColor).trim() : '#38bdf8',
    thumb: post.emoji ? String(post.emoji).trim() : '🧪',
    bg: post.background ? String(post.background).trim() : 'linear-gradient(135deg,#0d1a2b,#143a62)',
    date: post.date ? String(post.date).trim() : 'Apr 23, 2026',
    readTime: post.readTime ? String(post.readTime).trim() : '5 min',
    preview,
    paragraphs,
    body: buildSafeParagraphs(paragraphs.length ? paragraphs : [preview])
  };
}

async function loadManagedPosts () {
  try {
    const response = await fetch('data/posts.json', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.posts)) {
      return;
    }

    const managedPosts = payload.posts
      .map(normalizeManagedPost)
      .filter(Boolean);

    if (!managedPosts.length) {
      return;
    }

    articleData = [...managedPosts, ...staticArticleData];
    allArticles = [...featuredArticles, ...articleData];
    visibleCount = Math.min(Math.max(visibleCount, FEATURED_COUNT), articleData.length);
    renderArticles();
  } catch (error) {
    console.error('Unable to load managed posts:', error);
  }
}

// ── Render articles ───────────────────────────────────
let visibleCount = 3;
const grid = document.getElementById('articles-grid');

function renderArticles () {
  grid.innerHTML = '';
  articleData.slice(0, visibleCount).forEach((art, i) => {
    const card = document.createElement('div');
    card.className = 'article-card reveal';
    card.style.transitionDelay = (i % 3) * 80 + 'ms';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open article: ${art.title}`);
    card.innerHTML = `
      <div class="article-thumb" style="background:${art.bg}">${art.thumb}</div>
      <div class="article-body">
        <span class="article-tag" style="background:${art.tagColor}">${escapeHtml(art.tag)}</span>
        <h4>${escapeHtml(art.title)}</h4>
        <p>${escapeHtml(art.preview || art.paragraphs[0]).slice(0,130)}…</p>
        <div class="article-footer">
          <span class="article-date">${escapeHtml(art.date)}</span>
          <span class="article-read">${escapeHtml(art.readTime)} read →</span>
        </div>
      </div>`;
    card.addEventListener('click', () => openArticle(i + FEATURED_COUNT));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openArticle(i + FEATURED_COUNT);
      }
    });
    grid.appendChild(card);
    // trigger observer
    requestAnimationFrame(() => revealObs.observe(card));
  });
  document.getElementById('load-more').style.display =
    visibleCount >= articleData.length ? 'none' : 'inline-flex';
}

document.getElementById('load-more').addEventListener('click', () => {
  visibleCount = Math.min(visibleCount + 3, articleData.length);
  renderArticles();
});

renderArticles();
loadManagedPosts();

// apply reveal to static elements
requestAnimationFrame(() => {
  addReveal('.featured-main');
  addReveal('.side-card');
  addReveal('.topic-card');
  addReveal('.section-header');
});

const topicMatcherMap = {
  'ai-compute': ['ai', 'compute', 'infrastructure'],
  space: ['space', 'planetary', 'europa'],
  materials: ['materials', 'physics', 'quantum', 'photonics'],
  bioengineering: ['bioengineering', 'crispr', 'biology'],
  energy: ['energy', 'climate', 'battery', 'fusion'],
  semiconductors: ['semiconductors', 'chip', 'packaging']
};

function findTopicArticleIndex (topicKey) {
  const terms = topicMatcherMap[topicKey] || [];
  if (!terms.length) {
    return -1;
  }

  const offset = FEATURED_COUNT;
  const localIndex = articleData.findIndex(article => {
    const haystack = `${article.tag} ${article.title} ${article.preview}`.toLowerCase();
    return terms.some(term => haystack.includes(term));
  });

  return localIndex >= 0 ? localIndex + offset : -1;
}

function setupTopicCards () {
  const articleSection = document.getElementById('articles');
  if (!articleSection) {
    return;
  }

  document.querySelectorAll('.topic-card').forEach(card => {
    const openTopic = () => {
      articleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const topicKey = card.dataset.topic;
      const articleIndex = findTopicArticleIndex(topicKey);
      if (articleIndex >= 0) {
        setTimeout(() => openArticle(articleIndex), 350);
      }
    };

    card.addEventListener('click', openTopic);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTopic();
      }
    });
  });
}

// ── Article modal ─────────────────────────────────────
const featuredArticles = [
  {
    title: 'High-NA EUV Is Rewriting the Physics and Economics of Advanced Chips',
    tag: 'Semiconductors', date: 'Apr 23, 2026', readTime: '9 min',
    body: `<p>The advanced chip race is increasingly decided inside the lithography stack. At sub-2 nm, the question is not just how many transistors can fit on a die. It is how consistently those features can be patterned, how much process complexity can be removed, and how much yield can be protected.</p>
    <p><strong>High-NA EUV</strong> enters precisely at that pressure point. By improving optical resolution, it can reduce reliance on complex multipatterning in some layers. That matters because every added process step compounds risk across overlay, line-edge roughness, and defectivity.</p>
    <p>But the upgrade is not free. Tool cost is enormous, resist chemistry remains difficult, and the surrounding ecosystem — masks, metrology, computational lithography, and design rules — has to mature in parallel. This is why the transition is strategic, not merely technical.</p>
    <p>My view is that the winners will be the organizations that connect device architecture, DTCO, and manufacturing learning loops faster than everyone else. The future of AI hardware, smartphones, automotive compute, and cloud infrastructure all sit downstream of that race.</p>`
  },
  {
    title: 'Why Photonic Interconnects Could Save the AI Datacenter',
    tag: 'AI Infrastructure', date: 'Apr 22, 2026', readTime: '6 min',
    body: `<p>AI systems are scaling faster than the infrastructure that feeds them. Compute density is rising, but so is the cost of shuttling tensors between accelerators, memory, and racks. In modern clusters, the network is becoming the machine.</p>
    <p><strong>Silicon photonics</strong> offers a compelling way out. Optical links can carry more bandwidth with lower energy per bit across the distances that increasingly matter in AI deployments. That directly affects rack architecture, thermal budgets, and cluster economics.</p>
    <p>The challenge is packaging. The story is no longer just about pretty optical demos. It is about how lasers, modulators, switches, and electronics coexist in the brutal reality of datacenter manufacturing and serviceability.</p>
    <p>If the integration problem is solved, photonic interconnects may end up being one of the least visible but most important enablers of the next AI wave.</p>`
  },
  {
    title: 'Solid-State Batteries Are Moving from Lab Curiosity to Product Strategy',
    tag: 'Energy Storage', date: 'Apr 20, 2026', readTime: '7 min',
    body: `<p>There is a moment in every technology cycle when the central question changes. For solid-state batteries, that moment appears to be here. The chemistry is still hard, but the more important discussion now is which architectures can survive manufacturing, cycling, safety validation, and cost pressure simultaneously.</p>
    <p><strong>The promise</strong> is obvious: higher energy density, faster charging, and improved thermal behavior. The catch is that every gain has to survive interfaces, dendrite risk, and production variability.</p>
    <p>What makes the field exciting today is not just the science. It is the growing evidence that engineering teams are learning how to convert materials progress into a real supply chain story. That is when a technology begins to matter.</p>`
  },
  {
    title: 'Europa Clipper Could Change How We Search for Life Beyond Earth',
    tag: 'Planetary Science', date: 'Apr 18, 2026', readTime: '8 min',
    body: `<p>Europa is one of the most compelling places in the Solar System because it combines the three ingredients that repeatedly attract scientific attention: water, chemistry, and energy gradients. The ocean is hidden, but the clues may not be.</p>
    <p><strong>Europa Clipper</strong> is designed to investigate habitability with discipline rather than spectacle. Radar, imaging, magnetic field measurements, and thermal mapping together can reveal ice thickness, subsurface structure, and whether material from the ocean is interacting with the surface.</p>
    <p>If that link is confirmed, Europa stops being merely an interesting moon. It becomes a near-term laboratory for one of humanity's oldest questions: how common are the conditions for life?</p>`
  },
];

let allArticles = [...featuredArticles, ...articleData];

allArticles.forEach(article => {
  if (!article.body && article.paragraphs) {
    article.body = buildSafeParagraphs(article.paragraphs);
  }
});

document.querySelectorAll('[data-article-index]').forEach(card => {
  const articleIndex = Number(card.dataset.articleIndex);
  card.addEventListener('click', () => openArticle(articleIndex));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openArticle(articleIndex);
    }
  });
});

document.getElementById('subscribe-btn').addEventListener('click', subscribe);
document.getElementById('modal-close').addEventListener('click', closeArticle);
document.getElementById('modal-overlay').addEventListener('click', closeModal);
setupMobileMenu();
setupTopicCards();

function openArticle (i) {
  const art = allArticles[i];
  if (!art) return;
  document.getElementById('modal-content').innerHTML = `
    <h2>${escapeHtml(art.title)}</h2>
    <div class="modal-meta">
      <span>${escapeHtml(art.tag)}</span>
      <span>${escapeHtml(art.date)}</span>
      <span>${escapeHtml(art.readTime)} read</span>
    </div>
    ${art.body}`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeArticle () {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal (e) {
  if (e.target === document.getElementById('modal-overlay')) closeArticle();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeArticle(); });

// ── Rotating quotes ─────────────────────────────────--
const quotes = [
  { text: 'The universe is under no obligation to make sense to you.', author: '— Neil deGrasse Tyson' },
  { text: 'Science is not only a disciple of reason but also one of romance and passion.', author: '— Stephen Hawking' },
  { text: 'The important thing is not to stop questioning.', author: '— Albert Einstein' },
  { text: 'Somewhere, something incredible is waiting to be known.', author: '— Sharon Begley' },
  { text: 'We are all made of star-stuff.', author: '— Carl Sagan' }
];

let qIndex = 0;
const qEl = document.getElementById('rotating-quote');
const aEl = document.getElementById('rotating-author');
const dotsEl = document.getElementById('quote-dots');

function renderDots () {
  dotsEl.innerHTML = '';
  quotes.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === qIndex) {
      dot.classList.add('active');
    }
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', `Show quote ${i + 1}`);
    dot.addEventListener('click', () => setQuote(i));
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setQuote(i);
      }
    });
    dotsEl.appendChild(dot);
  });
}

function setQuote (i) {
  qIndex = i;
  qEl.style.opacity = 0;
  aEl.style.opacity = 0;
  setTimeout(() => {
    qEl.textContent = quotes[i].text;
    aEl.textContent = quotes[i].author;
    qEl.style.opacity = 1;
    aEl.style.opacity = 1;
    renderDots();
  }, 300);
}

renderDots();
setInterval(() => setQuote((qIndex + 1) % quotes.length), 5500);

// ── EmailJS config ────────────────────────────────────
// Replace these three values after setting up EmailJS (emailjs.com):
//   1. Sign up → Email Services → Add Gmail or Outlook → copy Service ID
//   2. Email Templates → Create template → copy Template ID
//   3. Account → API Keys → copy Public Key
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // e.g. 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // e.g. 'template_xyz789'
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // e.g. 'aBcDeFgHiJkLmNoP'

function initEmailJS () {
  if (window.emailjs && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
}
initEmailJS();

// ── Newsletter subscribe ─────────────────────────────
async function subscribe () {
  const name  = document.getElementById('nl-name').value.trim();
  const email = document.getElementById('nl-email').value.trim();
  const msg   = document.getElementById('nl-msg');
  const btn   = document.getElementById('subscribe-btn');
  const key   = 'mind_and_matter_subscribers';

  if (!name || !email) {
    msg.textContent = 'Please fill in both fields.';
    msg.style.color = '#ef4444';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.textContent = 'Please enter a valid email address.';
    msg.style.color = '#ef4444';
    return;
  }

  let subscribers = [];
  try {
    const raw = localStorage.getItem(key);
    subscribers = raw ? JSON.parse(raw) : [];
  } catch (storageError) {
    subscribers = [];
  }

  const normalizedEmail = email.toLowerCase();
  if (subscribers.some(s => s.email === normalizedEmail)) {
    msg.textContent = 'This email is already subscribed.';
    msg.style.color = '#f59e0b';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Subscribing…';
  msg.textContent = '';

  // ── Step 1: Submit to Netlify Forms ──────────────────
  let netlifyOk = false;
  try {
    const formData = new URLSearchParams({ 'form-name': 'newsletter', name, email });
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    netlifyOk = response.ok;
  } catch (netErr) {
    console.warn('Netlify form submission failed:', netErr);
  }

  // ── Step 2: Send confirmation email via EmailJS ───────
  let emailSent = false;
  if (
    window.emailjs &&
    EMAILJS_PUBLIC_KEY  !== 'YOUR_PUBLIC_KEY' &&
    EMAILJS_SERVICE_ID  !== 'YOUR_SERVICE_ID' &&
    EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID'
  ) {
    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name:  name,
        to_email: email,
        from_name: 'Mind & Matter',
        reply_to:  'mamunuj@gmail.com',
        site_url:  window.location.origin
      });
      emailSent = true;
    } catch (ejsErr) {
      console.warn('EmailJS send failed:', ejsErr);
    }
  }

  // ── Step 3: Save locally ────────────────────────────
  subscribers.push({ name, email: normalizedEmail, subscribedAt: new Date().toISOString() });
  try { localStorage.setItem(key, JSON.stringify(subscribers)); } catch (_) {}

  // ── Step 4: Show result ─────────────────────────────
  if (emailSent) {
    msg.textContent = `Welcome aboard, ${name}! A confirmation email has been sent to ${email}.`;
  } else if (netlifyOk) {
    msg.textContent = `Welcome aboard, ${name}! Subscription confirmed — check your inbox soon.`;
  } else {
    msg.textContent = `Welcome aboard, ${name}! You're subscribed successfully.`;
  }
  msg.style.color = '#10b981';

  document.getElementById('nl-name').value = '';
  document.getElementById('nl-email').value = '';
  btn.disabled = false;
  btn.textContent = 'Subscribe Free →';
}

document.getElementById('nl-email').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    subscribe();
  }
});

document.getElementById('nl-name').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    subscribe();
  }
});

// ── Expose to HTML onclick ───────────────────────────
