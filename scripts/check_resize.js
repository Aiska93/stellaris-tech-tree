(() => {
  const S = (x) => JSON.stringify(x);
  const cards = Array.from(document.querySelectorAll('[data-tech-key]'));
  if (!cards.length) return S({ error: 'no cards' });
  const r0 = cards[0].getBoundingClientRect();
  const scale = r0.width / 180;
  const u = (v) => v / scale;
  let badSize = 0;
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (Math.abs(u(r.width) - 180) > 0.6 || Math.abs(u(r.height) - 68) > 0.6) badSize++;
  }
  const trunc = [];
  const rowClip = [];
  const railBad = [];
  const badgeInfo = [];
  const oddsInfo = [];
  const centerInfo = [];
  let oddsCount = 0, dlcDotCount = 0, checked = 0;
  let nameW = null;
  for (const c of cards) {
    const key = c.getAttribute('data-tech-key');
    const cr = c.getBoundingClientRect();
    const p = c.querySelector('p');
    if (p) {
      if (nameW === null) nameW = +u(p.getBoundingClientRect().width).toFixed(1);
      if (p.scrollHeight > p.clientHeight + 1) trunc.push(key);
    }
    const row = Array.from(c.querySelectorAll('div')).find(d => d.classList.contains('bottom-[3px]') && d.classList.contains('left-1'));
    if (row && row.scrollWidth > row.clientWidth + 0.5) rowClip.push(key);
    const rail = Array.from(c.children).find(el => el.tagName === 'SPAN' && el.classList.contains('w-[50px]'));
    if (rail) {
      const rr = rail.getBoundingClientRect();
      const img = rail.querySelector('img');
      const ir = img ? img.getBoundingClientRect() : null;
      const b = rail.querySelector('span.absolute');
      if (b && checked < 400) {
        checked++;
        const br = b.getBoundingClientRect();
        const rec = {
          key,
          railW: +u(rr.width).toFixed(2),
          imgBoxW: ir ? +u(ir.width).toFixed(2) : null,
          imgBoxH: ir ? +u(ir.height).toFixed(2) : null,
          badgeW: +u(br.width).toFixed(2),
          badgeH: +u(br.height).toFixed(2),
          badgeL: +u(br.left - rr.left).toFixed(2),
          badgeT: +u(br.top - rr.top).toFixed(2),
          insideCard: br.left >= cr.left - 0.6 && br.right <= cr.right + 0.6 && br.top >= cr.top - 0.6 && br.bottom <= cr.bottom + 0.6,
        };
        const px0 = rr.left + 2 * scale, py0 = rr.top + 10.5 * scale;
        const px1 = px0 + 45 * scale, py1 = py0 + 45 * scale;
        rec.overlapImg = br.left < px1 && br.right > px0 && br.top < py1 && br.bottom > py0;
        const ovX = Math.min(br.right, px1) - Math.max(br.left, px0);
        const ovY = Math.min(br.bottom, py1) - Math.max(br.top, py0);
        rec.overlapAreaPx = +(u(ovX) * u(ovY)).toFixed(1);
        if (badgeInfo.length < 3) badgeInfo.push(rec);
        if (!rec.overlapImg || Math.abs(rec.railW - 50) > 0.6 || Math.abs(rec.badgeW - 14) > 0.6 || Math.abs(rec.badgeH - 14) > 0.6 || !rec.insideCard) railBad.push(rec);
        if (centerInfo.length < 3 && p) {
          const pr = p.getBoundingClientRect();
          centerInfo.push({ key, nameCenterDelta: +u(pr.top + pr.height / 2 - (rr.top + rr.height / 2)).toFixed(2) });
        }
      }
    }
    const odds = Array.from(c.querySelectorAll('span')).find(s => s.classList.contains('bottom-[3px]') && s.classList.contains('right-[3px]'));
    if (odds) {
      oddsCount++;
      const orr = odds.getBoundingClientRect();
      if (oddsInfo.length < 3) oddsInfo.push({ key, gapR: +u(cr.right - orr.right).toFixed(2), gapB: +u(cr.bottom - orr.bottom).toFixed(2), clipped: orr.right > cr.right + 0.6 || orr.bottom > cr.bottom + 0.6 });
    }
    if (Array.from(c.querySelectorAll('span')).some(s => s.classList.contains('top-[4px]'))) dlcDotCount++;
  }
  let longInfo = null;
  const longC = cards.find(c => { const p = c.querySelector('p'); return p && p.textContent === 'Transcendental Innovation Department'; });
  if (longC) {
    const p = longC.querySelector('p');
    const cs = getComputedStyle(p);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const ws = {};
    for (const w of ['Transcendental', 'Innovation', 'Department', 'Innovation Department', 'Transcendental Innovation']) ws[w] = +cv.measureText(w).width.toFixed(1);
    longInfo = { font: cv.font, availTextW: 114, widths: ws, truncated: p.scrollHeight > p.clientHeight + 1 };
  }
  return S({ n: cards.length, scale: +scale.toFixed(3), badSize, namePWidth: nameW, truncN: trunc.length, trunc: trunc.slice(0, 10), rowClipN: rowClip.length, rowClip: rowClip.slice(0, 10), railBadN: railBad.length, badgeInfo, centerInfo, oddsCount, oddsInfo, dlcDotCount, longInfo });
})()
