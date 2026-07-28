// LoreGraph — 3D Bookshelf (WebGL)
//
// A walnut library wall of cloth-bound volumes, rebuilt from the Ovid reader's
// 3-D closet but native to LoreGraph: no bundler, no react-three-fiber. `three`
// is loaded as a UMD global (window.THREE) exactly like React/Babel are, and the
// whole scene is driven imperatively inside one useEffect.
//
//   · Spine thickness scales with book length (tokens), like real shelves.
//   · Each spine is a cloth field with gold hub-rules and vertical typesetting,
//     coloured from the same coverTone palette as the flat 2-D shelf.
//   · Drag pans, wheel zooms (a wall you roam, not an orbit).
//   · Click a volume: it lifts off the shelf and turns to show its cover
//     (the real public-domain scan, loaded on demand) with an info panel.
//
// ViewLibrary picks this component for the "shelf" view mode when WebGL is
// available, and falls back to the 2-D CSS shelf otherwise (see __lgHasWebGL).

// ---- WebGL capability probe (ViewLibrary calls this to choose 3D vs 2D) ----
window.__lgHasWebGL = function () {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
};

// Binding palette by coverTone — a superset of the flat shelf's SPINE_PALETTE so
// every tone in the data (incl. moss / yellow / deep) has a binding.
//
//   bg      the covering material's dye
//   fg      gilt used for stamped lettering
//   accent  gilt used for rules and tooling
//   label   the lettering piece: a contrasting morocco panel glued into one
//           compartment of the spine, which is where the title is stamped on a
//           real hand-bound book (rather than running the full height)
//   mat     which covering material the volume is bound in
const SHELF3D_PALETTE = {
  ink:    { bg: "#1a1714", fg: "#d9b467", accent: "#b8954a", label: "#5c1f18", mat: "leather" },
  dark:   { bg: "#221d18", fg: "#d9b467", accent: "#a08758", label: "#1f2e1c", mat: "leather" },
  gold:   { bg: "#8a6e36", fg: "#fbf7ea", accent: "#f0d6ad", label: "#2a1a12", mat: "cloth"   },
  rust:   { bg: "#6b2d22", fg: "#f0d6ad", accent: "#d1ac5e", label: "#1d1410", mat: "leather" },
  indigo: { bg: "#2b3056", fg: "#f0d6ad", accent: "#d1ac5e", label: "#5c1f18", mat: "leather" },
  cream:  { bg: "#d4c5a0", fg: "#f4e6c4", accent: "#8a6e36", label: "#3a2418", mat: "cloth"   },
  deep:   { bg: "#152133", fg: "#d9b467", accent: "#b8954a", label: "#5c1f18", mat: "leather" },
  moss:   { bg: "#3a4a25", fg: "#e8e0c4", accent: "#b8954a", label: "#241407", mat: "cloth"   },
  yellow: { bg: "#b0862f", fg: "#f7ecd0", accent: "#f7ecd0", label: "#2a1a0c", mat: "cloth"   },
};

// ---------- covering materials ----------
// Three greyscale, seamlessly tiling macro scans: binding buckram, goatskin
// morocco, and the fore-edge of a page block. They are greyscale on purpose —
// each volume tints the same sheet through its own dye, so one small asset set
// dresses the whole library. Loaded once, lazily, and composited into the spine
// canvases; until they arrive the shelf renders the flat procedural weave.
const MATERIAL_SRC = {
  cloth: "assets/materials/bookcloth.webp",
  leather: "assets/materials/leather.webp",
  pageedge: "assets/materials/pageedge.webp",
  walnut: "assets/materials/walnut.webp",
  marbled: "assets/materials/marbled.webp",
};
const LG_MATS = { cloth: null, leather: null, pageedge: null, walnut: null, marbled: null, loaded: false };
let matsPromise = null;
function loadMaterials() {
  if (matsPromise) return matsPromise;
  matsPromise = Promise.all(
    Object.entries(MATERIAL_SRC).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { LG_MATS[key] = img; resolve(); };
      img.onerror = () => resolve();      // fall back to the procedural weave
      img.src = src;
    }))
  ).then(() => { LG_MATS.loaded = true; return LG_MATS; });
  return matsPromise;
}

// Paint a greyscale material sheet over the already-dyed ground. `overlay`
// keeps the dye's hue and lets the weave supply only light and shade, which is
// how a dyed cloth actually behaves.
function paintMaterial(g, img, W, H, scale, alpha) {
  if (!img) return;
  const pat = g.createPattern(img, "repeat");
  if (!pat) return;
  const m = (typeof DOMMatrix === "function") ? new DOMMatrix() : null;
  if (m && pat.setTransform) pat.setTransform(m.scale(scale, scale));
  g.save();
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = alpha;
  g.fillStyle = pat;
  if (m && pat.setTransform) {
    g.fillRect(0, 0, W, H);
  } else {
    // No setTransform support: scale the context instead.
    g.scale(scale, scale);
    g.fillRect(0, 0, W / scale, H / scale);
  }
  g.restore();
}

// Scene proportions (world units; BOOK_HEIGHT = 1 is the reference).
const S3D = {
  BOOK_HEIGHT: 1.0,
  BOOK_DEPTH: 0.62,
  GAP: 0.014,          // air between neighbouring spines
  PLANK_T: 0.09,       // shelf board thickness
  AIR: 0.15,           // clearance above the books in a bay
  // Fore-edge is the brightest paper we show; the TOP edge is deliberately
  // dustier. Lower rows are seen from above, and a bright top edge there reads
  // as a glaring white wedge — the single ugliest thing in the first pass.
  PAGE_CREAM: "#d6cbb0",
  PAGE_TOP: "#ab9e83",
  WOOD: "#3a2a1c",
  WOOD_DARK: "#241a12",
  GOLD: "#d1ac5e",
};
S3D.ROW_HEIGHT = S3D.BOOK_HEIGHT + S3D.PLANK_T + S3D.AIR;

// Spine thickness (X) from token count — sqrt so epics look fat without dwarfing
// short plays. Clamped to a sane physical range.
function spineThickness(tokens) {
  const t = tokens || 40000;
  return Math.max(0.075, Math.min(0.34, 0.085 + Math.sqrt(t / 200000) * 0.135));
}

function paletteFor(book) {
  return SHELF3D_PALETTE[book.coverTone] || SHELF3D_PALETTE.ink;
}

// ---------- canvas texture helpers ----------

const CJK_RE = /[⺀-鿿　-ヿ豈-﫿＀-￯]/;

// Draw a title running the length of a tall, narrow spine canvas. CJK stacks
// upright (like the flat shelf's writing-mode: vertical-rl); Latin rotates 90°.
function drawSpineTitle(g, text, W, top, bottom, font, color, usableW) {
  const midX = W / 2;
  const span = bottom - top;
  W = usableW || W;
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (CJK_RE.test(text)) {
    const chars = Array.from(text);
    let size = Math.min(W * 0.62, 34);
    let step = size * 1.04;
    // shrink until the column fits
    while (chars.length * step > span && size > 12) {
      size -= 1;
      step = size * 1.04;
    }
    const maxChars = Math.floor(span / step);
    const shown = chars.slice(0, maxChars);
    g.font = `500 ${size}px ${font}`;
    let y = top + step / 2;
    for (const ch of shown) {
      g.fillText(ch, midX, y);
      y += step;
    }
    if (shown.length < chars.length) g.fillText("…", midX, Math.min(y, bottom - step / 2));
  } else {
    g.save();
    g.translate(midX, (top + bottom) / 2);
    g.rotate(-Math.PI / 2);
    let size = Math.min(W * 0.5, 26);
    g.font = `italic 500 ${size}px ${font}`;
    // ellipsize to the available length
    let s = text;
    if (g.measureText(s).width > span * 0.94) {
      while (s.length > 1 && g.measureText(s + "…").width > span * 0.94) s = s.slice(0, -1);
      s = s.replace(/[\s,:;.]+$/, "") + "…";
    }
    g.fillText(s, 0, 0);
    g.restore();
  }
}

// A hand-bound spine, following the construction of a real 19th-century volume
// rather than "title printed down a coloured strip":
//
//   headband ─ woven silk cord at head and tail
//   raised bands ─ the sewing cords under the covering, standing proud and
//                  dividing the spine into compartments, each flanked by a
//                  gilt rule (the finisher's convention)
//   lettering piece ─ a contrasting morocco label in the second compartment,
//                     gilt-stamped with the title, extended across two
//                     compartments when the title is too long for one
//   tooling ─ a small gilt tool centred in a spare compartment
//   imprint ─ author, then the date, in the lower compartments
//
// Returns { canvas, redraw }; redraw() is re-run once webfonts and the covering
// material scans have loaded.
function makeSpineCanvas(book, locale) {
  const pal = paletteFor(book);
  const thick = spineThickness(book.tokens);
  const W = Math.max(56, Math.round(512 * (thick / S3D.BOOK_HEIGHT)));
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");

  const serif = "'Spectral', 'Noto Serif SC', 'Noto Serif JP', serif";
  const mono = "'JetBrains Mono', monospace";
  const title = (window.bookTitle ? window.bookTitle(book, locale) : book.title) || book.title || "";
  const author = (window.bookAuthor ? window.bookAuthor(book, locale) : book.author) || book.author || "";
  const hair = Math.max(0.9, W * 0.011);      // gilt hairline weight
  const inset = Math.max(4, W * 0.1);         // side margin for tooling

  // A gilt that shifts across the rounded spine, so leaf catches the light in
  // the centre and dulls at the joints instead of reading as flat yellow.
  function giltFill(bright) {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, pal.accent);
    gr.addColorStop(0.42, bright || pal.fg);
    gr.addColorStop(0.62, bright || pal.fg);
    gr.addColorStop(1, pal.accent);
    return gr;
  }

  function giltRule(y) {
    g.strokeStyle = giltFill();
    g.lineWidth = hair;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(inset, y);
    g.lineTo(W - inset, y);
    g.stroke();
    g.globalAlpha = 1;
  }

  // A raised band: the cord stands proud, so it takes a highlight on its upper
  // slope and throws a shade below, with a gilt rule on either side.
  function drawBand(cy) {
    const h = Math.max(7, W * 0.13);
    const top = cy - h / 2;
    const gr = g.createLinearGradient(0, top, 0, top + h);
    gr.addColorStop(0, "rgba(0,0,0,0.34)");
    gr.addColorStop(0.24, "rgba(255,255,255,0.20)");
    gr.addColorStop(0.55, "rgba(255,255,255,0.07)");
    gr.addColorStop(1, "rgba(0,0,0,0.40)");
    g.fillStyle = gr;
    g.fillRect(0, top, W, h);
    giltRule(top - hair * 2.2);
    giltRule(top + h + hair * 2.2);
  }

  // The head and tail of the spine, where the covering is turned in over the
  // board. What you actually read at shelf distance is a soft dark cap, not the
  // headband: an alternating floss bead drawn at this scale turns eighty-five
  // volumes into eighty-five dashed white lines, which is noise, not detail.
  function drawCap(y0, h, fromTop) {
    const sh = g.createLinearGradient(0, fromTop ? y0 : y0 + h, 0, fromTop ? y0 + h : y0);
    sh.addColorStop(0, "rgba(0,0,0,0.62)");
    sh.addColorStop(0.55, "rgba(0,0,0,0.22)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh;
    g.fillRect(0, y0, W, h);
  }

  // The lettering piece — a separate skin glued into the compartment.
  function drawLabel(y0, y1) {
    const x0 = inset * 0.72, x1 = W - inset * 0.72;
    g.fillStyle = pal.label;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    // rounded-back shading across the piece
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.40)");
    gr.addColorStop(0.45, "rgba(255,255,255,0.10)");
    gr.addColorStop(1, "rgba(0,0,0,0.44)");
    g.fillStyle = gr;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    // the edge of the leather, then a gilt fillet inside it
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = hair;
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = giltFill();
    g.globalAlpha = 0.85;
    const p = Math.max(2.5, W * 0.05);
    g.strokeRect(x0 + p, y0 + p, x1 - x0 - p * 2, y1 - y0 - p * 2);
    g.globalAlpha = 1;
    return { x0, x1, pad: p };
  }

  // A small gilt tool: a lozenge with four radiating buds.
  function drawTool(cy) {
    const r = Math.min(W * 0.17, 11);
    g.save();
    g.translate(W / 2, cy);
    g.strokeStyle = giltFill();
    g.fillStyle = giltFill();
    g.lineWidth = hair;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(0, -r); g.lineTo(r * 0.62, 0); g.lineTo(0, r); g.lineTo(-r * 0.62, 0);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.arc(0, 0, Math.max(1.1, r * 0.16), 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.restore();
  }

  // Will the title sit inside `span` px of compartment?
  function titleFits(span) {
    if (CJK_RE.test(title)) {
      const size = Math.min((W - inset * 2.4) * 0.62, 34);
      return Array.from(title).length * size * 1.04 <= span;
    }
    g.font = `italic 500 ${Math.min((W - inset * 2.4) * 0.5, 26)}px ${serif}`;
    return g.measureText(title).width <= span * 0.94;
  }

  function redraw() {
    g.clearRect(0, 0, W, H);

    // 1 — the dye, then the covering material, then the rounded back
    g.fillStyle = pal.bg;
    g.fillRect(0, 0, W, H);
    const sheet = pal.mat === "leather" ? LG_MATS.leather : LG_MATS.cloth;
    if (sheet) {
      // ~50 threads across the spine is about right for binding buckram
      paintMaterial(g, sheet, W, H, W / sheet.width, pal.mat === "leather" ? 0.62 : 0.8);
    } else {
      g.globalAlpha = 0.06;
      for (let y = 0; y < H; y += 3) {
        g.fillStyle = y % 6 === 0 ? "#ffffff" : "#000000";
        g.fillRect(0, y, W, 1);
      }
      g.globalAlpha = 1;
    }
    // Only the joints are painted now — a narrow darkening where the covering
    // turns onto the boards. The body of the shading comes from the geometry and
    // the lamps; painting a full centre-light/edge-dark ramp on top of a curved
    // mesh double-counts the curvature and turns the volume into a tube.
    const joint = g.createLinearGradient(0, 0, W, 0);
    joint.addColorStop(0, "rgba(0,0,0,0.40)");
    joint.addColorStop(0.1, "rgba(0,0,0,0.06)");
    joint.addColorStop(0.5, "rgba(255,255,255,0.02)");
    joint.addColorStop(0.9, "rgba(0,0,0,0.08)");
    joint.addColorStop(1, "rgba(0,0,0,0.44)");
    g.fillStyle = joint;
    g.fillRect(0, 0, W, H);

    // 2 — turned-in covering at head and tail
    const capH = Math.max(10, W * 0.16);
    drawCap(0, capH, true);
    drawCap(H - capH, capH, false);

    // 3 — three raised bands, which is both a common real binding and what
    //     leaves each compartment big enough to set legibly at this scale.
    //     A long title swallows the second compartment rather than shrinking
    //     into illegibility; it then gives up the author line to do so.
    const bands = [56, 262, 404];
    const extended = !titleFits(248 - 70 - 24);
    const labelTop = 70;
    const labelBot = extended ? 390 : 248;

    drawBand(bands[0]);
    if (!extended) drawBand(bands[1]);
    drawBand(bands[2]);

    // 4 — lettering piece + gilt title
    const lab = drawLabel(labelTop, labelBot);
    drawSpineTitle(
      g, title, W, labelTop + lab.pad + 6, labelBot - lab.pad - 6,
      serif, giltFill("#f6e4bb"), lab.x1 - lab.x0 - lab.pad * 2
    );

    // 5 — author in the second compartment. CJK sets vertically, the way it does
    //     on a real CJK spine, so a seven-character name has the compartment's
    //     full height to live in instead of being clipped to 「布拉姆·斯…」.
    if (author && !extended) {
      const top = 276, bot = 390;
      const cjkAuthor = CJK_RE.test(author);
      if (cjkAuthor) {
        const chars = Array.from(author);
        let size = Math.min(W * 0.4, 16);
        while (chars.length * size * 1.06 > bot - top && size > 8) size -= 0.5;
        g.fillStyle = giltFill();
        g.font = `${size}px ${serif}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        const step = size * 1.06;
        let y = (top + bot) / 2 - ((chars.length - 1) * step) / 2;
        for (const ch of chars) { g.fillText(ch, W / 2, y); y += step; }
      } else {
        g.save();
        g.translate(W / 2, (top + bot) / 2);
        g.rotate(-Math.PI / 2);
        g.fillStyle = giltFill();
        const room = (bot - top) * 0.94;
        let size = Math.min(W * 0.34, 14);
        g.font = `${size}px ${serif}`;
        let a = author;
        while (g.measureText(a).width > room && size > 8) {
          size -= 0.5; g.font = `${size}px ${serif}`;
        }
        if (g.measureText(a).width > room) {
          while (a.length > 1 && g.measureText(a + "…").width > room) a = a.slice(0, -1);
          a += "…";
        }
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(a, 0, 0);
        g.restore();
      }
    }

    // 6 — a small gilt tool and the date in the tail compartment
    const tailTop = 418, tailBot = H - capH;
    if (W >= 66) drawTool(tailTop + (tailBot - tailTop) * 0.3);
    if (book.year) {
      g.save();
      g.translate(W / 2, tailTop + (tailBot - tailTop) * 0.74);
      g.fillStyle = giltFill();
      g.globalAlpha = 0.82;
      g.font = `${Math.min(W * 0.2, 11)}px ${mono}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(book.year > 0 ? book.year : -book.year + " BC"), 0, 0);
      g.globalAlpha = 1;
      g.restore();
    }
  }

  redraw();
  return { canvas, redraw, W, H, thick };
}

// A typographic cloth cover — the on-shelf fallback and the placeholder shown
// while the real scan loads. Cloth ground, gold double-rule frame, title/author.
function makeCoverCanvas(book, locale, scan) {
  const pal = paletteFor(book);
  const W = 384, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");
  const serif = "'Spectral', 'Noto Serif SC', 'Noto Serif JP', serif";
  const mono = "'JetBrains Mono', monospace";

  g.fillStyle = pal.bg;
  g.fillRect(0, 0, W, H);
  const sheet = pal.mat === "leather" ? LG_MATS.leather : LG_MATS.cloth;
  if (sheet) paintMaterial(g, sheet, W, H, (W / sheet.width) * 1.6, pal.mat === "leather" ? 0.5 : 0.62);
  const vg = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(255,255,255,0.06)");
  vg.addColorStop(1, "rgba(0,0,0,0.34)");
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  // A real title-page scan is MOUNTED on the board, the way a plate is pasted
  // onto cloth — it is not stretched to the full face. Stretching it edge to
  // edge distorted every scan to the board's proportions and, on a scan whose
  // shape differed from the board, showed only a crop of the middle.
  if (scan && scan.width && scan.height) {
    const boxW = W - 56, boxH = H - 56;
    const s = Math.min(boxW / scan.width, boxH / scan.height);
    const dw = scan.width * s, dh = scan.height * s;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    g.save();
    g.shadowColor = "rgba(0,0,0,0.5)";
    g.shadowBlur = 10;
    g.shadowOffsetY = 3;
    g.fillStyle = "#00000030";
    g.fillRect(dx, dy, dw, dh);
    g.restore();
    g.drawImage(scan, dx, dy, dw, dh);
    // sepia unification + a gilt fillet around the mounted plate, matching the
    // treatment the 2-D covers already use so the shelf reads as one collection
    g.save();
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.16;
    g.fillStyle = "#8a6e36";
    g.fillRect(dx, dy, dw, dh);
    g.restore();
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 1;
    g.strokeRect(dx - 0.5, dy - 0.5, dw + 1, dh + 1);
    g.strokeStyle = pal.accent;
    g.globalAlpha = 0.8;
    g.lineWidth = 1.2;
    g.strokeRect(dx - 5, dy - 5, dw + 10, dh + 10);
    g.globalAlpha = 1;
    return canvas;
  }

  g.strokeStyle = pal.accent;
  g.lineWidth = 2;
  g.strokeRect(26, 26, W - 52, H - 52);
  g.lineWidth = 1;
  g.strokeRect(36, 36, W - 72, H - 72);

  g.fillStyle = pal.accent;
  g.font = `13px ${mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const typeLabel = (window.t ? window.t("work.type." + (book.type || "novel"), locale) : (book.type || "novel"));
  g.fillText((typeLabel || "").toString().toUpperCase(), W / 2, 76);

  // title, wrapped
  const title = (window.bookTitle ? window.bookTitle(book, locale) : book.title) || book.title || "";
  const cjk = CJK_RE.test(title);
  let size = cjk ? 40 : 34;
  g.fillStyle = pal.fg;
  const wrap = (text, maxW, fontSize) => {
    g.font = `italic 500 ${fontSize}px ${serif}`;
    const words = cjk ? Array.from(text) : text.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const trial = cjk ? cur + w : (cur ? cur + " " + w : w);
      if (g.measureText(trial).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = trial;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  let lines = wrap(title, W - 96, size);
  while (lines.length > 4 && size > 20) { size -= 3; lines = wrap(title, W - 96, size); }
  g.font = `italic 500 ${size}px ${serif}`;
  const lh = size * 1.16;
  let y = H / 2 - ((lines.length - 1) * lh) / 2 - 10;
  for (const ln of lines) { g.fillText(ln, W / 2, y); y += lh; }

  g.strokeStyle = pal.accent;
  g.globalAlpha = 0.7;
  g.beginPath();
  g.moveTo(W / 2 - 60, y + 2);
  g.lineTo(W / 2 + 60, y + 2);
  g.stroke();
  g.globalAlpha = 1;

  const author = (window.bookAuthor ? window.bookAuthor(book, locale) : book.author) || book.author || "";
  g.fillStyle = pal.fg;
  g.font = `${cjk ? 17 : 15}px ${serif}`;
  g.fillText(author, W / 2, y + 30);

  if (book.year) {
    g.fillStyle = pal.accent;
    g.font = `12px ${mono}`;
    g.globalAlpha = 0.75;
    g.fillText(String(book.year > 0 ? book.year : -book.year + " BC"), W / 2, H - 60);
    g.globalAlpha = 1;
  }
  return canvas;
}

// Warm walnut grain for the case (back panel, planks, posts).
function makeWoodCanvas(dark) {
  const W = 512, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");
  g.fillStyle = dark ? S3D.WOOD_DARK : S3D.WOOD;
  g.fillRect(0, 0, W, H);
  // Long vertical grain streaks. These are pushed well past "subtle": at the
  // distance the shelf is viewed from, low-contrast grain averages out to a
  // flat brown smear and all the walnut character is lost.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor((i * 53.7) % W);
    const shade = (i * 71) % 100 < 50;
    g.strokeStyle = shade ? "rgba(255,214,158,0.16)" : "rgba(0,0,0,0.30)";
    g.lineWidth = 1 + ((i * 31) % 4);
    g.beginPath();
    const drift = ((i * 17) % 26) - 13;
    g.moveTo(x, 0);
    g.bezierCurveTo(x + drift, H * 0.33, x - drift, H * 0.66, x + drift / 2, H);
    g.stroke();
  }
  // cathedral bands + knots
  for (let i = 0; i < 10; i++) {
    const y = (i * 97) % H;
    g.strokeStyle = i % 3 === 0 ? "rgba(255,206,150,0.10)" : "rgba(0,0,0,0.26)";
    g.lineWidth = 2 + (i % 3);
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(W * 0.3, y + 14, W * 0.7, y - 14, W, y + 6);
    g.stroke();
  }
  return canvas;
}

// ---------- book geometry ----------
// A hardcover is not a cube. It has a ROUNDED BACK — the spine is a shallow
// cylinder, not a flat face — the fore-edge corners are radiused, and the head
// and tail are chamfered where the covering turns in. A BoxGeometry gives eight
// razor edges and reads as a brick; at shelf distance that is the single loudest
// "this is CG" tell.
//
// Built as a profile in the XZ plane swept up Y in four rings (chamfer, body,
// body, chamfer). Material groups match BoxGeometry's face order exactly
//   0:+X front board · 1:-X back board · 2:+Y head · 3:-Y tail · 4:+Z spine · 5:-Z fore-edge
// so the existing material array drops straight in.
function makeBookGeometry(THREE, w, h, d, rounded) {
  const CORNER_SEG = 4;          // segments per radiused fore-edge corner
  const cornerR = Math.min(w * 0.3, d * 0.05, 0.02);
  const chamfer = Math.min(w * 0.22, 0.012);
  // A rounded back is a SHALLOW swell — about a tenth of the spine's width. The
  // first pass used a third, and the spine canvas already paints its own
  // centre-light/edge-dark shading, so the two curvatures compounded and every
  // volume read as a tube. Square-backed cloth bindings are just as authentic,
  // so only the leather ones are rounded; that also breaks up the row.
  const bulge = rounded ? Math.min(w * 0.11, 0.015) : 0;
  const SPINE_SEG = rounded ? 12 : 1;

  const zBase = d / 2 - bulge;
  const R = bulge > 0 ? (bulge * bulge + (w / 2) * (w / 2)) / (2 * bulge) : 0;
  const cz = zBase + bulge - R;

  // profile: [{x, z, mat}] — mat applies to the segment starting at this point
  const P = [];
  for (let i = 0; i <= SPINE_SEG; i++) {
    const x = w / 2 - (w * i) / SPINE_SEG;
    P.push({ x, z: bulge > 0 ? cz + Math.sqrt(Math.max(R * R - x * x, 0)) : d / 2, mat: 4 });
  }
  P.push({ x: -w / 2, z: -d / 2 + cornerR, mat: 1 });          // back board
  for (let i = 1; i <= CORNER_SEG; i++) {                       // corner
    const a = (Math.PI / 2) * (i / CORNER_SEG);
    P.push({
      x: -w / 2 + cornerR * (1 - Math.cos(a)),
      z: -d / 2 + cornerR * (1 - Math.sin(a)),
      mat: 5,
    });
  }
  P.push({ x: w / 2 - cornerR, z: -d / 2, mat: 5 });            // fore-edge
  for (let i = 1; i <= CORNER_SEG; i++) {
    const a = (Math.PI / 2) * (i / CORNER_SEG);
    P.push({
      x: w / 2 - cornerR * (1 - Math.sin(a)),
      z: -d / 2 + cornerR * (1 - Math.cos(a)),
      mat: 0,
    });
  }
  P.push({ x: w / 2, z: zBase, mat: 0 });                       // front board

  const rings = [
    { y: -h / 2, k: 1 - (2 * chamfer) / w, kz: 1 - (2 * chamfer) / d },
    { y: -h / 2 + chamfer, k: 1, kz: 1 },
    { y: h / 2 - chamfer, k: 1, kz: 1 },
    { y: h / 2, k: 1 - (2 * chamfer) / w, kz: 1 - (2 * chamfer) / d },
  ];

  const pos = [], uv = [], idx = [];
  const ringStart = [];
  rings.forEach((r) => {
    ringStart.push(pos.length / 3);
    P.forEach((p) => {
      pos.push(p.x * r.k, r.y, p.z * r.kz);
      // u runs with +x on the spine and fore-edge, with z elsewhere; v up Y.
      const u = (p.mat === 4 || p.mat === 5)
        ? (p.x + w / 2) / w
        : (p.z + d / 2) / d;
      uv.push(u, (r.y + h / 2) / h);
    });
  });

  // Side walls, grouped by the material of each profile segment.
  const groups = [];
  const n = P.length;
  for (let s = 0; s < n - 1; s++) {
    const mat = P[s].mat;
    const startIdx = idx.length;
    for (let r = 0; r < rings.length - 1; r++) {
      const a = ringStart[r] + s, b = ringStart[r] + s + 1;
      const c = ringStart[r + 1] + s + 1, e = ringStart[r + 1] + s;
      idx.push(a, c, b, a, e, c);
    }
    groups.push({ start: startIdx, count: idx.length - startIdx, mat });
  }

  // Head and tail caps, fanned from the profile centroid.
  [{ ring: rings.length - 1, mat: 2, up: true }, { ring: 0, mat: 3, up: false }].forEach((cap) => {
    const base = pos.length / 3;
    const y = rings[cap.ring].y;
    pos.push(0, y, 0);
    uv.push(0.5, 0.5);
    for (const p of P) {
      pos.push(p.x * rings[cap.ring].k, y, p.z * rings[cap.ring].kz);
      uv.push((p.x + w / 2) / w, (p.z + d / 2) / d);
    }
    const startIdx = idx.length;
    for (let s = 0; s < n - 1; s++) {
      if (cap.up) idx.push(base, base + 2 + s, base + 1 + s);
      else        idx.push(base, base + 1 + s, base + 2 + s);
    }
    groups.push({ start: startIdx, count: idx.length - startIdx, mat: cap.mat });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // Merge adjacent runs that share a material to keep the draw-call count down.
  groups.sort((a, b) => a.mat - b.mat || a.start - b.start);
  let cur = null;
  const merged = [];
  for (const g of groups) {
    if (cur && cur.mat === g.mat && cur.start + cur.count === g.start) cur.count += g.count;
    else { cur = { ...g }; merged.push(cur); }
  }
  merged.forEach((g) => geo.addGroup(g.start, g.count, g.mat));
  geo.computeVertexNormals();
  return geo;
}

// ---------- shelf packing ----------
// Books flow left→right into rows. Two things matter here:
//
//  1. Row COUNT tracks the viewport's shape rather than aiming for a square
//     wall. A tall wall is what forced the camera into a raking angle on the
//     far rows (staring down at the bottom shelf) and left dead dark bands to
//     the left and right of a letterboxed viewport.
//  2. Books are distributed by CUMULATIVE width into exactly `rowCount` rows.
//     The old "start a new row once this one overflows" rule spilled the tail
//     into an extra row, which is why the last shelf held one lonely volume.
function packShelf(books, viewAspect) {
  const items = books.map((b) => ({ book: b, w: spineThickness(b.tokens) }));
  const total = items.reduce((s, it) => s + it.w + S3D.GAP, 0);

  // Target a wall WIDER than the viewport. The camera then fills the frame on
  // height — so the cabinet is complete top to bottom, with no shelf clipped
  // mid-volume — and the overflow runs off the sides, where panning left/right
  // is how you read a real shelf anyway. Spines also stay tall and legible.
  const aspect = Math.max(1.0, Math.min((viewAspect || 1.6) * 1.45, 3.4));
  let rowCount = Math.round(Math.sqrt(total / (aspect * S3D.ROW_HEIGHT)));
  rowCount = Math.max(1, Math.min(rowCount, 6, items.length));

  const per = total / rowCount;
  const allRows = Array.from({ length: rowCount }, () => ({ items: [], width: 0 }));
  let cum = 0;
  for (const it of items) {
    const ri = Math.min(rowCount - 1, Math.floor(cum / per));
    allRows[ri].items.push(it);
    allRows[ri].width += it.w + S3D.GAP;
    cum += it.w + S3D.GAP;
  }
  const rows = allRows.filter((r) => r.items.length);
  rows.forEach((r) => { r.width -= S3D.GAP; });

  const wallWidth = Math.max(...rows.map((r) => r.width), 1);
  const wallHeight = rows.length * S3D.ROW_HEIGHT;
  const yTop = wallHeight / 2;

  const placed = [];
  rows.forEach((row, ri) => {
    const bookTop = yTop - ri * S3D.ROW_HEIGHT;
    const bookCenterY = bookTop - S3D.BOOK_HEIGHT / 2;
    const plankY = bookTop - S3D.BOOK_HEIGHT - S3D.PLANK_T / 2 - 0.006;
    let x = -row.width / 2;
    for (const it of row.items) {
      placed.push({
        book: it.book,
        w: it.w,
        x: x + it.w / 2,
        y: bookCenterY,
        rowIndex: ri,
      });
      x += it.w + S3D.GAP;
    }
    row.plankY = plankY;
    row.bookCenterY = bookCenterY;
  });

  return { placed, rows, wallWidth, wallHeight };
}

// ==================================================================
//  Component
// ==================================================================
function BookShelf3D({ books, activeId, ctx, onOpen }) {
  const { useState, useEffect, useRef, useMemo } = React;
  const { locale, tt, coverStyle } = ctx;
  const mountRef = useRef(null);
  const apiRef = useRef(null);           // imperative scene handle
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const [selected, setSelected] = useState(null);   // book object flown out

  // `books` (a filtered/sorted copy) is a fresh array on every render, so we
  // rebuild the scene only when the actual set/order of volumes changes — not
  // on every parent re-render. The active-book glow updates live via a ref.
  const booksKey = useMemo(() => books.map((b) => b.id).join("|"), [books]);
  const booksRef = useRef(books);
  booksRef.current = books;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Keep the RAF loop's notion of selection in a ref the effect can read.
  const selectRef = useRef(null);
  useEffect(() => {
    selectRef.current = selected ? selected.id : null;
    if (apiRef.current) apiRef.current.setSelected(selected ? selected.id : null);
  }, [selected]);

  useEffect(() => {
    const THREE = window.THREE;
    const mount = mountRef.current;
    if (!THREE || !mount) return;
    const books = booksRef.current;

    let width = mount.clientWidth || 800;
    let height = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#141110");
    scene.fog = new THREE.Fog("#141110", 9, 24);

    // A wider lens (was 42°) puts the camera closer for the same framing, so
    // the case has real perspective convergence and reads as a box you look
    // into — a long lens flattened the whole wall into a photo of spines.
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);

    // ---- lights: warm ambient + key (front-right) + cool-ish fill (left) ----
    // Ambient stays LOW on purpose. A bright even ambient wash is exactly what
    // flattens a scene like this: every face gets the same value and the whole
    // shelf reads as a photograph of spines. Form here comes from the key light
    // plus per-row lamps (added with the planks below) that fall off with
    // distance, so the fronts of the books are lit and the recess goes dark.
    scene.add(new THREE.AmbientLight("#f2e6d2", 0.2));
    scene.add(new THREE.HemisphereLight("#ffe4bb", "#120d09", 0.32));
    const key = new THREE.DirectionalLight("#ffe9c6", 0.8);
    key.position.set(3.2, 3.4, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#b9c6e0", 0.2);
    fill.position.set(-5, 0.5, 4.2);
    scene.add(fill);
    const warmPoint = new THREE.PointLight("#f4dcae", 0.5, 24, 2);
    warmPoint.position.set(0, 1.5, 5.5);
    scene.add(warmPoint);

    // ---- cabinet timber ----
    // Procedural fallback until the walnut scan lands. The scan then replaces it
    // per surface with the grain running the right way: up the back panel and the
    // posts, ALONG the length of every shelf board. The old procedural sheet drew
    // vertical streaks on every surface, so the boards read as corduroy.
    const woodTex = new THREE.CanvasTexture(makeWoodCanvas(false));
    woodTex.colorSpace = THREE.SRGBColorSpace;
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    const woodDarkTex = new THREE.CanvasTexture(makeWoodCanvas(true));
    woodDarkTex.colorSpace = THREE.SRGBColorSpace;
    woodDarkTex.wrapS = woodDarkTex.wrapT = THREE.RepeatWrapping;
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: "#8d6f4f", roughness: 0.62, metalness: 0.03 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ map: woodDarkTex, color: "#6a5137", roughness: 0.72, metalness: 0.02 });
    const goldMat = new THREE.MeshStandardMaterial({ color: S3D.GOLD, roughness: 0.4, metalness: 0.55, emissive: "#3a2c10", emissiveIntensity: 0.35 });

    const disposables = [woodTex, woodDarkTex, woodMat, woodDarkMat, goldMat];

    // Swap in the real timber once loaded. `rotate` turns the sheet a quarter so
    // a board's grain follows its length; `repeat` is in sheet-widths.
    function applyWalnut() {
      const img = LG_MATS.walnut;
      if (!img) return;
      const make = (rotate, rx, ry) => {
        const t = new THREE.CanvasTexture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.center.set(0.5, 0.5);
        if (rotate) t.rotation = Math.PI / 2;
        t.repeat.set(rx, ry);
        t.anisotropy = 4;
        disposables.push(t);
        return t;
      };
      // Back panel: tall boards, grain vertical.
      woodDarkMat.map = make(false, Math.max(2, caseW / 1.6), Math.max(2, caseH / 1.6));
      woodDarkMat.bumpMap = woodDarkMat.map;
      woodDarkMat.bumpScale = 0.02;
      woodDarkMat.needsUpdate = true;
      // Boards, posts and rails share one sheet turned on its side.
      woodMat.map = make(true, 1.4, Math.max(3, caseW / 2.2));
      woodMat.bumpMap = woodMat.map;
      woodMat.bumpScale = 0.016;
      woodMat.needsUpdate = true;
    }

    // ---- build books + case ----
    // Pack to the viewport's shape, and keep the case tight around the volumes
    // so a letterboxed view isn't padded with dead dark wood on both sides.
    const layout = packShelf(books, width / Math.max(height, 1));
    const backZ = -S3D.BOOK_DEPTH / 2 - 0.05;
    const caseW = layout.wallWidth + 0.5;
    // A deeper crown and plinth (rather than a case hugging the volumes) brings
    // the cabinet's proportions closer to the viewport's, so the height-filling
    // shot takes in noticeably more of the collection before you have to pan —
    // and any pull-back reveals more cabinet instead of black void.
    const caseH = layout.wallHeight + 0.8;

    // back panel
    {
      const geo = new THREE.PlaneGeometry(caseW, caseH);
      woodDarkTex.repeat.set(caseW / 2, caseH / 2);
      const m = new THREE.Mesh(geo, woodDarkMat);
      m.position.set(0, 0, backZ - 0.02);
      scene.add(m);
      disposables.push(geo);
    }
    // side posts + top/bottom rails
    const postGeo = new THREE.BoxGeometry(0.22, caseH, S3D.BOOK_DEPTH + 0.28);
    disposables.push(postGeo);
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(postGeo, woodMat);
      m.position.set(s * (caseW / 2 - 0.11), 0, backZ + (S3D.BOOK_DEPTH + 0.28) / 2);
      scene.add(m);
    });
    const railGeo = new THREE.BoxGeometry(caseW, 0.22, S3D.BOOK_DEPTH + 0.28);
    disposables.push(railGeo);
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(railGeo, woodMat);
      m.position.set(0, s * (caseH / 2 - 0.11), backZ + (S3D.BOOK_DEPTH + 0.28) / 2);
      scene.add(m);
    });

    // planks + gold front rule per row
    layout.rows.forEach((row) => {
      const plankGeo = new THREE.BoxGeometry(caseW - 0.36, S3D.PLANK_T, S3D.BOOK_DEPTH + 0.12);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(0, row.plankY, backZ + (S3D.BOOK_DEPTH + 0.12) / 2);
      scene.add(plank);
      disposables.push(plankGeo);
      const ruleGeo = new THREE.BoxGeometry(caseW - 0.36, 0.014, 0.02);
      const rule = new THREE.Mesh(ruleGeo, goldMat);
      rule.position.set(0, row.plankY + S3D.PLANK_T / 2, backZ + S3D.BOOK_DEPTH + 0.12);
      scene.add(rule);
      disposables.push(ruleGeo);

      // Two concealed lamps per bay, tucked at the front under the shelf above.
      // Short range + inverse-square decay is what gives the row visible light
      // pools, gold lettering that catches a highlight, and a dark recess
      // behind the volumes — i.e. the depth the flat-lit first pass lacked.
      [-1, 1].forEach((s) => {
        const lamp = new THREE.PointLight("#ffd9a0", 1.5, 4.6, 2);
        lamp.position.set(
          s * layout.wallWidth * 0.26,
          row.bookCenterY + S3D.BOOK_HEIGHT * 0.52,
          S3D.BOOK_DEPTH / 2 + 0.34
        );
        scene.add(lamp);
      });
    });

    // book volumes
    const booksGroup = new THREE.Group();
    scene.add(booksGroup);
    const bookEntries = [];       // { book, group, mesh, materials, spine, base, ... }
    const spineRedraws = [];
    const raycastMeshes = [];

    const pageMat = new THREE.MeshStandardMaterial({ color: S3D.PAGE_CREAM, roughness: 0.94, metalness: 0 });
    const pageTopMat = new THREE.MeshStandardMaterial({ color: S3D.PAGE_TOP, roughness: 0.98, metalness: 0 });
    const marbledEdgeMat = new THREE.MeshStandardMaterial({ color: "#8d7a5c", roughness: 0.9, metalness: 0.02 });
    disposables.push(pageMat, pageTopMat, marbledEdgeMat);

    // Page-block texture. The leaves are stacked across the spine's thickness, so
    // on both the head and the fore-edge the striations must run front-to-back —
    // hence the quarter turn on a sheet whose lines are horizontal.
    function applyPageEdge() {
      const img = LG_MATS.pageedge;
      if (img) {
        [[pageMat, 2.2], [pageTopMat, 2.6]].forEach(([mat, rep]) => {
          const t = new THREE.CanvasTexture(img);
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.center.set(0.5, 0.5);
          t.rotation = Math.PI / 2;
          t.repeat.set(rep, rep);
          t.anisotropy = 4;
          mat.map = t;
          mat.bumpMap = t;
          mat.bumpScale = 0.014;
          mat.needsUpdate = true;
          disposables.push(t);
        });
      }
      // Marbled edges: a real antiquarian flourish, and the reason a shelf of
      // old books never shows a uniform band of page tops. Applied to the third
      // of the collection bound in leather.
      const mb = LG_MATS.marbled;
      if (mb) {
        const t = new THREE.CanvasTexture(mb);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1.8, 1.8);
        t.anisotropy = 4;
        marbledEdgeMat.map = t;
        marbledEdgeMat.bumpMap = t;
        marbledEdgeMat.bumpScale = 0.01;
        marbledEdgeMat.needsUpdate = true;
        disposables.push(t);
      }
    }

    layout.placed.forEach((p, idx) => {
      const book = p.book;
      const pal = paletteFor(book);
      // Deterministic but much wider variation than the first pass (which was
      // 0.93–0.99 — too tight to read, so every volume looked machine-cut).
      const hJitter = 0.84 + ((idx * 37) % 100) / 610;     // 0.84–1.00
      const bh = S3D.BOOK_HEIGHT * hJitter;
      // Front-to-back scatter: most volumes sit a little proud of the backboard,
      // a few are pushed in. This is the cheapest, strongest cue that we are
      // looking at solid objects in a box rather than a printed strip.
      const zJitter = -0.13 + ((idx * 29) % 100) / 620;    // -0.13 … +0.03
      // Marbled edges on the leather-bound third — deterministic, not random.
      const marbled = pal.mat === "leather" && idx % 3 === 1;

      const spine = makeSpineCanvas(book, locale);
      spineRedraws.push(spine);
      const spineTex = new THREE.CanvasTexture(spine.canvas);
      spineTex.colorSpace = THREE.SRGBColorSpace;
      spineTex.anisotropy = 4;

      const coverCanvas = makeCoverCanvas(book, locale);
      const coverTex = new THREE.CanvasTexture(coverCanvas);
      coverTex.colorSpace = THREE.SRGBColorSpace;
      coverTex.anisotropy = 4;

      const clothMat = new THREE.MeshStandardMaterial({ color: pal.bg, roughness: 0.82, metalness: 0.02 });
      // The spine sheet doubles as its own bump map: the bands stand proud, the
      // gilt is stamped into the covering, and the lettering piece sits on top.
      const spineMat = new THREE.MeshStandardMaterial({
        map: spineTex, bumpMap: spineTex, bumpScale: 0.0075,
        roughness: pal.mat === "leather" ? 0.66 : 0.8, metalness: 0.05,
      });
      const coverMat = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, metalness: 0.04 });

      // BoxGeometry face order: +X,-X,+Y,-Y,+Z,-Z
      const materials = [
        coverMat,                 // +X front cover (revealed on fly-out)
        clothMat,                 // -X back cover
        marbled ? marbledEdgeMat : pageTopMat,  // +Y head — marbled on some
        clothMat,                 // -Y foot
        spineMat,                 // +Z spine (faces the room)
        marbled ? marbledEdgeMat : pageMat,     // -Z fore-edge
      ];
      const geo = makeBookGeometry(THREE, p.w, bh, S3D.BOOK_DEPTH, pal.mat === "leather");
      const mesh = new THREE.Mesh(geo, materials);
      mesh.userData.bookIndex = idx;

      const group = new THREE.Group();
      // book bottom sits on the plank: shift so the shorter (jittered) book rests down
      group.position.set(p.x, p.y - (S3D.BOOK_HEIGHT - bh) / 2, zJitter);
      // Most volumes stand straight; roughly one in seven takes a real lean
      // (~1.5–2.5°) instead of giving every book the same imperceptible tilt.
      const leans = idx % 7 === 3;
      const tiltJitter = leans ? (((idx * 53) % 2 ? 1 : -1) * (0.026 + ((idx * 17) % 10) / 700)) : 0;
      group.rotation.z = tiltJitter;
      group.add(mesh);
      booksGroup.add(group);

      disposables.push(spineTex, coverTex, clothMat, spineMat, coverMat, geo);

      bookEntries.push({
        book,
        group,
        mesh,
        coverMat,
        spineMat,
        coverTex,
        coverCanvas,
        base: { x: group.position.x, y: group.position.y, z: group.position.z, rz: tiltJitter },
        lift: 0,          // 0..1 hover
        fly: 0,           // 0..1 flown out
        coverLoaded: false,
      });
      raycastMeshes.push(mesh);
    });

    // The shelf paints immediately with the procedural weave and system fonts,
    // then repaints as the real assets land — webfonts for the gilt lettering,
    // the material scans for the covering. Nothing blocks first render.
    function repaintSpines() {
      if (disposed) return;
      spineRedraws.forEach((s) => s.redraw());
      bookEntries.forEach((e) => {
        if (e.spineMat.map) e.spineMat.map.needsUpdate = true;
        if (e.spineMat.bumpMap) e.spineMat.bumpMap.needsUpdate = true;
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(repaintSpines).catch(() => {});
    }
    loadMaterials().then(() => {
      if (disposed) return;
      applyPageEdge();
      applyWalnut();
      repaintSpines();
    });

    // ---- camera framing + pan/zoom state ----
    // Solve for the distance that actually frames the case in BOTH axes for the
    // current viewport, instead of the old hand-tuned guess (which clipped the
    // top shelf on wide screens and left dead margins on narrow ones).
    // `cover` fills the frame with cabinet (no dead black margins, which is what
    // made the first pass look badly framed); `contain` is the zoomed-out survey
    // shot where the whole case is visible. We open near cover and let the wheel
    // pull back to contain.
    function computeFit() {
      const vHalf = Math.tan((camera.fov * Math.PI) / 360);
      const a = Math.max(camera.aspect, 0.2);
      const dFillV = caseH / 2 / vHalf;
      const dFillH = caseW / 2 / (vHalf * a);
      return { cover: Math.min(dFillV, dFillH), contain: Math.max(dFillV, dFillH) * 1.06 };
    }
    let fit = computeFit();
    const cam = {
      tx: 0, ty: 0,
      dist: fit.cover * 1.06,
      // live (lerped) values
      x: 0, y: 0, z: 0,
    };
    let userZoomed = false;
    const DIST_MIN = 1.5;
    let DIST_MAX = fit.contain * 1.12;
    // Panning is bounded by how much cabinet actually overflows the frame at the
    // current zoom, so you can never drag the shelf off-screen into black void.
    function panLimits() {
      const vHalf = Math.tan((camera.fov * Math.PI) / 360);
      const visH = 2 * cam.dist * vHalf;
      const visW = visH * Math.max(camera.aspect, 0.2);
      return {
        x: Math.max(0, (caseW - visW) / 2),
        y: Math.max(0, (caseH - visH) / 2),
      };
    }
    cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.dist;
    // Fog scaled to the framing so the recess falls off instead of using fixed
    // world distances that meant nothing once the wall changed shape.
    scene.fog.near = cam.dist * 0.62;
    scene.fog.far = cam.dist * 2.3;
    const pointerParallax = { x: 0, y: 0 };

    // ---- interaction ----
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoverIdx = -1;
    const pointer = { down: false, x: 0, y: 0, startX: 0, startY: 0, moved: 0, id: null, t: 0 };

    function setNDCFromEvent(e) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      pointerParallax.x = ndc.x;
      pointerParallax.y = ndc.y;
    }

    function pick() {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(raycastMeshes, false);
      return hits.length ? hits[0].object.userData.bookIndex : -1;
    }

    function onPointerDown(e) {
      pointer.down = true;
      pointer.id = e.pointerId;
      pointer.x = pointer.startX = e.clientX;
      pointer.y = pointer.startY = e.clientY;
      pointer.moved = 0;
      pointer.t = (window.performance ? performance.now() : 0);
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function onPointerMove(e) {
      setNDCFromEvent(e);
      if (pointer.down) {
        const dx = e.clientX - pointer.x;
        const dy = e.clientY - pointer.y;
        pointer.moved += Math.abs(dx) + Math.abs(dy);
        // pan: convert screen px → world using current distance & viewport
        const worldPerPx = (2 * cam.dist * Math.tan((camera.fov * Math.PI) / 360)) / height;
        const pb = panLimits();
        cam.tx = clamp(cam.tx - dx * worldPerPx, -pb.x, pb.x);
        cam.ty = clamp(cam.ty + dy * worldPerPx, -pb.y, pb.y);
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      } else {
        const idx = pick();
        if (idx !== hoverIdx) {
          hoverIdx = idx;
          renderer.domElement.style.cursor = idx >= 0 ? "pointer" : "grab";
        }
      }
    }
    function onPointerUp(e) {
      const wasClick = pointer.moved < 6 &&
        (!window.performance || performance.now() - pointer.t < 500);
      pointer.down = false;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
      if (wasClick) {
        setNDCFromEvent(e);
        const idx = pick();
        if (idx >= 0) {
          const b = bookEntries[idx].book;
          setSelected((prev) => (prev && prev.id === b.id ? null : b));
        } else if (selectRef.current) {
          setSelected(null);
        }
      }
    }
    function onWheel(e) {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.0012);
      userZoomed = true;
      cam.dist = clamp(cam.dist * factor, DIST_MIN, DIST_MAX);
    }

    const el = renderer.domElement;
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    // ---- imperative handle used by React (selection) ----
    let selectedIdx = -1;
    function loadCover(entry) {
      if (entry.coverLoaded) return;
      entry.coverLoaded = true;
      // Appearance › cover style applies here too: under "illustrated" the board
      // keeps the cloth-and-gilt face this file draws, with no scan mounted.
      if (coverStyle === "illustrated") return;
      const url = window.LG_COVER_IMAGES && window.LG_COVER_IMAGES[entry.book.id];
      if (!url) return;
      // Repaint the board with the scan mounted on it, rather than replacing the
      // whole face with the bitmap (which stretched every scan to the board's
      // proportions).
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        const fresh = makeCoverCanvas(entry.book, locale, img);
        const ctx2 = entry.coverCanvas.getContext("2d");
        ctx2.clearRect(0, 0, entry.coverCanvas.width, entry.coverCanvas.height);
        ctx2.drawImage(fresh, 0, 0);
        entry.coverTex.needsUpdate = true;
      };
      img.onerror = () => {};
      img.src = url;
    }
    apiRef.current = {
      setSelected(id) {
        selectedIdx = id == null ? -1 : bookEntries.findIndex((e) => e.book.id === id);
        if (selectedIdx >= 0) loadCover(bookEntries[selectedIdx]);
      },
    };
    // If the scene was rebuilt (filter/locale change) while a volume was out,
    // restore that selection into the fresh scene.
    if (selectRef.current) apiRef.current.setSelected(selectRef.current);

    // ---- animation loop ----
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;
    const camForward = new THREE.Vector3(0, 0, -1);

    function damp(cur, target, lambda, dt) {
      return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smoothstep(a, b, x) {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    function stepScene(dt) {
      // Zooming out shrinks the overflow, so re-clamp the pan target or the
      // camera would stay parked over cabinet that is no longer off-frame.
      const pb = panLimits();
      cam.tx = clamp(cam.tx, -pb.x, pb.x);
      cam.ty = clamp(cam.ty, -pb.y, pb.y);

      // camera ease (+ gentle pointer parallax for depth)
      cam.x = damp(cam.x, cam.tx + pointerParallax.x * 0.18, 7, dt);
      cam.y = damp(cam.y, cam.ty + pointerParallax.y * 0.14, 7, dt);
      cam.z = damp(cam.z, cam.dist, 7, dt);
      camera.position.set(cam.x, cam.y, cam.z);
      camera.lookAt(cam.tx, cam.ty, 0);
      warmPoint.position.set(cam.tx, cam.ty + 1.2, cam.z - 0.5);

      camera.getWorldDirection(camForward);

      for (let i = 0; i < bookEntries.length; i++) {
        const e = bookEntries[i];
        const isSel = i === selectedIdx;
        const isHover = i === hoverIdx && selectedIdx < 0 && !pointer.down;
        e.fly = damp(e.fly, isSel ? 1 : 0, 6, dt);
        e.lift = damp(e.lift, isHover ? 1 : 0, 10, dt);

        if (e.fly > 0.001) {
          // Target: clear of the shelf face and well in front of it, on the near
          // side of the camera. This used to be a fixed 2.7 units back from the
          // camera, which was fine when the camera sat ~10 units out — but once
          // the framing moved to fill-the-frame (~3 units out) it dropped the
          // volume 0.2 units off the shelf, so it intersected its neighbours.
          const front = S3D.BOOK_DEPTH / 2;
          const reach = Math.max(0.55, (cam.z - front) * 0.52);
          const tz = front + reach;
          // Offset left of centre so the info panel on the right never covers it.
          const halfH = Math.tan((camera.fov * Math.PI) / 360) * (cam.z - tz);
          const tx = cam.tx - halfH * camera.aspect * 0.3;
          const ty = cam.ty + halfH * 0.04;

          // The volume is DRAWN OFF THE SHELF before it turns. Moving, turning
          // and scaling on one shared progress sent it swinging sideways through
          // its neighbours — the corners of adjacent books cut into its faces,
          // which is the shredded, part-blank look. Pulling straight out first
          // keeps it clear of the row for the whole rotation, and is what the
          // hand actually does.
          const out  = smoothstep(0.0, 0.45, e.fly);   // straight out along +Z
          const move = smoothstep(0.32, 1.0, e.fly);   // then across and up
          const turn = smoothstep(0.38, 1.0, e.fly);   // then present the cover

          e.group.position.z = damp(e.group.position.z, lerp(e.base.z, tz, out), 26, dt);
          e.group.position.x = damp(e.group.position.x, lerp(e.base.x, tx, move), 26, dt);
          e.group.position.y = damp(e.group.position.y, lerp(e.base.y, ty, move), 26, dt);
          e.group.rotation.y = damp(e.group.rotation.y, turn * (-Math.PI / 2 + 0.34), 22, dt);
          e.group.rotation.x = damp(e.group.rotation.x, turn * -0.06, 22, dt);
          e.group.rotation.z = damp(e.group.rotation.z, e.base.rz * (1 - out), 22, dt);
          e.group.scale.setScalar(damp(e.group.scale.x, 1 + move * 0.28, 22, dt));
        } else {
          // rest / hover: lift toward the room (+Z) and up a touch
          e.group.position.x = damp(e.group.position.x, e.base.x, 18, dt);
          e.group.position.y = damp(e.group.position.y, e.base.y + e.lift * 0.03, 18, dt);
          e.group.position.z = damp(e.group.position.z, e.base.z + e.lift * 0.14, 18, dt);
          e.group.rotation.y = damp(e.group.rotation.y, 0, 18, dt);
          e.group.rotation.x = damp(e.group.rotation.x, 0, 18, dt);
          e.group.rotation.z = damp(e.group.rotation.z, e.base.rz, 18, dt);
          e.group.scale.setScalar(damp(e.group.scale.x, 1, 18, dt));
        }

        // active book glows faintly gold; hovered brightens; selected full
        const isActive = e.book.id === activeIdRef.current;
        const emphasis = Math.max(e.lift * 0.5, e.fly, isActive ? 0.28 : 0);
        e.spineMat.emissive.setRGB(emphasis * 0.32, emphasis * 0.24, emphasis * 0.09);
        e.coverMat.emissive.setRGB(emphasis * 0.16, emphasis * 0.12, emphasis * 0.05);
        // render flown book on top of neighbours
        e.mesh.renderOrder = e.fly > 0.02 ? 10 : 0;
      }

      renderer.render(scene, camera);
    }

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      stepScene(Math.min(clock.getDelta(), 0.05));
    }

    frame();

    // ---- resize ----
    const ro = new ResizeObserver(() => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Re-solve the framing for the new viewport; if the reader hasn't zoomed
      // manually, keep the cabinet filling the frame rather than letting dead
      // margins open up at the sides.
      fit = computeFit();
      DIST_MAX = fit.contain * 1.12;
      if (!userZoomed) cam.dist = fit.cover * 1.06;
      else cam.dist = Math.min(cam.dist, DIST_MAX);
      scene.fog.near = cam.dist * 0.62;
      scene.fog.far = cam.dist * 2.3;
    });
    ro.observe(mount);

    // ---- cleanup ----
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      apiRef.current = null;
      disposables.forEach((d) => { try { d.dispose && d.dispose(); } catch (_) {} });
      scene.traverse((o) => { if (o.geometry) { try { o.geometry.dispose(); } catch (_) {} } });
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    // Rebuild only when the set/order of volumes, the locale, or the cover style
    // changes — NOT on every parent re-render (booksKey is a stable string;
    // activeId glows live). Cover style is baked into each board's canvas at
    // build time, so changing it has to re-paint them.
    // eslint-disable-next-line
  }, [booksKey, locale, coverStyle]);

  // ---------- info panel (HTML overlay) ----------
  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
  const T = (k, fallback) => (tt ? tt(k) : fallback);

  return (
    <div className="lib-shelf3d">
      <div className="lib-shelf3d-canvas" ref={mountRef} />
      <div className={"lib-shelf3d-hint " + (selected ? "dim" : "")}>
        {T("lib.shelf3d.hint", "Drag to pan · scroll to zoom · click a volume")}
      </div>

      {selected && (
        <div className="shelf3d-panel" onClick={(e) => e.stopPropagation()}>
          <button className="shelf3d-panel-close" onClick={() => setSelected(null)} aria-label="close">×</button>
          <div className="shelf3d-panel-type">
            {T("work.type." + (selected.type || "novel"), selected.type || "novel")}
          </div>
          <div className="shelf3d-panel-title">
            {window.bookTitle ? window.bookTitle(selected, locale) : selected.title}
          </div>
          <div className="shelf3d-panel-meta">
            {(window.bookAuthor ? window.bookAuthor(selected, locale) : selected.author)}
            {selected.year ? " · " + (selected.year > 0 ? selected.year : -selected.year + " BC") : ""}
          </div>
          <div className="shelf3d-panel-stats">
            <div><b>{fmt(selected.entities)}</b><span>{T("lib.card.characters", "characters")}</span></div>
            <div><b>{fmt(selected.edges)}</b><span>{T("lib.card.relations", "relations")}</span></div>
            <div><b>{fmt(selected.tokens)}</b><span>{T("lib.card.words", "words")}</span></div>
          </div>
          <div className="shelf3d-panel-actions">
            <button className="shelf3d-open" onClick={() => onOpenRef.current && onOpenRef.current(selected)}>
              {T("lib.shelf3d.open", "Open")}
            </button>
            <button className="shelf3d-back" onClick={() => setSelected(null)}>
              {T("lib.shelf3d.back", "Back to shelf")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.BookShelf3D = BookShelf3D;
