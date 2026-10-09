/* =========================================================
   MENU FEEL: smooth wheel scrolling and a soft ripple where you click
   ========================================================= */
(() => {
  const scroller = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1) return n; } return null; };
  const anim = new Map(); // element -> target scrollTop
  let lastT = 0;
  const step = () => {
    const now = performance.now(), dt = Math.min(.1, lastT ? (now - lastT) / 1000 : .016); lastT = now; const ease = 1 - Math.exp(-dt / .045); // frame-rate independent: lands in ~0.12s either way
    for (const [el, t] of anim) {
      const d = t - el.scrollTop; if (Math.abs(d) < .5 || !el.isConnected) { if (el.isConnected) el.scrollTop = t; anim.delete(el); continue; }
      el.scrollTop += Math.abs(d) < 2 ? d : d * ease; // ease toward where the wheel wants to go: quick, but not a jump
    }
    if (anim.size) requestAnimationFrame(step); else lastT = 0;
  };
  addEventListener('wheel', e => {
    if (e.ctrlKey || SETTINGS.reduceMotion) return;
    const ov = document.getElementById('overlay'); if (!ov || !ov.contains(e.target)) return;
    const el = scroller(e.target); if (!el) return;
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY;
    const base = anim.has(el) ? anim.get(el) : el.scrollTop, max = el.scrollHeight - el.clientHeight;
    const t = Math.max(0, Math.min(max, base + px)); if (t === base) return; // at the end: let it be
    e.preventDefault(); const was = anim.size; anim.set(el, t); if (!was) requestAnimationFrame(step);
  }, { passive: false });
  addEventListener('pointerdown', e => {
    if (SETTINGS.reduceMotion || e.button) return;
    const b = e.target.closest('#overlay button, #overlay .card, #overlay .sc, #overlay .mtile, #hudbar button'); if (!b || b.classList.contains('skn')) return; // (skill nodes pop instead: a square ripple over a hexagon looks wrong)
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
    rp.className = 'ripple'; rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    const clip = document.createElement('span'); clip.className = 'rip'; clip.appendChild(rp); // the ripple is clipped by its own box, so the button itself never gets overflow:hidden (that would also clip its enlarged hit area)
    b.appendChild(clip); setTimeout(() => clip.remove(), 600);
  });
})();
/* the grain texture used on panels: baked once into a small PNG (an SVG noise filter gets re-rendered on every repaint, which made scrolling heavy) */
(() => {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), img = x.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 16; }
    x.putImageData(img, 0, 0); document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
  } catch (e) {}
})();
