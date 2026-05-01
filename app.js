// ── CONSTANTS ──────────────────────────────────────────────────────────────
const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const ROWS = ['Morning','Midday','Evening'];
const BMP_W = 800, BMP_H = 480;
const COL_W = Math.floor(BMP_W / 7);
const HDR_H = 46;
const SLOT_H = Math.floor((BMP_H - HDR_H) / 3);

const PALETTE = [
  [0,0,0],[255,255,255],[0,170,0],[0,0,255],[255,0,0],[255,255,0],[255,128,0]
];

// ── PRELOADED ICONS (Iconify "noto" set - flat colorful emoji-style) ────────
const PRELOADED_ICONS = [
  // Faith
  { name:'Bible',       prefix:'noto', icon:'bible' },
  { name:'Church',      prefix:'noto', icon:'church' },
  { name:'Cross',       prefix:'noto', icon:'latin-cross' },
  { name:'Prayer',      prefix:'noto', icon:'prayer-beads' },
  // Fitness
  { name:'Cycling',     prefix:'noto', icon:'person-biking' },
  { name:'Running',     prefix:'noto', icon:'person-running' },
  { name:'Jiu Jitsu',   prefix:'noto', icon:'martial-arts-uniform' },
  { name:'Gym',         prefix:'noto', icon:'person-lifting-weights' },
  { name:'Swimming',    prefix:'noto', icon:'person-swimming' },
  { name:'Walking',     prefix:'noto', icon:'person-walking' },
  { name:'Hiking',      prefix:'noto', icon:'hiking-boot' },
  { name:'Mountain Bike',prefix:'noto',icon:'bicycle' },
  // Food
  { name:'Pizza',       prefix:'noto', icon:'pizza' },
  { name:'Steak',       prefix:'noto', icon:'cut-of-meat' },
  { name:'Breakfast',   prefix:'noto', icon:'croissant' },
  { name:'Taco',        prefix:'noto', icon:'taco' },
  { name:'Burger',      prefix:'noto', icon:'hamburger' },
  { name:'Sushi',       prefix:'noto', icon:'sushi' },
  { name:'Cooking',     prefix:'noto', icon:'cooking' },
  { name:'Coffee',      prefix:'noto', icon:'hot-beverage' },
  // Home
  { name:'Yard Work',   prefix:'noto', icon:'potted-plant' },
  { name:'Cleaning',    prefix:'noto', icon:'broom' },
  { name:'Tools',       prefix:'noto', icon:'toolbox' },
  // Work / Study
  { name:'Work',        prefix:'noto', icon:'laptop' },
  { name:'Study',       prefix:'noto', icon:'books' },
  { name:'Meeting',     prefix:'noto', icon:'calendar' },
  // Social / Fun
  { name:'Date Night',  prefix:'noto', icon:'rose' },
  { name:'Train',       prefix:'noto', icon:'locomotive' },
  { name:'Family',      prefix:'noto', icon:'family' },
  { name:'Gaming',      prefix:'noto', icon:'video-game' },
  { name:'Movie',       prefix:'noto', icon:'movie-camera' },
  { name:'Music',       prefix:'noto', icon:'musical-notes' },
  { name:'Travel',      prefix:'noto', icon:'airplane' },
  { name:'Shopping',    prefix:'noto', icon:'shopping-cart' },
  { name:'Doctor',      prefix:'noto', icon:'stethoscope' },
];

// ── STATE ──────────────────────────────────────────────────────────────────
let icons = {};
let slots = {};
let bgMode = 'auto';
let selectedSlot = null;
let dragIconId = null;
let searchTimeout = null;
let previewActive = false;

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGrid();
  loadFromStorage(() => {
    renderSearchResults(PRELOADED_ICONS.map(p => ({
      name: p.name,
      svgUrl: `https://api.iconify.design/${p.prefix}/${p.icon}.svg?color=%23000000`,
      preloaded: true
    })), true);
  });
  bindEvents();
  // Enable Match Icons button if a key is already saved
  loadApiKey(key => {
    if (key) {
      document.getElementById('api-key-input').placeholder = 'Key saved \u2713';
      document.getElementById('btn-match-icons').disabled = false;
    }
  });
});

// ── BUILD CALENDAR GRID ────────────────────────────────────────────────────
function buildGrid() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  DAYS.forEach(day => {
    const h = document.createElement('div');
    h.className = 'cal-header';
    h.textContent = day;
    grid.appendChild(h);
  });
  ROWS.forEach((row, ri) => {
    DAYS.forEach((day, di) => {
      const key = `${di}-${ri}`;
      const slot = document.createElement('div');
      slot.className = 'cal-slot' + (ri === 2 ? ' last-row' : '');
      slot.dataset.key = key;
      renderSlot(slot, key);
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('drag-over');
        if (dragIconId) dropIconIntoSlot(key, dragIconId);
      });
      slot.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-icon')) return;
        selectSlot(key);
      });
      grid.appendChild(slot);
    });
  });
}

function renderSlot(slotEl, key) {
  slotEl.innerHTML = '';
  const data = slots[key];
  const hasIcons = data && data.icons && data.icons.length > 0;
  const labels = (data && data.labels) || [];

  if (!hasIcons && labels.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'slot-empty-hint';
    hint.textContent = 'drop icon';
    slotEl.appendChild(hint);
  } else {
    if (hasIcons) {
      const content = document.createElement('div');
      if (data.split && data.icons.length >= 2) {
        content.className = 'slot-content split';
        data.icons.slice(0,2).forEach((id, idx) => content.appendChild(makeIconWrap(id, key, idx)));
        const div = document.createElement('div');
        div.className = 'split-divider';
        content.appendChild(div);
      } else {
        content.className = 'slot-content';
        content.appendChild(makeIconWrap(data.icons[0], key, 0));
      }
      slotEl.appendChild(content);
    }
    if (labels.length > 0) {
      const labelContainer = document.createElement('div');
      labelContainer.className = 'slot-labels';
      labels.slice(0, 3).forEach(text => {
        const l = document.createElement('div');
        l.className = 'slot-label';
        l.textContent = text;
        labelContainer.appendChild(l);
      });
      slotEl.appendChild(labelContainer);
    }
  }
  slotEl.style.outline = selectedSlot === key ? '2px solid #f5c842' : '';
  slotEl.style.outlineOffset = '-2px';
}

function makeIconWrap(id, key, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'slot-icon-wrap';
  if (!icons[id]) return wrap;
  const img = document.createElement('img');
  img.src = icons[id].dataUrl;
  img.draggable = false;
  wrap.appendChild(img);
  const del = document.createElement('button');
  del.className = 'remove-icon';
  del.textContent = '×';
  del.addEventListener('click', e => { e.stopPropagation(); removeIconFromSlot(key, idx); });
  wrap.appendChild(del);
  return wrap;
}

function refreshSlot(key) {
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) renderSlot(el, key);
}

function refreshAllSlots() {
  document.querySelectorAll('.cal-slot').forEach(el => renderSlot(el, el.dataset.key));
}

// ── SLOT OPERATIONS ────────────────────────────────────────────────────────
function dropIconIntoSlot(key, iconId) {
  if (!slots[key]) slots[key] = { icons: [] };
  const s = slots[key];

  if (s.icons.length === 0) {
    // Empty slot — just add the icon
    s.icons = [iconId];
  } else if (s.icons.length === 1) {
    // One icon already — auto-split to show both
    s.icons.push(iconId);
  } else {
    // Already two icons — replace the second
    s.icons[1] = iconId;
  }

  // Auto-derive split from icon count
  s.split = s.icons.length >= 2;

  refreshSlot(key);
  if (selectedSlot === key) updateInspector(key);
  saveToStorage();
}

function removeIconFromSlot(key, idx) {
  if (!slots[key]) return;
  slots[key].icons.splice(idx, 1);
  if (slots[key].icons.length === 0) {
    delete slots[key];
  } else {
    // Auto-update split based on remaining count
    slots[key].split = slots[key].icons.length >= 2;
  }
  refreshSlot(key);
  if (selectedSlot === key) updateInspector(key);
  saveToStorage();
}

function selectSlot(key) {
  selectedSlot = key;
  refreshAllSlots();
  updateInspector(key);
}

// ── INSPECTOR ──────────────────────────────────────────────────────────────
function updateInspector(key) {
  const inspector = document.getElementById('inspector');
  const [di, ri] = key.split('-').map(Number);
  const data = slots[key] || { icons: [], split: false };
  const iconCount = data.icons ? data.icons.length : 0;
  const labels = data.labels || [];

  const labelsHtml = labels.length > 0
    ? `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
        <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Events</div>
        ${labels.map(l => `<div style="font-size:10px;color:var(--text);line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l}</div>`).join('')}
       </div>`
    : '';

  inspector.innerHTML = `
    <div class="inspector-slot">
      <strong>${DAYS[di]}</strong> · ${ROWS[ri]}<br>
      Icons: ${iconCount} / 2
    </div>
    ${labelsHtml}
    <p style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.6;">
      ${iconCount === 0 ? 'Drop an icon into this slot.' : iconCount === 1 ? 'Drop a second icon to split the slot automatically.' : 'Slot is full. Remove an icon to make room.'}
    </p>
    <button class="btn btn-danger" id="clear-slot" style="margin-top:12px;width:100%;font-size:10px;">Clear Slot</button>
  `;
  document.getElementById('clear-slot').addEventListener('click', () => {
    delete slots[key]; refreshSlot(key); updateInspector(key); saveToStorage();
  });
}

// ── ICON LIBRARY ──────────────────────────────────────────────────────────
function addIcon(id, name, dataUrl) {
  // Check for duplicate by name (case-insensitive)
  const dupId = Object.keys(icons).find(k => icons[k].name.toLowerCase() === name.toLowerCase());
  if (dupId) {
    showToast(`Already in library: ${name}`);
    return null;
  }
  icons[id] = { name, dataUrl };
  renderIconGrid();
  saveToStorage();
  return id;
}

function renderIconGrid() {
  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';
  const entries = Object.entries(icons);
  if (entries.length === 0) {
    grid.innerHTML = '<p style="font-size:10px;color:var(--muted);line-height:1.6;grid-column:1/-1;">Search icons above or upload your own below.</p>';
    return;
  }
  entries.forEach(([id, icon]) => {
    const item = document.createElement('div');
    item.className = 'icon-item drag-handle';
    item.draggable = true;
    item.title = icon.name;
    const img = document.createElement('img');
    img.src = icon.dataUrl;
    item.appendChild(img);
    const name = document.createElement('div');
    name.className = 'icon-name';
    name.textContent = icon.name.replace(/\.[^.]+$/, '');
    item.appendChild(name);
    const del = document.createElement('button');
    del.className = 'icon-del';
    del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); deleteIcon(id); });
    item.appendChild(del);
    item.addEventListener('dragstart', () => { dragIconId = id; });
    item.addEventListener('dragend', () => { dragIconId = null; });
    grid.appendChild(item);
  });
}

function deleteIcon(id) {
  delete icons[id];
  Object.keys(slots).forEach(key => {
    if (slots[key].icons) {
      slots[key].icons = slots[key].icons.filter(i => i !== id);
      if (slots[key].icons.length === 0) delete slots[key];
    }
  });
  renderIconGrid();
  refreshAllSlots();
  saveToStorage();
}

// ── ICON SEARCH (Iconify API) ──────────────────────────────────────────────
function searchIcons(query) {
  const resultsEl = document.getElementById('search-results');
  const statusEl = document.getElementById('search-status');

  if (!query.trim()) {
    renderSearchResults(PRELOADED_ICONS.map(p => ({
      name: p.name,
      svgUrl: `https://api.iconify.design/${p.prefix}/${p.icon}.svg`,
      preloaded: true
    })), true);
    return;
  }

  statusEl.textContent = 'Searching...';
  resultsEl.innerHTML = '';

  // Iconify search API - searches across all icon sets, filter to colorful noto + fluent-emoji
  fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=40&prefixes=noto,fluent-emoji,twemoji,emojione`)
    .then(r => r.json())
    .then(data => {
      statusEl.textContent = '';
      if (!data.icons || data.icons.length === 0) {
        statusEl.textContent = 'No icons found. Try a different term.';
        return;
      }
      const results = data.icons.map(iconId => {
        const [prefix, ...nameParts] = iconId.split(':');
        const name = nameParts.join(':').replace(/-/g, ' ');
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          svgUrl: `https://api.iconify.design/${prefix}/${nameParts.join(':')}.svg`,
          iconId
        };
      });
      renderSearchResults(results, false);
    })
    .catch(() => {
      statusEl.textContent = 'Search failed. Check your connection.';
    });
}

function renderSearchResults(results, isPreloaded) {
  const resultsEl = document.getElementById('search-results');
  const statusEl = document.getElementById('search-status');
  resultsEl.innerHTML = '';
  if (isPreloaded) statusEl.textContent = 'Preloaded icons — or search above';
  else statusEl.textContent = `${results.length} results`;

  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.title = result.name;

    const img = document.createElement('img');
    img.src = result.svgUrl;
    img.alt = result.name;
    img.onerror = () => { item.style.display = 'none'; };
    item.appendChild(img);

    const label = document.createElement('div');
    label.className = 'search-result-label';
    label.textContent = result.name;
    item.appendChild(label);

    const addBtn = document.createElement('button');
    addBtn.className = 'search-add-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Add to library';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      addIconFromSvgUrl(result.svgUrl, result.name, addBtn);
    });
    item.appendChild(addBtn);

    // Also draggable directly from search into slots
    item.draggable = true;
    item.addEventListener('dragstart', () => {
      // Create a temp icon and drag it
      addIconFromSvgUrl(result.svgUrl, result.name, null, (id) => {
        dragIconId = id;
      });
    });
    item.addEventListener('dragend', () => { dragIconId = null; });

    resultsEl.appendChild(item);
  });
}

function addIconFromSvgUrl(svgUrl, name, btnEl, callback, silent = false) {
  if (btnEl) { btnEl.textContent = '…'; btnEl.disabled = true; }

  fetch(svgUrl)
    .then(r => r.text())
    .then(svgText => {
      // Render SVG to canvas via blob URL
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL('image/png');
        // Check duplicate by svgUrl
        const dupByUrl = Object.keys(icons).find(k => icons[k].svgUrl === svgUrl);
        if (dupByUrl) {
          if (btnEl) { btnEl.textContent = '✓'; btnEl.style.background = '#555'; btnEl.style.color = '#fff'; }
          showToast(`Already in library: ${name}`);
          if (callback) callback(dupByUrl);
          return;
        }
        const id = 'icon_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
        icons[id] = { name, dataUrl, svgUrl };
        renderIconGrid();
        saveToStorage();
        if (btnEl) { btnEl.textContent = '✓'; btnEl.style.background = 'var(--success)'; btnEl.style.color = '#000'; }
        if (callback) callback(id);
        if (!silent) showToast(`Added: ${name}`);
      };
      img.onerror = () => {
        if (btnEl) { btnEl.textContent = '!'; btnEl.disabled = false; }
        showToast('Failed to load icon');
      };
      img.src = url;
    })
    .catch(() => {
      if (btnEl) { btnEl.textContent = '+'; btnEl.disabled = false; }
      showToast('Network error. Check connection.');
    });
}

// ── FILE UPLOAD ────────────────────────────────────────────────────────────
function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        removeBg(canvas, ctx, bgMode);
        const id = 'icon_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
        const added = addIcon(id, file.name, canvas.toDataURL('image/png'));
        if (added) showToast('Added: ' + file.name.replace(/\.[^.]+$/, ''));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeBg(canvas, ctx, mode) {
  if (mode === 'none') return;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  let tR = 0, tG = 0, tB = 0;
  if (mode === 'auto') {
    const w = canvas.width, h = canvas.height;
    const corners = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]].map(([x,y]) => {
      const i=(y*w+x)*4; return [d[i],d[i+1],d[i+2]];
    });
    tR = Math.round(corners.reduce((s,c)=>s+c[0],0)/4);
    tG = Math.round(corners.reduce((s,c)=>s+c[1],0)/4);
    tB = Math.round(corners.reduce((s,c)=>s+c[2],0)/4);
  } else if (mode === 'black') { tR=0; tG=0; tB=0; }
  else if (mode === 'white') { tR=255; tG=255; tB=255; }
  const thresh = mode === 'white' ? 25 : 40;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.sqrt((d[i]-tR)**2+(d[i+1]-tG)**2+(d[i+2]-tB)**2);
    if (dist < thresh) { d[i]=255; d[i+1]=255; d[i+2]=255; }
  }
  ctx.putImageData(data, 0, 0);
}

// ── DRAW GRID (shared by export and preview) ──────────────────────────────
function drawGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  // Snap all lines to pixel boundaries to avoid anti-aliasing blur.
  // For even lineWidths: draw at whole pixels.
  // For odd lineWidths: offset by 0.5 so the center falls on a whole pixel.

  // Outer border (4px — even, no offset needed)
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, BMP_W - 4, BMP_H - 4);

  // Header bottom line (3px — odd, offset by 0.5)
  ctx.lineWidth = 3;
  const hdrY = Math.round(HDR_H) + 0.5;
  ctx.beginPath();
  ctx.moveTo(0, hdrY);
  ctx.lineTo(BMP_W, hdrY);
  ctx.stroke();

  // Column dividers (2px — even, no offset needed)
  ctx.lineWidth = 2;
  for (let i = 1; i < 7; i++) {
    const x = Math.round(i * COL_W);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BMP_H);
    ctx.stroke();
  }

  // Row dividers (1px — thin, offset by 0.5 to stay sharp)
  ctx.lineWidth = 1;
  for (let ri = 1; ri < 3; ri++) {
    const y = Math.round(HDR_H + ri * SLOT_H) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BMP_W, y);
    ctx.stroke();
  }

  ctx.restore();
}

// ── LABEL RENDERING (shared by export and preview) ────────────────────────
function drawLabels(ctx) {
  ctx.save();
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lineH = 11;
  const maxLabels = 3;

  for (let di = 0; di < 7; di++) {
    for (let ri = 0; ri < 3; ri++) {
      const key = `${di}-${ri}`;
      const data = slots[key];
      if (!data || !data.labels || data.labels.length === 0) continue;
      const labels = data.labels.slice(0, maxLabels);
      const hasIcons = data.icons && data.icons.length > 0;
      const x0 = di * COL_W + 3;
      const slotY = HDR_H + ri * SLOT_H;
      const textBlockH = labels.length * lineH;
      const y0 = hasIcons
        ? slotY + SLOT_H - textBlockH - 4
        : slotY + Math.floor((SLOT_H - textBlockH) / 2);

      labels.forEach((label, i) => {
        const ty = y0 + i * lineH;
        let text = label;
        const maxWidth = COL_W - 6;
        while (ctx.measureText(text).width > maxWidth && text.length > 1) {
          text = text.slice(0, -1);
        }
        if (text.length < label.length) text = text.slice(0, -1) + '\u2026';
        // White backing for readability
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x0 - 1, ty - 1, ctx.measureText(text).width + 3, lineH + 1);
        ctx.fillStyle = '#000000';
        ctx.fillText(text, x0, ty);
      });
    }
  }
  ctx.restore();
}

// ── BMP EXPORT ─────────────────────────────────────────────────────────────
async function exportBMP() {
  showToast('Rendering...');
  const canvas = document.createElement('canvas');
  canvas.width = BMP_W; canvas.height = BMP_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BMP_W, BMP_H);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  DAYS.forEach((day, i) => ctx.fillText(day, i * COL_W + COL_W / 2, HDR_H / 2));

  const loadImg = src => new Promise(res => {
    const img = new Image(); img.onload = ()=>res(img); img.onerror=()=>res(null); img.src=src;
  });

  for (let di = 0; di < 7; di++) {
    for (let ri = 0; ri < 3; ri++) {
      const key = `${di}-${ri}`;
      const data = slots[key];
      if (!data || !data.icons || data.icons.length === 0) continue;
      const x0 = di * COL_W + 2, y0 = HDR_H + ri * SLOT_H + 2;
      const cw = COL_W - 4, ch = SLOT_H - 4;
      if (data.split && data.icons.length >= 2) {
        const hw = Math.floor(cw / 2);
        for (let k = 0; k < 2; k++) {
          const img = await loadImg(icons[data.icons[k]]?.dataUrl);
          if (!img) continue;
          const s = fitInBox(img.width, img.height, hw-4, ch-4);
          ctx.drawImage(img, x0+k*hw+Math.floor((hw-s.w)/2), y0+Math.floor((ch-s.h)/2), s.w, s.h);
        }
      } else {
        const img = await loadImg(icons[data.icons[0]]?.dataUrl);
        if (!img) continue;
        const s = fitInBox(img.width, img.height, cw-4, ch-4);
        ctx.drawImage(img, x0+Math.floor((cw-s.w)/2), y0+Math.floor((ch-s.h)/2), s.w, s.h);
      }
    }
  }

  // Event labels from Google Calendar sync
  drawLabels(ctx);

  // Grid lines — all solid black, drawn on top of icons and labels
  drawGrid(ctx);

  applyPaletteWithDither(ctx, canvas);
  const imageData = ctx.getImageData(0, 0, BMP_W, BMP_H);
  const bmpBytes = canvasToBMP(imageData, BMP_W, BMP_H);
  const blob = new Blob([bmpBytes], { type: 'image/bmp' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'waveshare_calendar.bmp'; a.click();
  URL.revokeObjectURL(url);
  showToast('BMP exported!');
}

function fitInBox(iw, ih, bw, bh) {
  const scale = Math.min(bw/iw, bh/ih, 1);
  return { w: Math.floor(iw*scale), h: Math.floor(ih*scale) };
}

function applyPaletteWithDither(ctx, canvas) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const w = canvas.width, h = canvas.height;
  const R = new Float32Array(w*h), G = new Float32Array(w*h), B = new Float32Array(w*h);
  for (let i = 0; i < w*h; i++) { R[i]=d[i*4]; G[i]=d[i*4+1]; B[i]=d[i*4+2]; }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y*w+x;
      const or=Math.max(0,Math.min(255,R[idx])), og=Math.max(0,Math.min(255,G[idx])), ob=Math.max(0,Math.min(255,B[idx]));
      const [nr,ng,nb] = nearestPalette(or,og,ob);
      d[idx*4]=nr; d[idx*4+1]=ng; d[idx*4+2]=nb; d[idx*4+3]=255;
      const er=or-nr, eg=og-ng, eb=ob-nb;
      if (x+1<w) { R[idx+1]+=er*7/16; G[idx+1]+=eg*7/16; B[idx+1]+=eb*7/16; }
      if (y+1<h) {
        if (x>0) { R[idx+w-1]+=er*3/16; G[idx+w-1]+=eg*3/16; B[idx+w-1]+=eb*3/16; }
        R[idx+w]+=er*5/16; G[idx+w]+=eg*5/16; B[idx+w]+=eb*5/16;
        if (x+1<w) { R[idx+w+1]+=er*1/16; G[idx+w+1]+=eg*1/16; B[idx+w+1]+=eb*1/16; }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function nearestPalette(r,g,b) {
  let best=null, bestDist=Infinity;
  for (const [pr,pg,pb] of PALETTE) {
    const d=(r-pr)**2+(g-pg)**2+(b-pb)**2;
    if (d<bestDist) { bestDist=d; best=[pr,pg,pb]; }
  }
  return best;
}

function canvasToBMP(imageData, w, h) {
  const rowSize = Math.floor((w*3+3)/4)*4;
  const pixelDataSize = rowSize*h;
  const fileSize = 54+pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  view.setUint8(0,0x42); view.setUint8(1,0x4D);
  view.setUint32(2,fileSize,true); view.setUint32(6,0,true); view.setUint32(10,54,true);
  view.setUint32(14,40,true); view.setInt32(18,w,true);
  view.setInt32(22,h,true); // positive = bottom-up
  view.setUint16(26,1,true); view.setUint16(28,24,true); view.setUint32(30,0,true);
  view.setUint32(34,pixelDataSize,true); view.setInt32(38,3780,true); view.setInt32(42,3780,true);
  view.setUint32(46,0,true); view.setUint32(50,0,true);
  const d = imageData.data;
  let offset = 54;
  for (let y = h-1; y >= 0; y--) { // bottom-up row order
    for (let x = 0; x < w; x++) {
      const src = (y*w+x)*4;
      view.setUint8(offset++,d[src+2]); view.setUint8(offset++,d[src+1]); view.setUint8(offset++,d[src]);
    }
    const pad = rowSize-w*3;
    for (let p = 0; p < pad; p++) view.setUint8(offset++,0);
  }
  return buf;
}

// ── STORAGE ────────────────────────────────────────────────────────────────
function saveToStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ icons, slots });
    } else {
      localStorage.setItem('waveshare_icons', JSON.stringify(icons));
      localStorage.setItem('waveshare_slots', JSON.stringify(slots));
    }
  } catch(e) { console.warn('Save failed:', e); }
}

function loadFromStorage(cb) {
  const apply = (li, ls) => {
    if (li) icons = li;
    if (ls) slots = ls;
    renderIconGrid();
    refreshAllSlots();
    if (cb) cb();
  };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['icons','slots'], r => apply(r.icons, r.slots));
    } else {
      const i = localStorage.getItem('waveshare_icons');
      const s = localStorage.getItem('waveshare_slots');
      apply(i?JSON.parse(i):null, s?JSON.parse(s):null);
    }
  } catch(e) { if (cb) cb(); }
}

// ── EVENT BINDING ──────────────────────────────────────────────────────────
function bindEvents() {
  // Search
  const searchInput = document.getElementById('icon-search');
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchIcons(e.target.value), 400);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(searchTimeout); searchIcons(e.target.value); }
  });
  document.getElementById('search-btn').addEventListener('click', () => {
    searchIcons(searchInput.value);
  });

  // Upload
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => handleFiles(e.target.files));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor='var(--accent)'; });
  zone.addEventListener('dragleave', () => zone.style.borderColor='');
  zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor=''; handleFiles(e.dataTransfer.files); });

  // BG mode
  document.querySelectorAll('.bg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bg-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bgMode = btn.dataset.mode;
    });
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', exportBMP);
  document.getElementById('btn-export2').addEventListener('click', exportBMP);

  // Preview toggle
  document.getElementById('btn-preview').addEventListener('click', togglePreview);

  // Save layout
  document.getElementById('btn-save-layout').addEventListener('click', saveLayout);
  document.getElementById('modal-save-confirm').addEventListener('click', confirmSaveLayout);
  document.getElementById('modal-save-cancel').addEventListener('click', () => {
    document.getElementById('modal-save').classList.remove('open');
  });
  document.getElementById('save-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSaveLayout();
    if (e.key === 'Escape') document.getElementById('modal-save').classList.remove('open');
  });

  // History
  document.getElementById('modal-history-close').addEventListener('click', () => {
    document.getElementById('modal-history').classList.remove('open');
  });

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    document.getElementById('modal-clear').classList.add('open');
  });
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-clear').classList.remove('open');
  });
  document.getElementById('modal-confirm').addEventListener('click', () => {
    slots = {}; refreshAllSlots(); saveToStorage();
    document.getElementById('modal-clear').classList.remove('open');
    showToast('Calendar cleared');
  });

  document.getElementById('btn-load').addEventListener('click', () => {
    openHistoryModal();
  });

  // API Key
  document.getElementById('btn-save-apikey').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { showToast('Enter an API key first'); return; }
    saveApiKey(key);
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-key-input').placeholder = 'Key saved \u2713';
    document.getElementById('btn-match-icons').disabled = false;
    showToast('API key saved');
  });

  document.getElementById('btn-match-icons').addEventListener('click', () => {
    loadApiKey(async apiKey => {
      if (!apiKey) { showToast('No API key set'); return; }
      const btn = document.getElementById('btn-match-icons');
      const statusEl = document.getElementById('ai-status');
      btn.disabled = true;
      statusEl.textContent = 'Matching\u2026';
      const matched = await autoMatchIcons(apiKey, msg => { statusEl.textContent = msg; });
      btn.disabled = false;
      statusEl.textContent = matched > 0 ? `\u2713 Matched ${matched} icon${matched !== 1 ? 's' : ''}` : 'No unmatched slots found';
      if (matched > 0) showToast(`Matched ${matched} icon${matched !== 1 ? 's' : ''} with AI`);
    });
  });

  // Google Calendar
  document.getElementById('btn-gcal').addEventListener('click', openGcalModal);
  document.getElementById('gcal-cancel').addEventListener('click', closeGcalModal);
  document.getElementById('gcal-sync-btn').addEventListener('click', () => gcalSync());
  document.getElementById('gcal-signout').addEventListener('click', async () => {
    await gcalSignOut();
    updateGcalSignedInState(false);
    showToast('Signed out of Google');
  });
  document.getElementById('modal-gcal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-gcal')) closeGcalModal();
  });
}



// ── E-PAPER PREVIEW ────────────────────────────────────────────────────────
async function togglePreview() {
  const btn = document.getElementById('btn-preview');
  const calWrap = document.querySelector('.calendar-wrap');
  const previewWrap = document.getElementById('epaper-preview-wrap');

  previewActive = !previewActive;

  if (previewActive) {
    btn.classList.add('active');
    btn.textContent = '↩ Back to Editor';
    calWrap.style.display = 'none';
    previewWrap.style.display = 'flex';
    btn.disabled = true;
    btn.textContent = '⏳ Rendering...';
    await renderEpaperPreview();
    btn.disabled = false;
    btn.textContent = '↩ Back to Editor';
  } else {
    btn.classList.remove('active');
    btn.textContent = '⬡ E-Paper Preview';
    calWrap.style.display = '';
    previewWrap.style.display = 'none';
  }
}

async function renderEpaperPreview() {
  const outputCanvas = document.getElementById('epaper-canvas');
  const ctx = outputCanvas.getContext('2d');

  // Build the full calendar render (same as export but no download)
  const canvas = document.createElement('canvas');
  canvas.width = BMP_W; canvas.height = BMP_H;
  const c = canvas.getContext('2d');

  // White background
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, BMP_W, BMP_H);

  // Day headers
  c.fillStyle = '#000000';
  c.font = 'bold 12px "Courier New", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  DAYS.forEach((day, i) => c.fillText(day, i * COL_W + COL_W / 2, HDR_H / 2));

  // Icons
  const loadImg = src => new Promise(res => {
    const img = new Image(); img.onload=()=>res(img); img.onerror=()=>res(null); img.src=src;
  });

  for (let di = 0; di < 7; di++) {
    for (let ri = 0; ri < 3; ri++) {
      const key = `${di}-${ri}`;
      const data = slots[key];
      if (!data || !data.icons || data.icons.length === 0) continue;
      const x0 = di * COL_W + 2, y0 = HDR_H + ri * SLOT_H + 2;
      const cw = COL_W - 4, ch = SLOT_H - 4;
      if (data.split && data.icons.length >= 2) {
        const hw = Math.floor(cw / 2);
        for (let k = 0; k < 2; k++) {
          const img = await loadImg(icons[data.icons[k]]?.dataUrl);
          if (!img) continue;
          const s = fitInBox(img.width, img.height, hw-4, ch-4);
          c.drawImage(img, x0+k*hw+Math.floor((hw-s.w)/2), y0+Math.floor((ch-s.h)/2), s.w, s.h);
        }
      } else {
        const img = await loadImg(icons[data.icons[0]]?.dataUrl);
        if (!img) continue;
        const s = fitInBox(img.width, img.height, cw-4, ch-4);
        c.drawImage(img, x0+Math.floor((cw-s.w)/2), y0+Math.floor((ch-s.h)/2), s.w, s.h);
      }
    }
  }

  // Event labels from Google Calendar sync
  drawLabels(c);

  // Grid lines — all solid black, drawn on top of icons and labels
  drawGrid(c);

  // Apply 7-color palette + dithering
  applyPaletteWithDither(c, canvas);

  // Map palette colors to realistic e-paper colors for display
  // Real e-paper colors look slightly muted/warm compared to pure RGB
  const epaperColorMap = {
    '0,0,0':       '#1a1a1a',    // black - slightly warm
    '255,255,255': '#f5f0e8',    // white - warm paper tone
    '0,170,0':     '#2d7a2d',    // green - slightly darker
    '0,0,255':     '#1a3fbf',    // blue - slightly deeper
    '255,0,0':     '#cc1a1a',    // red - slightly darker
    '255,255,0':   '#e8d800',    // yellow - slightly warm
    '255,128,0':   '#e06600',    // orange - slightly deeper
  };

  // Draw to output canvas with e-paper color simulation
  const imageData = c.getImageData(0, 0, BMP_W, BMP_H);
  const d = imageData.data;
  const outCtx = outputCanvas.getContext('2d');
  const outData = outCtx.createImageData(BMP_W, BMP_H);
  const od = outData.data;

  for (let i = 0; i < d.length; i += 4) {
    const key = `${d[i]},${d[i+1]},${d[i+2]}`;
    const mapped = epaperColorMap[key] || `#${d[i].toString(16).padStart(2,'0')}${d[i+1].toString(16).padStart(2,'0')}${d[i+2].toString(16).padStart(2,'0')}`;
    const r = parseInt(mapped.slice(1,3),16);
    const g = parseInt(mapped.slice(3,5),16);
    const b = parseInt(mapped.slice(5,7),16);
    od[i]=r; od[i+1]=g; od[i+2]=b; od[i+3]=255;
  }

  outCtx.putImageData(outData, 0, 0);

  // Add subtle e-paper texture overlay (very faint grain)
  outCtx.globalAlpha = 0.03;
  for (let y = 0; y < BMP_H; y += 2) {
    for (let x = (y % 4 === 0 ? 0 : 1); x < BMP_W; x += 2) {
      outCtx.fillStyle = '#000';
      outCtx.fillRect(x, y, 1, 1);
    }
  }
  outCtx.globalAlpha = 1.0;
}

// ── LAYOUT HISTORY ─────────────────────────────────────────────────────────
const MAX_HISTORY = 10;

function saveLayout() {
  const now = new Date();
  const autoName = now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
    + ' ' + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

  // Show name modal
  const modal = document.getElementById('modal-save');
  const input = document.getElementById('save-name-input');
  input.value = autoName;
  modal.classList.add('open');
  setTimeout(() => { input.select(); }, 100);
}

function confirmSaveLayout() {
  const input = document.getElementById('save-name-input');
  const name = input.value.trim() || new Date().toLocaleString();
  document.getElementById('modal-save').classList.remove('open');

  getHistory(history => {
    const entry = {
      id: 'layout_' + Date.now(),
      name,
      savedAt: Date.now(),
      slots: JSON.parse(JSON.stringify(slots))
    };
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    storeHistory(history);
    showToast('Layout saved: ' + name);
  });
}

function openHistoryModal() {
  getHistory(history => {
    const modal = document.getElementById('modal-history');
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (history.length === 0) {
      list.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0;">No saved layouts yet.<br>Hit "Save Layout" to create one.</p>';
    } else {
      history.forEach((entry, idx) => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'history-name';
        nameEl.textContent = entry.name;
        nameEl.contentEditable = true;
        nameEl.spellcheck = false;
        nameEl.addEventListener('blur', () => {
          entry.name = nameEl.textContent.trim() || entry.name;
          getHistory(h => {
            const i = h.findIndex(e => e.id === entry.id);
            if (i >= 0) { h[i].name = entry.name; storeHistory(h); }
          });
        });
        nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });

        const dateEl = document.createElement('div');
        dateEl.className = 'history-date';
        dateEl.textContent = new Date(entry.savedAt).toLocaleString('en-US', {
          month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
        });

        info.appendChild(nameEl);
        info.appendChild(dateEl);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn btn-primary';
        restoreBtn.style.fontSize = '10px';
        restoreBtn.style.padding = '5px 10px';
        restoreBtn.textContent = 'Restore';
        restoreBtn.addEventListener('click', () => {
          slots = JSON.parse(JSON.stringify(entry.slots));
          refreshAllSlots();
          saveToStorage();
          document.getElementById('modal-history').classList.remove('open');
          showToast('Restored: ' + entry.name);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.style.fontSize = '10px';
        delBtn.style.padding = '5px 10px';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          getHistory(h => {
            const filtered = h.filter(e => e.id !== entry.id);
            storeHistory(filtered);
            openHistoryModal();
          });
        });

        actions.appendChild(restoreBtn);
        actions.appendChild(delBtn);
        item.appendChild(info);
        item.appendChild(actions);
        list.appendChild(item);
      });
    }

    modal.classList.add('open');
  });
}

function getHistory(cb) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['layoutHistory'], r => cb(r.layoutHistory || []));
    } else {
      const h = localStorage.getItem('waveshare_history');
      cb(h ? JSON.parse(h) : []);
    }
  } catch(e) { cb([]); }
}

function storeHistory(history) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ layoutHistory: history });
    } else {
      localStorage.setItem('waveshare_history', JSON.stringify(history));
    }
  } catch(e) { console.warn('History save failed:', e); }
}

// ── AI ICON MATCHING ──────────────────────────────────────────────────────
function saveApiKey(key) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ anthropicApiKey: key });
    } else {
      localStorage.setItem('waveshare_apikey', key);
    }
  } catch(e) {}
}

function loadApiKey(cb) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['anthropicApiKey'], r => cb(r.anthropicApiKey || ''));
    } else {
      cb(localStorage.getItem('waveshare_apikey') || '');
    }
  } catch(e) { cb(''); }
}

function searchAndPlaceIcon(keyword, slotKey) {
  return new Promise(resolve => {
    fetch(`https://api.iconify.design/search?query=${encodeURIComponent(keyword)}&limit=3&prefixes=noto,fluent-emoji,twemoji`)
      .then(r => r.json())
      .then(data => {
        if (!data.icons || data.icons.length === 0) { resolve(false); return; }
        const iconId = data.icons[0];
        const [prefix, ...nameParts] = iconId.split(':');
        const name = nameParts.join(':').replace(/-/g, ' ');
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        const svgUrl = `https://api.iconify.design/${prefix}/${nameParts.join(':')}.svg`;
        addIconFromSvgUrl(svgUrl, displayName, null, id => {
          if (id) dropIconIntoSlot(slotKey, id);
          resolve(!!id);
        }, true); // silent — suppress per-icon toasts
      })
      .catch(() => resolve(false));
  });
}

async function autoMatchIcons(apiKey, onProgress) {
  const toProcess = Object.entries(slots).filter(([, data]) =>
    data.labels && data.labels.length > 0 && (!data.icons || data.icons.length === 0)
  );
  if (toProcess.length === 0) return 0;

  let matched = 0;
  for (const [key, data] of toProcess) {
    const title = data.labels[0];
    if (onProgress) onProgress(`Matching: ${title}\u2026`);
    try {
      const keyword = await getIconKeyword(title, apiKey);
      const ok = await searchAndPlaceIcon(keyword, key);
      if (ok) matched++;
    } catch(e) {
      console.warn('AI match failed for', title, e);
    }
  }
  return matched;
}

// ── TOAST ──────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── GOOGLE CALENDAR MODAL ──────────────────────────────────────────────────
function openGcalModal() {
  if (typeof chrome === 'undefined' || !chrome.identity) {
    showToast('Google Calendar requires the extension to be installed in Chrome.');
    return;
  }

  // Default week picker to current Monday
  const monday = getMondayOfWeek(new Date());
  document.getElementById('gcal-week-input').value = monday.toISOString().slice(0, 10);
  document.getElementById('gcal-status').textContent = '';

  // Check if a token is already cached (non-interactive)
  chrome.identity.getAuthToken({ interactive: false }, token => {
    const isSignedIn = !!(token && !chrome.runtime.lastError);
    updateGcalSignedInState(isSignedIn);
  });

  document.getElementById('modal-gcal').classList.add('open');
}

function closeGcalModal() {
  document.getElementById('modal-gcal').classList.remove('open');
  document.getElementById('gcal-status').textContent = '';
}

function updateGcalSignedInState(signedIn) {
  const signoutRow = document.getElementById('gcal-signout-row');
  const accountLabel = document.getElementById('gcal-account-label');
  const syncBtn = document.getElementById('gcal-sync-btn');
  signoutRow.style.display = signedIn ? '' : 'none';
  if (signedIn) accountLabel.textContent = 'Signed in to Google';
  syncBtn.textContent = signedIn ? 'Sync Week' : 'Sign in & Sync';
}

async function gcalSync() {
  const statusEl = document.getElementById('gcal-status');
  const dateStr = document.getElementById('gcal-week-input').value;
  const selectedDate = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const monday = getMondayOfWeek(selectedDate);

  statusEl.textContent = 'Signing in\u2026';
  document.getElementById('gcal-sync-btn').disabled = true;

  let token;
  try {
    token = await gcalGetToken(true);
  } catch (e) {
    statusEl.textContent = 'Sign-in cancelled or failed.';
    document.getElementById('gcal-sync-btn').disabled = false;
    return;
  }

  updateGcalSignedInState(true);
  statusEl.textContent = 'Fetching events\u2026';

  let events;
  try {
    events = await fetchWeekEvents(monday, token);
  } catch (e) {
    if (e.message === 'auth') {
      // Token stale — remove and retry once
      await new Promise(res => chrome.identity.removeCachedAuthToken({ token }, res));
      try {
        token = await gcalGetToken(true);
        events = await fetchWeekEvents(monday, token);
      } catch (e2) {
        statusEl.textContent = 'Authentication failed. Please try again.';
        document.getElementById('gcal-sync-btn').disabled = false;
        return;
      }
    } else {
      statusEl.textContent = 'Failed to fetch events. Check your connection.';
      document.getElementById('gcal-sync-btn').disabled = false;
      return;
    }
  }

  applyCalendarEvents(events, monday);
  const count = events.filter(e => e.status !== 'cancelled').length;
  statusEl.textContent = `\u2713 Synced ${count} event${count !== 1 ? 's' : ''}`;

  // Auto-run AI icon matching if an API key is saved
  loadApiKey(async apiKey => {
    if (apiKey) {
      const matched = await autoMatchIcons(apiKey, msg => { statusEl.textContent = msg; });
      statusEl.textContent = `\u2713 ${count} events \xb7 ${matched} icon${matched !== 1 ? 's' : ''} matched`;
    }
    document.getElementById('gcal-sync-btn').disabled = false;
    setTimeout(() => {
      closeGcalModal();
      showToast(`Synced ${count} events from Google Calendar`);
    }, 700);
  });
}

function applyCalendarEvents(events, weekMonday) {
  const slotLabels = mapEventsToSlots(events, weekMonday);

  // Clear existing labels from all slots
  Object.keys(slots).forEach(key => {
    if (slots[key]) delete slots[key].labels;
  });

  // Apply new labels; create slot entry if needed
  Object.entries(slotLabels).forEach(([key, labels]) => {
    if (!slots[key]) slots[key] = { icons: [] };
    slots[key].labels = labels;
  });

  refreshAllSlots();
  saveToStorage();
}
