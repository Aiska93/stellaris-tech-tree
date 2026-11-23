(() => {
  const prereqs = window.__PREREQS__;
  const cards = new Map();
  for (const el of document.querySelectorAll('button[data-tech-key]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    cards.set(el.dataset.techKey, { el, cx: r.left + r.width / 2, r });
  }
  let pairs = 0, badX = 0, badDom = 0;
  const examples = [];
  for (const [childKey, ps] of Object.entries(prereqs)) {
    const child = cards.get(childKey);
    if (!child) continue;
    for (const p of ps) {
      const parent = cards.get(p);
      if (!parent) continue;
      pairs++;
      if (parent.cx > child.cx + 1) {
        badX++;
        if (examples.length < 8) {
          examples.push('X: ' + p + ' (cx=' + Math.round(parent.cx) + ') RIGHT of ' + childKey + ' (cx=' + Math.round(child.cx) + ')');
        }
      }
      const same = parent.el.parentElement === child.el.parentElement;
      if (same && !(parent.el.compareDocumentPosition(child.el) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        badDom++;
        if (examples.length < 8) examples.push('DOM: ' + p + ' after ' + childKey + ' in same cell');
      }
    }
  }
  const zgl = cards.get('tech_space_science_1');
  const mcf = cards.get('tech_miniature_containment_fields');
  const ex = zgl && mcf ? ('ZGL cx=' + Math.round(zgl.cx) + ' MCF cx=' + Math.round(mcf.cx) + ' ok=' + (zgl.cx < mcf.cx)) : 'ZGL/MCF not both visible';
  return 'pairs=' + pairs + ' xViolations=' + badX + ' domOrderViolations=' + badDom + ' | ' + ex + (examples.length ? ' | ' + examples.join(' ; ') : '');
})()
