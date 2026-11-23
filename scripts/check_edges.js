(() => {
  // Geometric check: every connector-line endpoint must sit on the boundary
  // of some tech card, measured in the grid's LOCAL (pre-zoom) space.
  const sections = document.querySelectorAll('section');
  let total = 0, bad = 0, maxDev = 0;
  for (const sec of sections) {
    const svg = sec.querySelector('svg'); // first svg = base connector layer
    if (!svg) continue;
    const grid = svg.parentElement;
    const gr = grid.getBoundingClientRect();
    const probe = grid.children[0];
    const scale = probe.getBoundingClientRect().width / 100;
    const k = 1 / scale;
    const cards = [...grid.querySelectorAll('button[data-tech-key]')].map(el => {
      const r = el.getBoundingClientRect();
      return {
        left: (r.left - gr.left) * k,
        right: (r.right - gr.left) * k,
        top: (r.top - gr.top) * k,
        bottom: (r.bottom - gr.top) * k,
      };
    });
    if (!cards.length) continue;
    const distPerim = (x, y, c) => {
      const dx = Math.max(c.left - x, 0, x - c.right);
      const dy = Math.max(c.top - y, 0, y - c.bottom);
      if (dx === 0 && dy === 0) {
        return Math.min(x - c.left, c.right - x, y - c.top, c.bottom - y);
      }
      return Math.hypot(dx, dy);
    };
    for (const p of svg.querySelectorAll('path[d]')) {
      const nums = (p.getAttribute('d').match(/-?[\d.]+/g) || []).map(Number);
      if (nums.length < 4) continue;
      const ends = [[nums[0], nums[1]], [nums[nums.length - 2], nums[nums.length - 1]]];
      for (const [x, y] of ends) {
        let best = Infinity;
        for (const c of cards) {
          const d = distPerim(x, y, c);
          if (d < best) best = d;
        }
        total++;
        if (best > maxDev) maxDev = best;
        if (best > 3) bad++;
      }
    }
  }
  return 'endpoints=' + total + ' detached(>3px)=' + bad + ' maxDeviation=' + maxDev.toFixed(2) + 'px';
})()
