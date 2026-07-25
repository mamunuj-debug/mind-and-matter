/* ===================================================
  Mind & Matter  –  app.js
   =================================================== */

// ── Particle canvas ──────────────────────────────────
(function initParticles () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let W, H, particles = [], mouse = { x: -9999, y: -9999 };
  let running = true;
  let heroVisible = true;

  // Respect users who prefer reduced motion: render once, then stop.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Density scales with viewport area. We keep a richer canvas now that
  // the inner loop is squared-distance + the animation pauses off-screen,
  // so we can afford ~120 particles on a 1080p desktop without scroll jank.
  function targetCount () {
    const area = window.innerWidth * window.innerHeight;
    const n = Math.round(area / 14000); // ~150 on a 1080p desktop
    return Math.max(60, Math.min(160, n));
  }

  // Squared link distance — avoids sqrt in the inner loop.
  const LINK_DIST = 130;
  const LINK_DIST_SQ = LINK_DIST * LINK_DIST;

  function resize () {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const want = targetCount();
    if (particles.length < want) {
      for (let i = particles.length; i < want; i++) particles.push(makeParticle());
    } else if (particles.length > want) {
      particles.length = want;
    }
  }
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !reducedMotion) requestAnimationFrame(draw); });

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

  resize();

  // Pause the animation once the hero is scrolled out of view — the canvas
  // is fixed in the background so there's no point burning frames for it.
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible && running && !reducedMotion) requestAnimationFrame(draw);
    }, { threshold: 0 }).observe(hero);
  }

  function draw () {
    if (!running || !heroVisible) return;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // drift toward mouse slightly (squared distance — no sqrt)
      const mx = mouse.x - p.x, my = mouse.y - p.y;
      const md2 = mx * mx + my * my;
      if (md2 < 140 * 140) { p.x += mx * .00012; p.y += my * .00012; }

      p.x += p.dx;  p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},90%,70%,${p.alpha})`;
      ctx.fill();
    }

    // Links — one pass with squared distance.
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const ddx = p.x - q.x, ddy = p.y - q.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < LINK_DIST_SQ) {
          const d = Math.sqrt(d2);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `hsla(${p.hue},80%,65%,${(1 - d / LINK_DIST) * .12})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      }
    }

    if (running && heroVisible && !reducedMotion) requestAnimationFrame(draw);
  }
  if (!reducedMotion) requestAnimationFrame(draw);
  else { /* draw a single static frame */ draw(); }
})();

function escapeHtml (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Render a paragraph that may contain markdown images: ![alt](https://url)
// - A paragraph that is ONLY an image becomes a <figure> with caption.
// - Otherwise inline images are injected after escaping the rest of the text.
function renderParagraph (paragraph) {
  const text = String(paragraph).trim();
  const standalone = text.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
  if (standalone) {
    const alt = escapeHtml(standalone[1]);
    const src = escapeHtml(standalone[2]);
    return `<figure class="post-figure"><img src="${src}" alt="${alt}" loading="lazy"/>${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
  }
  // Tokenize images so escapeHtml doesn't mangle their URLs.
  const parts = [];
  let lastIndex = 0;
  const re = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'img', alt: match[1], src: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  const html = parts.map(part => part.type === 'img'
    ? `<img src="${escapeHtml(part.src)}" alt="${escapeHtml(part.alt)}" loading="lazy" class="post-inline-img"/>`
    : escapeHtml(part.value)
  ).join('');
  return `<p>${html}</p>`;
}

function buildSafeParagraphs (paragraphs) {
  return paragraphs.map(renderParagraph).join('');
}

// ── Navbar scroll shadow ──────────────────────────────
(function navbarScroll () {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
      ticking = false;
    });
  }, { passive: true });
})();

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

function updatePublishedCount (count) {
  const publishedCounter = document.querySelector('.hero-stats .stat-num');
  if (!publishedCounter) return;
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  publishedCounter.dataset.target = String(safeCount);
  // Re-animate this counter from its current value up to the new target
  const currentValue = parseInt(publishedCounter.textContent, 10) || 0;
  animateSingleCounter(publishedCounter, currentValue, safeCount);
}

function animateSingleCounter (el, start, target) {
  if (start === target) {
    el.textContent = String(target);
    return;
  }
  const duration = 900;
  const stepMs = 20;
  const steps = Math.max(1, Math.floor(duration / stepMs));
  const step = (target - start) / steps;
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = target > 999
      ? Math.floor(current).toLocaleString()
      : Math.floor(current);
  }, stepMs);
}

function articleKey (article) {
  return (article && article.title ? String(article.title) : '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mergeUniqueArticles (primary, secondary) {
  const seen = new Set();
  const merged = [];
  [...primary, ...secondary].forEach(article => {
    const key = articleKey(article);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(article);
  });
  return merged;
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

updatePublishedCount(articleData.length);

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

  const coverImage = typeof post.coverImage === 'string' && post.coverImage.trim()
    ? post.coverImage.trim()
    : null;

  return {
    title: String(post.title).trim(),
    tag: post.tag ? String(post.tag).trim() : 'Science',
    tagColor: post.tagColor ? String(post.tagColor).trim() : '#38bdf8',
    thumb: post.emoji ? String(post.emoji).trim() : '🧪',
    bg: post.background ? String(post.background).trim() : 'linear-gradient(135deg,#0d1a2b,#143a62)',
    date: post.date ? String(post.date).trim() : 'Apr 23, 2026',
    readTime: post.readTime ? String(post.readTime).trim() : '5 min',
    preview,
    coverImage,
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

    // posts.json is the single source of truth. The staticArticleData array is
    // kept only as a fallback for the very first paint before the fetch resolves.
    articleData = mergeUniqueArticles(managedPosts, []);
    allArticles = articleData;
    visibleCount = Math.min(Math.max(visibleCount, 3), articleData.length);
    updatePublishedCount(articleData.length);
    renderFeatured();
    renderArticles();
    // Refresh the "N essays" labels on topic cards once the real posts are loaded
    if (typeof updateTopicCounts === 'function') {
      updateTopicCounts();
    }
  } catch (error) {
    console.error('Unable to load managed posts:', error);
  }
}

// ── Render articles ───────────────────────────────────
let visibleCount = 3;
let currentTopicFilter = null; // null → show all; otherwise topic key like 'ai-compute'
const grid = document.getElementById('articles-grid');

function getFilteredArticles () {
  if (!currentTopicFilter) {
    return articleData;
  }
  const terms = topicMatcherMap[currentTopicFilter] || [];
  if (!terms.length) {
    return articleData;
  }
  return articleData.filter(article => {
    const haystack = `${article.tag} ${article.title} ${article.preview}`;
    return haystackMatchesAny(haystack, terms);
  });
}

function renderArticles () {
  grid.innerHTML = '';
  const filtered = getFilteredArticles();
  updateFilterBadge(filtered.length);

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'articles-empty';
    empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;';
    empty.textContent = 'No articles in this topic yet. Try another one!';
    grid.appendChild(empty);
    document.getElementById('load-more').style.display = 'none';
    return;
  }

  filtered.slice(0, visibleCount).forEach((art, i) => {
    const originalIndex = articleData.indexOf(art);
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
    card.addEventListener('click', () => openArticle(originalIndex));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openArticle(originalIndex);
      }
    });
    grid.appendChild(card);
    // trigger observer
    requestAnimationFrame(() => revealObs.observe(card));
  });
  document.getElementById('load-more').style.display =
    visibleCount >= filtered.length ? 'none' : 'inline-flex';
}

document.getElementById('load-more').addEventListener('click', () => {
  visibleCount = Math.min(visibleCount + 3, getFilteredArticles().length);
  renderArticles();
});

// ── Featured story (dynamic from top posts) ─────────
const featuredGrid = document.getElementById('featured-grid');

function featuredCardImage (art) {
  if (art.coverImage) {
    return `background-image:url('${escapeHtml(art.coverImage)}');background-size:cover;background-position:center;`;
  }
  return `background:${art.bg};`;
}

function renderFeatured () {
  if (!featuredGrid) return;
  const picks = articleData.slice(0, 4);
  if (!picks.length) {
    featuredGrid.innerHTML = '';
    return;
  }
  const [main, ...sides] = picks;
  const mainHtml = `
    <div class="featured-main card-glow" data-article-index="0" role="button" tabindex="0" aria-label="Open featured article: ${escapeHtml(main.title)}">
      <div class="featured-img" style="${featuredCardImage(main)}">
        <div class="feat-overlay"><span class="feat-tag" style="background:${escapeHtml(main.tagColor)}">${escapeHtml(main.tag)}</span></div>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(main.title)}</h3>
        <p>${escapeHtml(main.preview || '').slice(0, 200)}</p>
        <div class="card-meta"><span class="author-dot ai"></span> ${escapeHtml(main.tag)} · ${escapeHtml(main.readTime)} read</div>
      </div>
    </div>`;
  const sidesHtml = sides.map((art, idx) => `
    <div class="side-card card-glow" data-article-index="${idx + 1}" role="button" tabindex="0" aria-label="Open article: ${escapeHtml(art.title)}">
      <div class="side-img" style="${featuredCardImage(art)}"></div>
      <div class="side-body">
        <span class="feat-tag sm" style="background:${escapeHtml(art.tagColor)}">${escapeHtml(art.tag)}</span>
        <h4>${escapeHtml(art.title)}</h4>
        <p class="side-meta">${escapeHtml(art.tag)} · ${escapeHtml(art.readTime)} read</p>
      </div>
    </div>`).join('');
  featuredGrid.innerHTML = `${mainHtml}<div class="featured-side">${sidesHtml}</div>`;
  featuredGrid.querySelectorAll('[data-article-index]').forEach(card => {
    const i = Number(card.dataset.articleIndex);
    card.addEventListener('click', () => openArticle(i));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openArticle(i);
      }
    });
  });
  // apply reveal animations to the new featured cards
  requestAnimationFrame(() => {
    addReveal('.featured-main');
    addReveal('.side-card');
  });
}

renderFeatured();
renderArticles();
loadManagedPosts();

// apply reveal to static elements
requestAnimationFrame(() => {
  addReveal('.topic-card');
  addReveal('.section-header');
});

const topicMatcherMap = {
  'ai-compute':    ['ai', 'gpu', 'compute', 'computing', 'infrastructure', 'quantum'],
  space:           ['space', 'spacecraft', 'rocket', 'voyager', 'telescope', 'cosmology', 'universe', 'planetary', 'europa', 'black hole'],
  materials:       ['materials', 'physics', 'photonics', 'optics', 'rainbow', 'sky'],
  bioengineering:  ['bioengineering', 'crispr', 'biology', 'protein', 'genome', 'dna'],
  energy:          ['energy', 'climate', 'battery', 'fusion', 'nuclear'],
  semiconductors:  ['semiconductor', 'semiconductors', 'chip', 'chips', 'euv', 'lithography', 'packaging', 'gpu']
};

// Escape regex special chars in a term
function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Word-boundary match so 'ai' does NOT match 'rain' or 'again'
function haystackMatchesAny (haystack, terms) {
  return terms.some(term => {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    return re.test(haystack);
  });
}

function findTopicArticleIndex (topicKey) {
  const terms = topicMatcherMap[topicKey] || [];
  if (!terms.length) {
    return -1;
  }

  return articleData.findIndex(article => {
    const haystack = `${article.tag} ${article.title} ${article.preview}`;
    return haystackMatchesAny(haystack, terms);
  });
}

// Refresh the "N essays" label on every topic card based on real article data
function updateTopicCounts () {
  document.querySelectorAll('.topic-card').forEach(card => {
    const key = card.dataset.topic;
    const terms = topicMatcherMap[key] || [];
    if (!terms.length) return;
    const count = articleData.filter(article => {
      const haystack = `${article.tag} ${article.title} ${article.preview}`;
      return haystackMatchesAny(haystack, terms);
    }).length;
    const label = card.querySelector('.topic-count');
    if (label) {
      label.textContent = `${count} ${count === 1 ? 'essay' : 'essays'}`;
    }
  });
}

// Show / hide the "Showing: <Topic> ✕" chip above the articles grid
function updateFilterBadge (filteredCount) {
  const section = document.getElementById('articles');
  if (!section) return;
  let badge = document.getElementById('topic-filter-badge');

  if (!currentTopicFilter) {
    if (badge) badge.remove();
    return;
  }

  // Look up display name from the topic card's <h3>
  const card = document.querySelector(`.topic-card[data-topic="${currentTopicFilter}"]`);
  const topicName = card ? card.querySelector('h3').textContent.trim() : currentTopicFilter;
  const color = card ? (card.dataset.color || '#38bdf8') : '#38bdf8';

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'topic-filter-badge';
    badge.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:.75rem;margin:0 auto 1.5rem;max-width:1200px;padding:0 1rem;flex-wrap:wrap;';
    const header = section.querySelector('.section-header');
    if (header && header.nextSibling) {
      section.insertBefore(badge, header.nextSibling);
    } else {
      section.insertBefore(badge, section.firstChild);
    }
  }

  const count = typeof filteredCount === 'number' ? filteredCount : getFilteredArticles().length;
  badge.innerHTML = `
    <span style="font-size:.85rem;color:var(--text-muted);">Showing:</span>
    <span style="display:inline-flex;align-items:center;gap:.6rem;padding:.4rem .9rem;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid ${color};color:#fff;font-size:.9rem;font-weight:600;">
      <span style="width:.5rem;height:.5rem;border-radius:50%;background:${color};"></span>
      ${escapeHtml(topicName)}
      <span style="color:var(--text-muted);font-weight:400;font-size:.8rem;">(${count})</span>
      <button id="topic-filter-clear" aria-label="Clear filter" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.1rem;line-height:1;padding:0 .1rem;">✕</button>
    </span>
  `;
  document.getElementById('topic-filter-clear').addEventListener('click', clearTopicFilter);
}

function clearTopicFilter () {
  currentTopicFilter = null;
  visibleCount = 3;
  renderArticles();
}

function setupTopicCards () {
  const articleSection = document.getElementById('articles');
  if (!articleSection) {
    return;
  }

  document.querySelectorAll('.topic-card').forEach(card => {
    const openTopic = () => {
      const topicKey = card.dataset.topic;
      currentTopicFilter = topicKey;
      // Show all matching articles at once so the user sees the full list
      visibleCount = articleData.length;
      renderArticles();
      articleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    card.addEventListener('click', openTopic);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTopic();
      }
    });
  });

  updateTopicCounts();
}

// ── Article modal ─────────────────────────────────────
// Featured cards are now rendered dynamically from the top posts of articleData.
// allArticles is just a reference to articleData; openArticle uses indices into it.
let allArticles = articleData;

document.getElementById('subscribe-btn').addEventListener('click', subscribe);
document.getElementById('modal-close').addEventListener('click', closeArticle);
document.getElementById('modal-overlay').addEventListener('click', closeModal);
setupMobileMenu();
setupTopicCards();

// ── Netlify Identity: handle invite / recovery tokens on the homepage ──
// When a user clicks an invite link, Netlify lands them at the site root with
// '#invite_token=...' in the URL. The Identity widget then needs to open and
// prompt for a password. After login we send them to the /admin CMS.
if (window.netlifyIdentity) {
  window.netlifyIdentity.on('init', user => {
    if (!user) {
      window.netlifyIdentity.on('login', () => {
        document.location.href = '/admin/';
      });
    }
  });
}

function openArticle (i) {
  const art = allArticles[i];
  if (!art) return;
  const cover = art.coverImage
    ? `<img class="post-cover" src="${escapeHtml(art.coverImage)}" alt="${escapeHtml(art.title)}" loading="lazy"/>`
    : '';
  document.getElementById('modal-content').innerHTML = `
    <h2>${escapeHtml(art.title)}</h2>
    <div class="modal-meta">
      <span>${escapeHtml(art.tag)}</span>
      <span>${escapeHtml(art.date)}</span>
      <span>${escapeHtml(art.readTime)} read</span>
    </div>
    ${cover}
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

// ── Newsletter subscribe ─────────────────────────────
async function subscribe () {
  const name  = document.getElementById('nl-name').value.trim();
  const email = document.getElementById('nl-email').value.trim();
  const msg   = document.getElementById('nl-msg');
  const btn   = document.getElementById('subscribe-btn');

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

  btn.disabled = true;
  btn.textContent = 'Subscribing…';
  msg.textContent = '';

  try {
    const response = await fetch('/.netlify/functions/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email }),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.status === 'already_subscribed') {
        msg.textContent = 'This email is already subscribed. See you every Tuesday! 📬';
        msg.style.color = '#f59e0b';
      } else {
        msg.textContent = `Welcome aboard, ${escapeHtml(name)}! 🎉 Check your inbox for a welcome email — your first newsletter lands this Tuesday.`;
        msg.style.color = '#10b981';
        document.getElementById('nl-name').value  = '';
        document.getElementById('nl-email').value = '';
      }
    } else {
      msg.textContent = data.error || 'Something went wrong. Please try again.';
      msg.style.color = '#ef4444';
    }
  } catch {
    msg.textContent = 'Could not connect. Please check your connection and try again.';
    msg.style.color = '#ef4444';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subscribe Free →';
  }
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
