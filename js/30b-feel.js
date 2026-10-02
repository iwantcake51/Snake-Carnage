/* =========================================================
   MENU FEEL: smooth wheel scrolling and a soft ripple where you click
   ========================================================= */
(() => {
  const scroller = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1) return n; } return null; };
  const anim = new Map(); // element -> target scrollTop
  const step = () => {
    for (const [el, t] of anim) {
      const d = t - el.scrollTop; if (Math.abs(d) < .5 || !el.isConnected) { if (el.isConnected) el.scrollTop = t; anim.delete(el); continue; }
      el.scrollTop += d * .18; // ease toward where the wheel wants to go
    }
    if (anim.size) requestAnimationFrame(step);
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
    const b = e.target.closest('#overlay button, #overlay .card, #overlay .sc, #overlay .mtile, #bar button'); if (!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
    rp.className = 'ripple'; rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    if (getComputedStyle(b).overflow !== 'hidden') b.style.overflow = 'hidden';
    b.appendChild(rp); setTimeout(() => rp.remove(), 600);
  });
})();
