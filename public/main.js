(() => {
  const W = 1800, H = 1000;
  const cv = document.getElementById('passport');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const C = {
    paper: '#e3dbc4', edge: '#cbbd9d', frame: '#ece6d3', blue: '#5b93dc',
    ink: '#7b6551', inkD: '#5a4838', tile: '#ebe4d0', tileEdge: '#c8b898',
    mrz: '#93b4e0', map: 'rgba(110,163,216,.24)', mountain: '#b39b80', dot: 'rgba(140,118,90,.17)'
  };
  const PHOTO = { x: 96, y: 262, w: 408, h: 500, r: 30 };
  const BIOMES = [
    { id: 'shore', name: 'SHORE', c: '#e1a23c' },
    { id: 'tropics', name: 'TROPICS', c: '#3f9d55' },
    { id: 'roots', name: 'ROOTS', c: '#8a6a3e' },
    { id: 'alpine', name: 'ALPINE', c: '#4a93d2' },
    { id: 'mesa', name: 'MESA', c: '#cf6a3a' },
    { id: 'caldera', name: 'CALDERA', c: '#c4433a' },
    { id: 'gloom', name: 'GLOOM', c: '#7470c4' },
    { id: 'kiln', name: 'THE KILN', c: '#e0602a' },
    { id: 'citadel', name: 'CITADEL', c: '#5f6f80' },
    { id: 'peak', name: 'PEAK', c: '#d27858' },
    { id: 'tomb', name: 'TOMB', c: '#a8783a' },
    { id: 'nadir', name: 'NADIR', c: '#2f7d6b' }
  ];

  const $ = id => document.getElementById(id);
  const el = { name: $('name'), digits: $('digits'), prefix: $('prefix'), nationality: $('nationality'),
    issued: $('issued'), ascent: $('ascent'), zoom: $('zoom') };

  const rnd9 = () => String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  const today = () => new Date().toISOString().slice(0, 10);
  const defaults = () => ({ name: '', digits: rnd9(), nationality: 'CRABLAND', issued: today(), ascent: '0',
    biomes: ['shore', 'tropics', 'alpine'] });

  let S = defaults();
  try { Object.assign(S, JSON.parse(localStorage.getItem('peak-passport') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('peak-passport', JSON.stringify(S)); } catch (e) {} };

  let img = null;
  const view = { zoom: 1, ox: 0, oy: 0 };

  // ---------- form ----------
  // sash colors per ascent (Peak = Tadpole … 8 = Scoutmaster)
  const SASH = [
    { name: 'Peak · Tadpole', c: '#5e8f7f', d: '#2c4a40' },
    { name: 'Ascent 1 · Rabbit', c: '#a49a2c', d: '#4f4a12' },
    { name: 'Ascent 2 · Raccoon', c: '#4a4a4a', d: '#1a1a1a' },
    { name: 'Ascent 3 · Mule', c: '#b07352', d: '#5a3424' },
    { name: 'Ascent 4 · Kangaroo', c: '#d24f43', d: '#6e2520' },
    { name: 'Ascent 5 · Owl', c: '#7d52bd', d: '#33204f' },
    { name: 'Ascent 6 · Wolf', c: '#b9b9b9', d: '#4c4c4c' },
    { name: 'Ascent 7 · Goat', c: '#c99c2a', d: '#5e4510' },
    { name: 'Ascent 8 · Scoutmaster', c: '#1d2a66', d: '#0b0f2a', cosmic: true }
  ];
  if (!(+S.ascent >= 0 && +S.ascent <= 8)) S.ascent = '8';
  SASH.forEach((t, i) => el.ascent.add(new Option(t.name, String(i))));

  function syncForm() {
    el.name.value = S.name; el.digits.value = S.digits; el.nationality.value = S.nationality;
    el.issued.value = S.issued; el.ascent.value = S.ascent;
    renderChips();
  }

  function renderChips() {
    const box = $('biomes'); box.innerHTML = '';
    BIOMES.forEach(b => {
      const on = S.biomes.includes(b.id);
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.textContent = b.name;
      c.style.setProperty('--c', b.c); c.setAttribute('aria-pressed', String(on));
      c.onclick = () => {
        S.biomes = on ? S.biomes.filter(x => x !== b.id) : [...S.biomes, b.id];
        renderChips(); update();
      };
      box.append(c);
    });
  }

  el.name.addEventListener('input', () => { S.name = el.name.value; update(); });
  el.digits.addEventListener('input', () => {
    el.digits.value = el.digits.value.replace(/\D/g, '').slice(0, 9);
    S.digits = el.digits.value; update();
  });
  el.digits.addEventListener('blur', () => { S.digits = S.digits.padEnd(9, '0'); el.digits.value = S.digits; update(); });
  el.nationality.addEventListener('input', () => { S.nationality = el.nationality.value; update(); });
  el.issued.addEventListener('input', () => { S.issued = el.issued.value; update(); });
  el.ascent.addEventListener('change', () => { S.ascent = el.ascent.value; update(); });
  $('reroll').onclick = () => { S.digits = rnd9(); el.digits.value = S.digits; update(); };
  el.zoom.addEventListener('input', () => { view.zoom = +el.zoom.value; clampView(); draw(); });
  $('center').onclick = () => { view.ox = 0; view.oy = 0; draw(); };
  $('reset').onclick = () => {
    S = defaults(); img = null; view.zoom = 1; view.ox = view.oy = 0; el.zoom.value = 1;
    $('file').value = ''; syncForm(); update();
  };

  // ---------- image input ----------
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { img = im; view.zoom = 1; view.ox = view.oy = 0; el.zoom.value = 1; update(); };
    im.src = url;
  }
  $('file').addEventListener('change', e => loadFile(e.target.files[0]));
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
  window.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  // ---------- pan / zoom on canvas ----------
  const toCanvas = e => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };
  const inPhoto = p => p.x >= PHOTO.x && p.x <= PHOTO.x + PHOTO.w && p.y >= PHOTO.y && p.y <= PHOTO.y + PHOTO.h;
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    const p = toCanvas(e);
    if (!inPhoto(p)) return;
    if (!img) { $('file').click(); return; }
    drag = { x: p.x, y: p.y, ox: view.ox, oy: view.oy };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    const p = toCanvas(e);
    cv.style.cursor = drag ? 'grabbing' : inPhoto(p) ? (img ? 'grab' : 'pointer') : 'default';
    if (!drag) return;
    view.ox = drag.ox + (p.x - drag.x); view.oy = drag.oy + (p.y - drag.y);
    clampView(); draw();
  });
  const endDrag = () => { drag = null; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', e => {
    if (!img || !inPhoto(toCanvas(e))) return;
    e.preventDefault();
    view.zoom = Math.min(4, Math.max(1, view.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
    el.zoom.value = view.zoom; clampView(); draw();
  }, { passive: false });

  function photoRect() {
    const s = Math.max(PHOTO.w / img.width, PHOTO.h / img.height) * view.zoom;
    const w = img.width * s, h = img.height * s;
    return { w, h, x: PHOTO.x + (PHOTO.w - w) / 2 + view.ox, y: PHOTO.y + (PHOTO.h - h) / 2 + view.oy };
  }
  function clampView() {
    if (!img) return;
    const s = Math.max(PHOTO.w / img.width, PHOTO.h / img.height) * view.zoom;
    const mx = (img.width * s - PHOTO.w) / 2, my = (img.height * s - PHOTO.h) / 2;
    view.ox = Math.max(-mx, Math.min(mx, view.ox));
    view.oy = Math.max(-my, Math.min(my, view.oy));
  }

  // ---------- drawing ----------
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const letter = () => ((S.name.trim().match(/[a-z0-9]/i) || ['S'])[0]).toUpperCase();
  const passNo = () => letter() + S.digits.padEnd(9, '0');

  function drawBackground() {
    ctx.fillStyle = '#d6cbb0'; rr(0, 0, W, H, 44); ctx.fill();
    ctx.fillStyle = C.paper; rr(14, 14, W - 28, H - 28, 36); ctx.fill();
    ctx.save(); rr(14, 14, W - 28, H - 28, 36); ctx.clip();
    // dots
    ctx.fillStyle = C.dot;
    for (let y = 24; y < H; y += 16) for (let x = 24 + (y / 16 % 2) * 8; x < W; x += 16) {
      ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
    }
    // map lines seeded from passport digits
    const r = seeded(+S.digits.padEnd(9, '0') % 2147483646 + 1);
    ctx.strokeStyle = C.map; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 16 + r() * 20;
      let x = 560 + r() * 1300, y = r() < .5 ? -20 : H + 20;
      const dir = y < 0 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        const nx = x + (r() - .5) * 520, ny = y + dir * (120 + r() * 200);
        ctx.quadraticCurveTo(x + (r() - .5) * 300, (y + ny) / 2, nx, ny);
        x = nx; y = ny;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeader() {
    ctx.fillStyle = C.mountain; ctx.strokeStyle = C.mountain; ctx.lineJoin = 'round'; ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(264, 132); ctx.lineTo(287, 92); ctx.lineTo(296, 102); ctx.lineTo(308, 64); ctx.lineTo(336, 132);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const ls = 7;
    ctx.save();
    ctx.fillStyle = C.blue; ctx.font = '700 72px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px';
    ctx.fillText('PASSPORT', 300 + ls / 2, 210);
    ctx.restore();
  }

  function drawPlaceholder() {
    const cx = PHOTO.x + PHOTO.w / 2, cy = PHOTO.y + PHOTO.h / 2;
    ctx.fillStyle = '#e6dcc2'; ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    ctx.strokeStyle = '#b5a483'; ctx.lineWidth = 5; ctx.setLineDash([16, 12]);
    rr(PHOTO.x + 14, PHOTO.y + 14, PHOTO.w - 28, PHOTO.h - 28, PHOTO.r - 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#b5a483'; ctx.beginPath(); ctx.arc(cx, cy - 40, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - 62); ctx.lineTo(cx, cy - 18); ctx.moveTo(cx - 22, cy - 40); ctx.lineTo(cx + 22, cy - 40); ctx.stroke();
    ctx.fillStyle = '#8f7b60'; ctx.font = '600 32px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Upload your photo', cx, cy + 40);
    ctx.font = '500 22px Fredoka'; ctx.fillStyle = '#a8977a';
    ctx.fillText('click, drop or paste', cx, cy + 78);
  }

  function drawPhoto() {
    ctx.fillStyle = C.frame; rr(PHOTO.x - 20, PHOTO.y - 20, PHOTO.w + 40, PHOTO.h + 40, PHOTO.r + 16); ctx.fill();
    ctx.save(); rr(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r); ctx.clip();
    if (img) { const p = photoRect(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, p.x, p.y, p.w, p.h); }
    else drawPlaceholder();
    ctx.restore();
  }

  function drawCamera() {
    // two stacked rounded blocks split by a gap, ring in the middle
    const x = 92, y = 812, w = 116, h = 86, cx = x + w / 2, cy = y + h / 2;
    const fill = '#c4b398', gap = C.paper;
    ctx.save();
    ctx.fillStyle = fill;
    rr(cx - 22, y - 8, 44, 20, 6); ctx.fill();          // top bump
    rr(x, y, w, h, 20); ctx.fill();                      // body
    ctx.fillStyle = gap; ctx.fillRect(x - 2, cy - 4, w + 4, 8); // gap between blocks
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill(); // ring outer
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill(); // ring hole
    ctx.restore();
  }

  function drawAscentBadge() {
    const a = +S.ascent, t = SASH[a], cx = 300, cy = 854;
    const label = a === 0 ? 'P' : String(a);
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 24; i++) { const r = i % 2 ? 40 : 50, th = i * Math.PI / 12; ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r); }
    ctx.closePath();
    if (t.cosmic) {
      const g = ctx.createRadialGradient(-12, -12, 4, 0, 0, 52);
      g.addColorStop(0, '#3b4fa8'); g.addColorStop(.6, '#1d2a66'); g.addColorStop(1, '#0b0f2a');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      let seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 26; i++) {
        const ang = r() * Math.PI * 2, rad = 33 + r() * 17;
        ctx.fillStyle = r() > .7 ? '#ffe9a8' : '#cfe0ff';
        ctx.beginPath(); ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, .8 + r() * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else { ctx.fillStyle = t.c; ctx.fill(); }
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = t.d; ctx.stroke();
    ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = t.d; ctx.stroke();
    ctx.fillStyle = C.inkD; ctx.font = '700 34px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 2);
    ctx.restore();
    ctx.fillStyle = C.blue; ctx.font = '600 26px Fredoka'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('ASCENT', cx + 64, cy + 2);
  }

  function fitText(text, maxW, weight, size, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
  }

  function drawFields() {
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const VF = '"Darumadrop One", Fredoka';
    const label = (t, x, y) => { ctx.fillStyle = C.blue; ctx.font = '600 32px Fredoka'; ctx.fillText(t, x, y); };
    label('Name', 600, 92);
    ctx.fillStyle = C.ink; const nm = S.name.trim() || 'Scout';
    fitText(nm, 560, '400', 64, VF); ctx.fillText(nm, 604, 152);

    label('Passport no.', 600, 210);
    ctx.fillStyle = C.ink; ctx.font = `400 52px ${VF}`; ctx.fillText(passNo(), 602, 264);

    label('Date of issue', 1220, 92);
    ctx.fillStyle = C.ink; ctx.font = `400 46px ${VF}`;
    const d = S.issued ? new Date(S.issued + 'T00:00') : new Date();
    ctx.fillText(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), 1222, 146);

    label('Nationality', 1220, 210);
    ctx.fillStyle = C.ink; const nat = (S.nationality.trim() || 'CRABLAND').toUpperCase();
    fitText(nat, 360, '400', 52, VF); ctx.fillText(nat, 1222, 264);

    // checkbox
    ctx.strokeStyle = '#b5a483'; ctx.fillStyle = '#e9e2cd'; ctx.lineWidth = 6;
    rr(1630, 54, 96, 96, 14); ctx.fill(); ctx.stroke();
    {
      ctx.strokeStyle = C.inkD; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(1655, 104); ctx.lineTo(1672, 124); ctx.lineTo(1702, 78); ctx.stroke();
    }
  }

  // stamp glyphs, drawn around (0,0), ~ 60px box
  const G = {
    shore(c) {
      ctx.strokeStyle = c; ctx.lineWidth = 6;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = -32; x <= 32; x += 2) ctx.lineTo(x, -14 + k * 14 + Math.sin(x / 7) * 5); ctx.stroke(); }
    },
    tropics(c) {
      ctx.strokeStyle = c; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(6, 30); ctx.quadraticCurveTo(-4, 0, 2, -20); ctx.stroke();
      ctx.lineWidth = 6;
      [[-30, -6], [30, -4], [-22, -30], [22, -30]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(2, -20); ctx.quadraticCurveTo((x) / 2, -34, x, y); ctx.stroke(); });
    },
    roots(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -14, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 22); ctx.moveTo(0, 18); ctx.lineTo(-20, 30); ctx.moveTo(0, 18); ctx.lineTo(20, 30); ctx.stroke();
    },
    alpine(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-34, 26); ctx.lineTo(0, -30); ctx.lineTo(34, 26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(0, -30); ctx.lineTo(12, -10); ctx.lineTo(4, -14); ctx.lineTo(-4, -8); ctx.fill();
    },
    mesa(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-36, 26); ctx.lineTo(-20, -14); ctx.lineTo(20, -14); ctx.lineTo(36, 26); ctx.fill();
      ctx.beginPath(); ctx.arc(18, -28, 9, 0, Math.PI * 2); ctx.fill();
    },
    caldera(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-36, 28); ctx.lineTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(36, 28); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(-6, -24, 7, 0, Math.PI * 2); ctx.arc(8, -34, 9, 0, Math.PI * 2); ctx.stroke();
    },
    kiln(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -34);
      ctx.bezierCurveTo(26, -8, 28, 10, 20, 22); ctx.quadraticCurveTo(0, 38, -20, 22); ctx.bezierCurveTo(-28, 8, -16, -6, 0, -34); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(12, 10, 8, 20); ctx.quadraticCurveTo(0, 28, -8, 20); ctx.quadraticCurveTo(-10, 10, 0, -4); ctx.fill();
    },
    gloom(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-24, 30); ctx.lineTo(-24, -8);
      ctx.arc(0, -8, 24, Math.PI, 0); ctx.lineTo(24, 30);
      for (let k = 0; k < 4; k++) { ctx.lineTo(24 - k * 12 - 6, 22); ctx.lineTo(24 - (k + 1) * 12, 30); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-9, -8, 5, 7, 0, 0, Math.PI * 2); ctx.ellipse(9, -8, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    },
    citadel(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-22, 30); ctx.lineTo(-22, -22);
      [-22, -10, 2, 14].forEach(x => { ctx.lineTo(x, -34); ctx.lineTo(x + 8, -34); ctx.lineTo(x + 8, -22); ctx.lineTo(x + 12, -22); });
      ctx.lineTo(22, -34); ctx.lineTo(22, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(-8, 14); ctx.arc(0, 14, 8, Math.PI, 0); ctx.lineTo(8, 30); ctx.fill();
      ctx.fillRect(-4, -12, 8, 12);
    },
    tomb(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-36, 28); ctx.lineTo(0, -34); ctx.lineTo(36, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.moveTo(-8, 28); ctx.lineTo(-8, 12); ctx.arc(0, 12, 8, Math.PI, 0); ctx.lineTo(8, 28); ctx.fill();
      ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, 8); ctx.lineTo(-13, 8); ctx.moveTo(13, 8); ctx.lineTo(20, 8); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.stroke();
    },
    nadir(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -6, 26, Math.PI * .85, Math.PI * .15);
      ctx.lineTo(16, 24); ctx.lineTo(-16, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(-10, -4, 7, 0, Math.PI * 2); ctx.arc(10, -4, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, 13); ctx.lineTo(4, 13); ctx.fill();
      ctx.fillRect(-9, 18, 4, 6); ctx.fillRect(-2, 18, 4, 6); ctx.fillRect(5, 18, 4, 6);
    },
    peak(c) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-36, 28); ctx.lineTo(0, -12); ctx.lineTo(36, 28); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(22, -31); ctx.lineTo(0, -24); ctx.fill();
    }
  };

  function drawStamps() {
    // tab
    const tx = 620, ty = 300;
    ctx.fillStyle = C.tile; ctx.strokeStyle = C.tileEdge; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(tx, ty, 330, 84, [20, 20, 0, 0]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.tile; ctx.fillRect(tx + 3, ty + 76, 324, 12);
    ctx.strokeStyle = C.tileEdge; ctx.beginPath(); ctx.moveTo(tx - 20, ty + 84); ctx.lineTo(tx, ty + 84); ctx.moveTo(tx + 330, ty + 84); ctx.lineTo(1720, ty + 84); ctx.stroke();
    ctx.fillStyle = C.inkD; ctx.font = '700 34px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EXPEDITION', tx + 165, ty + 44);
    // inactive tabs
    ['STAMPS', 'BADGES'].forEach((t, i) => {
      const x = 980 + i * 230;
      ctx.fillStyle = '#d3c6a8'; ctx.beginPath(); ctx.roundRect(x, ty + 14, 210, 68, [18, 18, 0, 0]); ctx.fill();
      ctx.fillStyle = '#b4a481'; ctx.font = '600 28px Fredoka'; ctx.fillText(t, x + 105, ty + 50);
    });

    const size = 160, gap = 24, gx = 620, gy = 414;
    const items = [...BIOMES]; while (items.length % 6) items.push(null);
    items.forEach((b, i) => {
      const x = gx + (i % 6) * (size + gap), y = gy + Math.floor(i / 6) * (size + gap);
      ctx.fillStyle = C.tile; ctx.strokeStyle = C.tileEdge; ctx.lineWidth = 6;
      rr(x, y, size, size, 22); ctx.fill(); ctx.stroke();
      const cx = x + size / 2, cy = y + size / 2;
      if (!b || !S.biomes.includes(b.id)) {
        ctx.fillStyle = '#9c8466'; ctx.font = '700 84px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy + 4);
        return;
      }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(((i * 37) % 17 - 8) * Math.PI / 180);
      ctx.globalAlpha = .92;
      ctx.strokeStyle = b.c; ctx.lineWidth = 5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(0, -10); ctx.scale(.72, .72); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; G[b.id](b.c); ctx.restore();
      ctx.fillStyle = b.c; ctx.font = '700 19px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.name, 0, 34);
      ctx.restore();
    });
  }

  function mrzLine() {
    const dd = (S.issued || today()).replace(/-/g, '').slice(2);
    const sum = [...S.digits].reduce((a, d, i) => a + d * [7, 3, 1][i % 3], 0) % 10;
    const nm = (S.name.trim() || 'SCOUT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    let s = `${S.digits.padEnd(9, '0')}${sum}${dd}${S.ascent}0>${nm}>${[...S.digits].reverse().join('')}${(sum * 3) % 10}`;
    return (s + '>'.repeat(48)).slice(0, 48);
  }

  function drawMRZ() {
    ctx.fillStyle = C.mrz; ctx.font = '700 30px "Space Mono"'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const line = mrzLine(), step = (W - 148) / line.length;
    [...line].forEach((ch, i) => ctx.fillText(ch, 74 + i * step, 966));
  }

  function drawCredit() {
    ctx.save();
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.font = '500 26px Fredoka'; ctx.fillStyle = C.ink;
    ctx.fillText('issued at peak-passport.pages.dev', 1724, 880);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground(); drawHeader(); drawPhoto(); drawCamera(); drawAscentBadge();
    drawFields(); drawStamps(); drawCredit(); drawMRZ();
  }

  function update() {
    el.prefix.textContent = letter();
    $('download').disabled = $('story').disabled = !img;
    document.querySelector('.req').hidden = !!img;
    save(); draw();
  }

  // ---------- export ----------
  const fileName = () => `peak-passport-${(S.name.trim() || 'scout').replace(/[^\w-]+/g, '_')}.png`;
  $('download').onclick = () => img && cv.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
  // ---------- story export ----------
  // 1080x1920 portrait for Instagram/TikTok stories. Content stays inside
  // y 250..1670 so the app's top bar and reply box don't cover it.
  const SW = 1080, SH = 1920, URL_TXT = 'peak-passport.pages.dev';
  const scoutName = () => S.name.trim() || 'Scout';

  function dots(s, color, step = 22, r = 2.4) {
    s.fillStyle = color;
    for (let y = 10; y < SH; y += step) for (let x = 10; x < SW; x += step) {
      s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
    }
  }
  function title(s, y, a, b, size = 92) {
    s.font = `700 ${size}px Fredoka`; s.textAlign = 'left'; s.textBaseline = 'alphabetic';
    const aw = s.measureText('PEAK ').width, bw = s.measureText('PASSPORT').width, x0 = (SW - aw - bw) / 2;
    s.fillStyle = a; s.fillText('PEAK ', x0, y);
    s.fillStyle = b; s.fillText('PASSPORT', x0 + aw, y);
    s.textAlign = 'center';
  }
  function line(s, text, y, color, font) {
    s.textAlign = 'center'; s.textBaseline = 'alphabetic';
    s.fillStyle = color; s.font = font; s.fillText(text, SW / 2, y, 960);
  }
  function passport(s, cx, cy, pw, deg, shadow) {
    const ph = pw * H / W;
    s.save(); s.translate(cx, cy); s.rotate(deg * Math.PI / 180);
    s.shadowColor = shadow; s.shadowBlur = 44; s.shadowOffsetY = 20;
    s.drawImage(cv, -pw / 2, -ph / 2, pw, ph);
    s.restore();
  }
  function mountains(s, layers) {
    layers.forEach(([color, top, seed], i) => {
      const r = seeded(seed);
      s.fillStyle = color; s.beginPath(); s.moveTo(0, SH);
      let x = 0; s.lineTo(0, top + r() * 120);
      while (x < SW) {
        x += 140 + r() * 160; s.lineTo(x - 70, top - 60 - r() * 160); s.lineTo(x, top + r() * 120);
      }
      s.lineTo(SW, SH); s.closePath(); s.fill();
    });
  }

  const LAYOUTS = [
    { id: 'paper', name: 'Paper', draw(s) {
      s.fillStyle = '#d3c8ab'; s.fillRect(0, 0, SW, SH);
      dots(s, 'rgba(110,89,70,.16)');
      title(s, 560, C.blue, '#4d3d30');
      line(s, scoutName() + ' is ready for the climb', 630, C.ink, '500 40px Fredoka');
      passport(s, SW / 2, 960, 1000, -3, 'rgba(77,61,48,.35)');
      line(s, 'make yours at', 1380, C.ink, '500 40px Fredoka');
      line(s, URL_TXT, 1450, '#4d3d30', '600 54px Fredoka');
    } },
    { id: 'summit', name: 'Summit', draw(s) {
      const g = s.createLinearGradient(0, 0, 0, SH);
      g.addColorStop(0, '#5b93dc'); g.addColorStop(.55, '#a9cdf0'); g.addColorStop(1, '#f2dcb0');
      s.fillStyle = g; s.fillRect(0, 0, SW, SH);
      s.fillStyle = 'rgba(255,255,255,.75)';
      [[160, 360, 70], [860, 300, 90], [620, 470, 55]].forEach(([x, y, w]) => {
        s.beginPath(); s.ellipse(x, y, w * 1.6, w * .55, 0, 0, Math.PI * 2); s.fill();
        s.beginPath(); s.ellipse(x - w * .4, y - w * .35, w * .7, w * .5, 0, 0, Math.PI * 2); s.fill();
      });
      mountains(s, [['#9ab3cf', 1300, 11], ['#b39b80', 1420, 23], ['#8a7259', 1560, 37]]);
      title(s, 560, '#ffffff', '#ffffff');
      line(s, scoutName() + ' made it to the summit', 630, '#ffffff', '500 40px Fredoka');
      passport(s, SW / 2, 950, 980, 0, 'rgba(30,50,90,.35)');
      line(s, 'make yours at', 1480, '#fff6df', '500 40px Fredoka');
      line(s, URL_TXT, 1550, '#fff6df', '600 54px Fredoka');
    } },
    { id: 'ascent', name: 'Ascent', draw(s) {
      const t = SASH[+S.ascent];
      const g = s.createLinearGradient(0, 0, SW, SH);
      g.addColorStop(0, t.c); g.addColorStop(1, t.d);
      s.fillStyle = g; s.fillRect(0, 0, SW, SH);
      if (t.cosmic) {
        const r = seeded(99);
        for (let i = 0; i < 220; i++) {
          s.fillStyle = r() > .7 ? '#ffe9a8' : '#cfe0ff';
          s.beginPath(); s.arc(r() * SW, r() * SH, .8 + r() * 2.6, 0, Math.PI * 2); s.fill();
        }
      } else {
        s.save(); s.globalAlpha = .1; s.strokeStyle = '#fff'; s.lineWidth = 40;
        for (let x = -SH; x < SW; x += 120) { s.beginPath(); s.moveTo(x, SH); s.lineTo(x + SH, 0); s.stroke(); }
        s.restore();
      }
      title(s, 540, '#fff6df', '#fff6df');
      line(s, t.name.toUpperCase(), 620, 'rgba(255,246,223,.85)', '600 44px Fredoka');
      passport(s, SW / 2, 960, 1000, 2, 'rgba(0,0,0,.4)');
      line(s, 'make yours at', 1380, 'rgba(255,246,223,.85)', '500 40px Fredoka');
      line(s, URL_TXT, 1450, '#fff6df', '600 54px Fredoka');
    } },
  ];

  function renderStory(layout) {
    const sc = document.createElement('canvas'); sc.width = SW; sc.height = SH;
    layout.draw(sc.getContext('2d'));
    return sc;
  }

  // Picker: preview every layout from the current passport, pick one to save/share.
  const dlg = $('storyDlg'), grid = $('storyGrid');
  let stories = [];
  $('story').onclick = async () => {
    if (!img) return;
    grid.innerHTML = '';
    stories = LAYOUTS.map(l => ({ l, canvas: renderStory(l) }));
    stories.forEach((st, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'story-opt';
      const th = new Image(); th.alt = ''; th.src = st.canvas.toDataURL('image/jpeg', .8);
      const cap = document.createElement('span'); cap.textContent = st.l.name;
      b.append(th, cap); b.onclick = () => saveStory(i);
      grid.append(b);
    });
    dlg.showModal();
    // pre-encode so the share sheet opens straight from the tap (keeps user activation)
    await Promise.all(stories.map(async st => {
      st.blob = await new Promise(r => st.canvas.toBlob(r, 'image/png'));
    }));
  };
  async function saveStory(i) {
    const st = stories[i];
    const blob = st.blob || await new Promise(r => st.canvas.toBlob(r, 'image/png'));
    const name = fileName().replace('.png', `-story-${st.l.id}.png`);
    const file = new File([blob], name, { type: 'image/png' });
    // On phones, open the share sheet so it can go straight to an Instagram story.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); dlg.close(); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    dlg.close();
  }
  $('storyClose').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  syncForm(); update();
  Promise.all(['700 40px Fredoka', '600 40px Fredoka', '40px "Darumadrop One"', '700 40px "Space Mono"']
    .map(f => document.fonts.load(f))).then(draw, draw);
})();
