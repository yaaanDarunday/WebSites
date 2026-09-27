// Paste as the `function` of browser_evaluate on a studied site, after the
// preloader has finished. Run it once at the top and again after scrolling
// into the most distinctive section. Returns measured facts only.
() => {
  const px = v => Math.round(parseFloat(v) * 10) / 10;
  const round = n => Math.round(n * 1000) / 1000;

  // Typography: every visible text node grouped by font/size/weight/case
  const type = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent.trim();
    const el = walker.currentNode.parentElement;
    if (!t || !el) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.opacity === '0') continue;
    const size = parseFloat(s.fontSize);
    const lh = s.lineHeight === 'normal' ? 'normal' : round(parseFloat(s.lineHeight) / size);
    const ls = s.letterSpacing === 'normal' ? 0 : round(parseFloat(s.letterSpacing) / size);
    const key = [s.fontFamily.split(',')[0].replace(/["']/g, ''), px(size), s.fontWeight, s.fontStyle, lh, ls + 'em', s.textTransform].join(' | ');
    const e = type.get(key) || { n: 0, sample: t.slice(0, 40) };
    e.n++; type.set(key, e);
  }
  const typography = [...type].sort((a, b) => parseFloat(b[0].split(' | ')[1]) - parseFloat(a[0].split(' | ')[1]))
    .slice(0, 30).map(([k, v]) => `${k}  ×${v.n}  "${v.sample}"`);

  // Colour: frequency of text/background/border colours on visible elements
  const colours = {};
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    for (const [prop, v] of [['bg', s.backgroundColor], ['text', s.color], ['border', s.borderTopWidth !== '0px' ? s.borderTopColor : null]]) {
      if (!v || v === 'rgba(0, 0, 0, 0)') continue;
      const k = prop + ' ' + v; colours[k] = (colours[k] || 0) + 1;
    }
  }
  const palette = Object.entries(colours).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => `${k} ×${n}`);

  // Stylesheets: custom properties, easings, durations, keyframes (same-origin only)
  const vars = {}, eases = {}, durations = {}, keyframes = [];
  let blockedSheets = 0;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { blockedSheets++; continue; }
    const walk = list => { for (const r of list) {
      if (r.cssRules && !r.style) walk(r.cssRules);
      if (r.type === 7) keyframes.push(r.name);
      if (!r.style) continue;
      if (r.selectorText === ':root' || r.selectorText === 'html') for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim();
      const tf = r.style.transitionTimingFunction || r.style.animationTimingFunction;
      if (tf) tf.split(/,(?![^(]*\))/).forEach(e => eases[e.trim()] = (eases[e.trim()] || 0) + 1);
      const d = r.style.transitionDuration || r.style.animationDuration;
      if (d) d.split(',').forEach(x => durations[x.trim()] = (durations[x.trim()] || 0) + 1);
    } };
    walk(rules);
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${k} ×${c}`);

  // Runtime: libraries and live GSAP state
  const g = window.gsap, ST = window.ScrollTrigger;
  const triggers = ST?.getAll?.() || [];
  const scripts = [...new Set([...document.scripts].map(s => s.src).filter(Boolean).map(s => s.split('?')[0].split('/').slice(-2).join('/')))];

  return {
    url: location.href,
    viewport: `${innerWidth}×${innerHeight}`,
    docHeight: document.documentElement.scrollHeight,
    overflow: getComputedStyle(document.documentElement).overflow + ' / ' + getComputedStyle(document.body).overflow,
    runtime: {
      gsap: g?.version || 'not global',
      plugins: g ? Object.keys(window).filter(k => /^(ScrollTrigger|SplitText|ScrambleTextPlugin|Observer|Draggable|Flip|InertiaPlugin|DrawSVGPlugin|MorphSVGPlugin|CustomEase|ScrollSmoother|MotionPathPlugin)$/.test(k)) : [],
      scrollTriggers: triggers.length,
      pinned: triggers.filter(t => t.pin).length,
      scrubbed: triggers.filter(t => t.vars?.scrub).length,
      lenis: !!(window.lenis || window.Lenis || document.documentElement.classList.contains('lenis')),
      three: !!window.THREE,
      canvases: document.querySelectorAll('canvas').length,
      videos: document.querySelectorAll('video').length,
      frameworks: ['__NEXT_DATA__', '__NUXT__', 'Webflow', '__svelte', 'Framer'].filter(k => k in window)
        .concat(document.querySelector('[data-wf-site]') ? ['Webflow'] : [], document.querySelector('astro-island') ? ['Astro'] : []),
    },
    scripts: scripts.slice(0, 25),
    typography,
    palette,
    rootVars: Object.fromEntries(Object.entries(vars).slice(0, 60)),
    easings: top(eases, 12),
    durations: top(durations, 12),
    keyframes: [...new Set(keyframes)].slice(0, 25),
    blockedSheets,
    blendModes: [...new Set([...document.querySelectorAll('body *')].map(e => getComputedStyle(e).mixBlendMode).filter(m => m !== 'normal'))],
    cursorHidden: getComputedStyle(document.body).cursor === 'none',
  };
}
