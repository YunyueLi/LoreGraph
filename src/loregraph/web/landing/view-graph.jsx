// LoreGraph — Graph view
// Three view modes: SOCIAL (people in places), THEMES (concepts), CHRONICLE (events on a timeline).

// ====== Anchored force simulation ======
// Each node has an ANCHOR — by default its curated (cx, cy) inside a region.
// A strong spring pulls every node toward its anchor, so the social layout
// stays semantically correct (Bennets in Longbourn, Darcy in Pemberley, …)
// no matter what the rest of the forces do.
// On top of that:
//   - CHARGE between every pair so nodes don't visually overlap
//   - SPRINGS on edges, weak, only nudging close pairs together
// Drag updates the dragged node's anchor in real-time — release leaves the
// new layout. Reset Layout button restores all anchors to the curated seed.
const SIM = {
  ANCHOR_K:     0.16,     // strong: each node snaps back to its assigned region
  CHARGE:       1400,     // pairwise repulsion (always on, range-gated)
  MIN_DIST2:    2700,     // ≈52px minimum centre-to-centre — no overlap
  CHARGE_RANGE2: 18000,   // only compute charge if pairs are within ~135px
  DAMPING:      0.62,
  MAX_SPEED:    22,
  REST_EPS:     0.06,     // position delta below this is considered "no change"
};
// NOTE: edge springs intentionally disabled. They were pulling cross-region
// edges so hard that Elizabeth drifted toward Pemberley + Rosings + London
// + Regiment all at once, destabilising the layout. Anchors handle position;
// edges are now purely visual connectors.

function deepClonePos(pos) {
  const out = {};
  for (const id in pos) out[id] = { x: pos[id].x, y: pos[id].y };
  return out;
}

function stepSimulation(prev, vels, edges, anchors, alpha, draggedId) {
  // Freeze the sim entirely during drag — the dragged node's position is
  // owned by the pointer handler (one setState per pointermove), and every
  // other node is already at its anchor.  Letting the sim co-write per frame
  // produces wasted re-renders and visible jitter on edges.
  if (draggedId) return prev;

  const ids = Object.keys(prev);
  const next = {};
  for (const id of ids) next[id] = { x: prev[id].x, y: prev[id].y };

  for (const id of ids) if (!vels[id]) vels[id] = { vx: 0, vy: 0 };

  // 1) anchor pull — strong spring back to the node's home position
  for (const id of ids) {
    const a = anchors[id];
    if (!a) continue;
    const dx = a.x - next[id].x;
    const dy = a.y - next[id].y;
    vels[id].vx += dx * SIM.ANCHOR_K;
    vels[id].vy += dy * SIM.ANCHOR_K;
  }

  // 2) charge — pairwise repulsion (1/r²), range-gated to ~135px so far
  //    pairs cost nothing.  Always on (not alpha-scaled) so two anchors
  //    dragged close still visually separate.
  for (let i = 0; i < ids.length; i++) {
    const a = next[ids[i]];
    for (let j = i + 1; j < ids.length; j++) {
      const b = next[ids[j]];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx*dx + dy*dy;
      if (d2 > SIM.CHARGE_RANGE2) continue;
      if (d2 < SIM.MIN_DIST2) {
        if (d2 < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); d2 = dx*dx + dy*dy + 1; }
        d2 = SIM.MIN_DIST2;
      }
      const f = SIM.CHARGE / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      vels[ids[i]].vx -= fx; vels[ids[i]].vy -= fy;
      vels[ids[j]].vx += fx; vels[ids[j]].vy += fy;
    }
  }

  // 3) integrate (skip dragged node — pinned to cursor)
  let anyMoved = false;
  for (const id of ids) {
    if (id === draggedId) { vels[id].vx = 0; vels[id].vy = 0; continue; }
    const v = vels[id];
    v.vx *= 1 - SIM.DAMPING;
    v.vy *= 1 - SIM.DAMPING;
    const sp = Math.hypot(v.vx, v.vy);
    if (sp > SIM.MAX_SPEED) { v.vx = v.vx / sp * SIM.MAX_SPEED; v.vy = v.vy / sp * SIM.MAX_SPEED; }
    const ox = next[id].x, oy = next[id].y;
    next[id].x += v.vx;
    next[id].y += v.vy;
    if (Math.abs(next[id].x - prev[id].x) > SIM.REST_EPS || Math.abs(next[id].y - prev[id].y) > SIM.REST_EPS) {
      anyMoved = true;
    } else {
      // snap to anchor when virtually stable — eliminates rest jitter
      const a = anchors[id];
      if (a) {
        const adx = a.x - next[id].x, ady = a.y - next[id].y;
        if (Math.abs(adx) < 0.5 && Math.abs(ady) < 0.5) {
          next[id].x = a.x; next[id].y = a.y;
          v.vx = 0; v.vy = 0;
        }
      }
    }
  }

  // Reference-stable return when nothing meaningful changed (and no drag) —
  // React skips re-render, eliminating the per-frame edge jitter.
  if (!anyMoved && !draggedId) return prev;
  return next;
}

function ViewGraph({ ctx }) {
  const { tt, data, entities, edges, locale, selectedEntityId, setSelectedEntityId, activeBook,
          graphViewMode, setGraphViewMode, graphLeftHidden, setGraphLeftHidden, graphRightHidden, setGraphRightHidden } = ctx;
  const { useState, useMemo, useEffect, useRef, useCallback } = React;
  const gvRef = useRef(null);

  const viewMode = graphViewMode;
  const setViewMode = setGraphViewMode;
  const leftCollapsed = graphLeftHidden;
  const setLeftCollapsed = setGraphLeftHidden;
  const rightCollapsed = graphRightHidden;
  const setRightCollapsed = setGraphRightHidden;
  const [edgeFilter, setEdgeFilter] = useState({ STRUCTURAL: true, INTERACTS: true, ASSERTS: true, INFLUENCES: true, PREDICTS: true, SYMBOLIZES: true });
  const [activeChapter, setActiveChapter] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [leftW,  setLeftW]  = useState(260);
  const [rightW, setRightW] = useState(380);
  const MIN_W = 52;
  const SNAP  = 120;

  // Resize drag — we keep React entirely out of the move loop. Each pointermove
  // just writes the new pixel width to the `--gv-left` / `--gv-right` CSS var
  // on the .gv container, so the grid recomputes layout without re-rendering
  // the 25-edge SVG. React state is committed once on pointerup, which is when
  // the snap-to-collapse decision matters anyway.
  const startDrag = (which) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = which === 'left' ? leftW : rightW;
    const cssVar = which === 'left' ? '--gv-left' : '--gv-right';
    const gv = gvRef.current;
    let latest = startW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Disable the .gv grid transition during drag so it follows the cursor 1:1.
    if (gv) gv.style.setProperty('--gv-transition', 'none');
    const onMove = (ev) => {
      ev.preventDefault();
      const dx = ev.clientX - startX;
      const next = which === 'left' ? startW + dx : startW - dx;
      latest = Math.max(MIN_W, Math.min(560, next));
      if (gv) gv.style.setProperty(cssVar, latest + 'px');
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (gv) gv.style.removeProperty('--gv-transition');
      // Commit once at the end — snaps to collapsed if under the threshold.
      const collapsed = latest <= SNAP;
      if (which === 'left') {
        setLeftW(latest);
        setLeftCollapsed(collapsed);
      } else {
        setRightW(latest);
        setRightCollapsed(collapsed);
      }
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  const gvStyle = {
    '--gv-left':  leftCollapsed ? '0px' : leftW  + 'px',
    '--gv-right': rightCollapsed ? '0px' : rightW + 'px',
  };

  const gvClass = [
    "gv",
    leftCollapsed  ? "gv-left-hidden"  : "",
    rightCollapsed ? "gv-right-hidden" : "",
    fullscreen     ? "fullscreen"       : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && fullscreen) setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // ============== Layouts per book × mode ==============
  // SOCIAL: agents grouped under their primary location (P&P) or generation
  // (百年孤独). Regions are soft ellipses; positions sit each entity within one.
  const SOCIAL_REGIONS_BY_BOOK = {
    pap: [
      { id: "longbourn",  title: { en: "Longbourn", "zh-CN": "朗博恩", "zh-TW": "朗博恩", ja: "ロングボーン", ko: "롱본", fr: "Longbourn", es: "Longbourn", de: "Longbourn" }, entity: "o02", cx: 200, cy: 380, rx: 170, ry: 230, members: ["e01","e03","e05","e06","e07","e08","e09"] },
      { id: "netherfield",title: { en: "Netherfield Park", "zh-CN": "尼日斐花园", "zh-TW": "尼日斐花園", ja: "ネザーフィールド", ko: "네더필드", fr: "Netherfield Park", es: "Netherfield Park", de: "Netherfield Park" }, entity: "o03", cx: 460, cy: 100, rx: 160, ry: 90, members: ["e04","e14"] },
      { id: "pemberley",  title: { en: "Pemberley", "zh-CN": "潘伯里庄园", "zh-TW": "潘伯里莊園", ja: "ペンバリー", ko: "펜벌리", fr: "Pemberley", es: "Pemberley", de: "Pemberley" }, entity: "o01", cx: 780, cy: 140, rx: 150, ry: 110, members: ["e02","e15"] },
      { id: "rosings",    title: { en: "Rosings & Hunsford", "zh-CN": "罗辛斯与亨斯福德", "zh-TW": "羅辛斯與亨斯福德", ja: "ロージングスとハンスフォード", ko: "로징스와 헌스포드", fr: "Rosings & Hunsford", es: "Rosings y Hunsford", de: "Rosings & Hunsford" }, entity: "o04", cx: 720, cy: 540, rx: 190, ry: 160, members: ["e11","e12","e13","e18"] },
      { id: "london",     title: { en: "London (Gardiners)", "zh-CN": "伦敦（嘉丁纳家）", "zh-TW": "倫敦（嘉丁納家）", ja: "ロンドン（ガーディナー家）", ko: "런던 (가디너 가)", fr: "Londres (Gardiner)", es: "Londres (Gardiner)", de: "London (Gardiner)" }, entity: null, cx: 250, cy: 720, rx: 160, ry: 90, members: ["e16","e17"] },
      { id: "regiment",   title: { en: "The ——shire Militia", "zh-CN": "——郡民兵团", "zh-TW": "——郡民兵團", ja: "——シャー民兵団", ko: "——셔 민병대", fr: "Milice du ——shire", es: "Milicia de ——shire", de: "——shire-Miliz" }, entity: null, cx: 530, cy: 730, rx: 130, ry: 80, members: ["e10"] },
    ],
    soledad: [
      { id: "gen1",   title: { en: "Generation I — Founders",  "zh-CN": "第一代 · 创建者", "zh-TW": "第一代 · 創建者", ja: "第一世代 — 創設者", ko: "1세대 · 창건자", fr: "Génération I — Fondateurs", es: "Generación I — Fundadores", de: "Generation I — Gründer" }, entity: null, cx: 220, cy: 180, rx: 170, ry: 110, members: ["sa01","sa02"] },
      { id: "gen2",   title: { en: "Generation II",            "zh-CN": "第二代",          "zh-TW": "第二代",          ja: "第二世代",            ko: "2세대",          fr: "Génération II",            es: "Generación II",            de: "Generation II" },            entity: null, cx: 520, cy: 170, rx: 200, ry: 110, members: ["sa03","sa04","sa05","sa06"] },
      { id: "gen3",   title: { en: "Generation III",           "zh-CN": "第三代",          "zh-TW": "第三代",          ja: "第三世代",            ko: "3세代",          fr: "Génération III",           es: "Generación III",           de: "Generation III" },           entity: null, cx: 820, cy: 230, rx: 170, ry: 120, members: ["sa07","sa08","sa09"] },
      { id: "gen4",   title: { en: "Generation IV — twins",    "zh-CN": "第四代 · 双胞胎",  "zh-TW": "第四代 · 雙胞胎",  ja: "第四世代 — 双子",     ko: "4세대 · 쌍둥이", fr: "Génération IV — jumeaux",  es: "Generación IV — gemelos",  de: "Generation IV — Zwillinge" }, entity: null, cx: 240, cy: 470, rx: 200, ry: 130, members: ["sa10","sa11","sa12","sa15"] },
      { id: "gen5",   title: { en: "Generation V",             "zh-CN": "第五代",          "zh-TW": "第五代",          ja: "第五世代",            ko: "5세대",          fr: "Génération V",             es: "Generación V",             de: "Generation V" },             entity: null, cx: 530, cy: 470, rx: 160, ry: 110, members: ["sa13","sa14"] },
      { id: "gen67",  title: { en: "Generations VI & VII",     "zh-CN": "第六/七代",       "zh-TW": "第六/七代",       ja: "第六・七世代",        ko: "6 / 7세대",       fr: "Générations VI & VII",     es: "Generaciones VI y VII",     de: "Generationen VI & VII" },     entity: null, cx: 830, cy: 510, rx: 170, ry: 140, members: ["sa16","sa17","sa18"] },
      { id: "outsiders", title: { en: "Outsiders to Macondo",  "zh-CN": "外来者 · 马孔多以外", "zh-TW": "外來者 · 馬孔多以外", ja: "マコンドの外来者",      ko: "마콘도의 외부인",   fr: "Étrangers à Macondo",      es: "Forasteros de Macondo",     de: "Auswärtige Macondos" },      entity: null, cx: 510, cy: 760, rx: 320, ry: 100, members: ["sa19","sa20","sa21","sa22","sa23","sa24"] },
    ],
  };
  const SOCIAL_POS_BY_BOOK = {
    pap: {
      // Longbourn cluster
      e01: { x: 250, y: 360 }, // Elizabeth — center
      e03: { x: 160, y: 290 }, e05: { x:  80, y: 380 }, e06: { x:  90, y: 470 },
      e07: { x: 290, y: 460 }, e08: { x: 200, y: 480 }, e09: { x: 320, y: 290 },
      // Netherfield
      e04: { x: 410, y: 100 }, e14: { x: 510, y: 100 },
      // Pemberley
      e02: { x: 750, y: 150 }, e15: { x: 830, y: 110 },
      // Rosings
      e12: { x: 720, y: 510 }, e18: { x: 800, y: 580 }, e11: { x: 640, y: 560 }, e13: { x: 700, y: 620 },
      // London
      e16: { x: 200, y: 730 }, e17: { x: 290, y: 715 },
      // Roaming
      e10: { x: 530, y: 730 },
      // central Letter object
      o05: { x: 500, y: 360 },
    },
    soledad: {
      // Gen I — founders (region cx=220 cy=180, rx=170 ry=110)
      sa01: { x: 150, y: 160 }, sa02: { x: 290, y: 200 },
      // Gen II (region cx=520 cy=170, rx=200 ry=110) — 4 in a diamond
      sa03: { x: 390, y: 140 }, sa04: { x: 490, y: 210 },
      sa05: { x: 580, y: 140 }, sa06: { x: 650, y: 200 },
      // Gen III (region cx=820 cy=230, rx=170 ry=120) — 3 in a triangle
      sa07: { x: 720, y: 200 }, sa08: { x: 830, y: 280 }, sa09: { x: 920, y: 195 },
      // Gen IV — twins + Fernanda + Remedios the Beauty (region cx=240 cy=470, rx=200 ry=130)
      // 2×2 grid with ample horizontal+vertical separation, no more pile-up
      sa10: { x: 135, y: 425 }, sa12: { x: 345, y: 425 },
      sa11: { x: 135, y: 525 }, sa15: { x: 345, y: 525 },
      // Gen V (region cx=530 cy=470, rx=160 ry=110)
      sa13: { x: 470, y: 440 }, sa14: { x: 590, y: 500 },
      // Gen VI/VII (region cx=830 cy=510, rx=170 ry=140) — diagonal spread
      sa16: { x: 720, y: 450 }, sa17: { x: 830, y: 525 }, sa18: { x: 925, y: 595 },
      // Outsiders to the household — wide row (region cx=510 cy=760, rx=320 ry=100)
      sa19: { x: 220, y: 745 }, // Melquíades
      sa20: { x: 340, y: 775 }, // Pilar
      sa21: { x: 460, y: 745 }, // Pietro Crespi
      sa22: { x: 580, y: 775 }, // Petra Cotes
      sa23: { x: 700, y: 745 }, // Mauricio Babilonia
      sa24: { x: 820, y: 775 }, // Mr. Brown / Banana Company
      // Central anchor: the parchments — structural pivot of the book
      so04: { x: 510, y: 340 },
    },
  };

  // THEMES: concepts laid out radially; agents that embody them gather around.
  const THEMES_POS_BY_BOOK = {
    pap: {
      // Concepts at cardinal positions
      c01: { x: 200, y: 420 }, // pride — left
      c02: { x: 760, y: 420 }, // prejudice — right
      c03: { x: 480, y: 130 }, // marriage — top
      c04: { x: 240, y: 700 }, // class — bottom-left
      c05: { x: 720, y: 700 }, // reputation — bottom-right
      c06: { x: 480, y: 700 }, // entail — bottom-center
      // Agents radiate outward from center toward themes they embody.
      e02: { x: 280, y: 320 }, // Darcy → pride
      e01: { x: 660, y: 320 }, // Elizabeth → prejudice
      e03: { x: 410, y: 230 }, // Jane → marriage
      e04: { x: 550, y: 230 }, // Bingley → marriage
      e13: { x: 380, y: 320 }, // Charlotte → marriage(pragmatic)/class
      e11: { x: 320, y: 600 }, // Collins → entail/class
      e12: { x: 600, y: 580 }, // Lady Catherine → class
      e07: { x: 670, y: 600 }, // Lydia → reputation
      e10: { x: 540, y: 600 }, // Wickham → reputation
      e06: { x: 470, y: 470 }, // Mrs Bennet → marriage(forcing)
      e05: { x: 220, y: 540 }, // Mr Bennet → class(detached)
    },
    soledad: {
      // Concepts at cardinal positions
      sc01: { x: 480, y: 130 }, // solitude — top
      sc02: { x: 200, y: 420 }, // circular time — left
      sc03: { x: 480, y: 700 }, // memory & forgetting — bottom
      sc04: { x: 760, y: 420 }, // magic realism — right
      sc05: { x: 480, y: 420 }, // cursed bloodline — center
      // Founders
      sa01: { x: 340, y: 260 }, // founder → solitude / curse / magic realism
      sa02: { x: 480, y: 230 }, // Úrsula → curse / memory / circular time
      // Action / repression archetypes
      sa04: { x: 620, y: 280 }, // Colonel → solitude
      sa05: { x: 340, y: 510 }, // Amaranta → solitude
      // The witness & the writer
      sa10: { x: 600, y: 540 }, // José Arcadio Segundo → memory/forgetting
      sa19: { x: 580, y: 350 }, // Melquíades → cursed bloodline (he wrote it)
      // Final reader
      sa16: { x: 480, y: 580 }, // Aureliano Babilonia → memory + curse
      // The last child
      sa18: { x: 390, y: 620 }, // pig-tailed child → cursed bloodline
    },
  };

  const bookId = (activeBook && activeBook.id) || "pap";
  // Curated demo books use their hand-authored coordinates; real exported books
  // (data-exports.js) carry generated positions on the book record; anything else
  // falls back to empty (no nodes) rather than borrowing P&P's wrong layout.
  const SOCIAL_REGIONS = SOCIAL_REGIONS_BY_BOOK[bookId] || (activeBook && activeBook.socialRegions) || [];
  const SOCIAL_POS = SOCIAL_POS_BY_BOOK[bookId] || (activeBook && activeBook.socialPos) || {};
  const THEMES_POS = THEMES_POS_BY_BOOK[bookId] || (activeBook && activeBook.themesPos) || {};

  // CHRONICLE layout removed — timeline now lives in its own view.

  const seedPositions = viewMode === "social" ? SOCIAL_POS : THEMES_POS;

  const visibleEntities = useMemo(() => {
    return entities.filter(e => {
      if (!seedPositions[e.id]) return false;
      if (viewMode === "social" && (e.type === "concept" || e.type === "event")) return false;
      if (viewMode === "themes" && (e.type === "object" || e.type === "event"))  return false;
      return true;
    });
  }, [viewMode, bookId]);

  // STRENGTH-RANKED BACKBONE + FOCUS REVEAL.
  // A dense graph (Alice ≈ 315 edges, most incident to one protagonist hub) is
  // an unreadable tangle if every edge is drawn. Default view shows only a
  // sparse "backbone": each node's few strongest links, preferring links
  // between non-hub nodes so the inter-group structure shows instead of the
  // hub's spokes (the hub keeps just 2). Selecting/hovering a node reveals ALL
  // of its connections; everything else dims.
  const visibleEdges = useMemo(() => {
    const base = edges.filter(e => {
      if (!edgeFilter[e.rel]) return false;
      if (!seedPositions[e.src] || !seedPositions[e.dst]) return false;
      if (activeChapter) {
        const sA = entities.find(en => en.id === e.src);
        const dA = entities.find(en => en.id === e.dst);
        const sIn = Array.isArray(sA?.chapters) && sA.chapters.includes(activeChapter);
        const dIn = Array.isArray(dA?.chapters) && dA.chapters.includes(activeChapter);
        if (!sIn && !dIn) return false;
      }
      return true;
    });
    const strength = e => (e.weight != null ? e.weight : (e.conf != null ? e.conf : 0.5));
    const deg = {};
    base.forEach(e => { deg[e.src] = (deg[e.src] || 0) + 1; deg[e.dst] = (deg[e.dst] || 0) + 1; });
    const nN = Object.keys(deg).length || 1;
    const hubCut = 0.42 * (nN - 1);
    const isHub = id => (deg[id] || 0) >= hubCut;
    const incident = {};
    base.forEach(e => { (incident[e.src] ||= []).push(e); (incident[e.dst] ||= []).push(e); });
    const keep = new Set();
    Object.keys(incident).forEach(id => {
      const hub = isHub(id);
      let cand = incident[id];
      if (!hub) {
        const interGroup = cand.filter(e => !isHub(e.src) && !isHub(e.dst));
        if (interGroup.length) cand = interGroup;  // prefer non-hub links for the backbone
      }
      cand.slice().sort((a, b) => strength(b) - strength(a))
        .slice(0, hub ? 2 : 3)
        .forEach(e => keep.add(e.id));
    });
    return base.filter(e =>
      keep.has(e.id) ||
      (selectedEntityId && (e.src === selectedEntityId || e.dst === selectedEntityId))
    );
  }, [edgeFilter, activeChapter, viewMode, bookId, selectedEntityId, entities, edges]);

  const edgeCounts = {
    STRUCTURAL: edges.filter(e => e.rel === "STRUCTURAL").length,
    INTERACTS:  edges.filter(e => e.rel === "INTERACTS").length,
    ASSERTS:    edges.filter(e => e.rel === "ASSERTS").length,
    INFLUENCES: edges.filter(e => e.rel === "INFLUENCES").length,
    PREDICTS:   edges.filter(e => e.rel === "PREDICTS").length,
    SYMBOLIZES: edges.filter(e => e.rel === "SYMBOLIZES").length,
  };

  // ====== Anchored physics ======
  // Each node has an ANCHOR — by default its curated (cx, cy) inside a
  // region. The simulation pulls each node toward its anchor (strong),
  // repels overlapping pairs (medium), and applies a weak spring per edge
  // (just for liveness). Dragging a node moves its anchor in real-time, so
  // release leaves the new layout. Reset Layout restores anchors from seed.
  const [livePositions, setLivePositions] = useState(() => deepClonePos(seedPositions));
  const anchorsRef = useRef(deepClonePos(seedPositions));
  const velRef = useRef({});
  const draggedRef = useRef(null);
  const alphaRef = useRef(1.0);
  const restingRef = useRef(0);
  const reignite = useCallback((to = 0.7) => {
    alphaRef.current = Math.max(alphaRef.current, to);
    restingRef.current = 0;  // wake the loop if it parked at rest
  }, []);

  // Reset to seed when book or view-mode changes.
  useEffect(() => {
    anchorsRef.current = deepClonePos(seedPositions);
    setLivePositions(deepClonePos(seedPositions));
    velRef.current = {};
    draggedRef.current = null;
    reignite(1.0);
  }, [bookId, viewMode]);

  // Single rAF loop. Anchor pull and charge are always active so the layout
  // self-enforces (no overlap; everyone stays near their region). Alpha only
  // scales the spring-on-edges so the initial settle is lively without
  // permanent jitter. Skip the step once nothing is moving AND no drag.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (restingRef.current > 8 && !draggedRef.current) return;
      setLivePositions(prev => {
        const next = stepSimulation(prev, velRef.current, visibleEdges, anchorsRef.current, alphaRef.current, draggedRef.current);
        // detect rest: max velocity magnitude under 0.1 → resting
        let maxV = 0;
        for (const id in velRef.current) {
          const v = velRef.current[id];
          const m = Math.abs(v.vx) + Math.abs(v.vy);
          if (m > maxV) maxV = m;
        }
        if (maxV < 0.1) restingRef.current += 1;
        else restingRef.current = 0;
        return next;
      });
      alphaRef.current *= 0.985;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visibleEdges, viewMode, bookId]);

  const selected = entities.find(e => e.id === selectedEntityId) || entities[0];
  const toggleEdge = (r) => setEdgeFilter(f => ({...f, [r]: !f[r]}));
  const resetLayout = () => {
    anchorsRef.current = deepClonePos(seedPositions);
    setLivePositions(deepClonePos(seedPositions));
    velRef.current = {};
    reignite(1.0);
  };

  const overlays = viewMode === "social"
    ? <SocialOverlay regions={SOCIAL_REGIONS} entities={entities} locale={locale}
        selectedEntityId={selectedEntityId} setSelectedEntityId={setSelectedEntityId} />
    : <ThemesOverlay />;

  return (
    <div className={gvClass} style={gvStyle} ref={gvRef}>

      {/* ===== LEFT PANEL — always in DOM, hidden via CSS when collapsed ===== */}
      <div className="gv-left">
        <div className="gv-drag-handle gv-drag-handle-right"
          onPointerDown={startDrag('left')}
          onDoubleClick={() => { setLeftCollapsed(c => !c); if (leftCollapsed) setLeftW(260); }} />
        <div className="gv-left-content">
          {/* Mode switcher */}
          <div className="gv-section-label" style={{marginBottom:10}}>{tt("gv.view")}</div>
          <div className="gv-mode-switch">
            {[
              { k: "social", en: "Social", "zh-CN": "人物关系", "zh-TW":"人物關係", ja: "人間関係", ko: "사회", fr: "Social", es: "Social", de: "Sozial" },
              { k: "themes", en: "Themes", "zh-CN": "主题图", "zh-TW":"主題圖", ja: "テーマ", ko: "주제", fr: "Thèmes", es: "Temas", de: "Themen" },
            ].map(m => (
              <button key={m.k}
                className={"gv-mode-btn " + (viewMode === m.k ? "active" : "")}
                onClick={() => { setViewMode(m.k); setSelectedEdgeId(null); }}>
                {m[locale] || m.en}
              </button>
            ))}
          </div>

          <div className="gv-section-label" style={{marginTop:22, marginBottom:10}}>{tt("gv.edgeTypes")}</div>
          {["STRUCTURAL","INTERACTS","ASSERTS","INFLUENCES","PREDICTS","SYMBOLIZES"].map(r => (
            <label key={r} className="gv-filter-row">
              <input type="checkbox" checked={edgeFilter[r]} onChange={() => toggleEdge(r)} />
              <svg viewBox="0 0 28 8" width="28" height="8" style={{marginRight:8, flexShrink:0}}>
                {edgeLegendArt(r)}
              </svg>
              <span className="lbl" style={{fontFamily:"'Spectral', serif", fontStyle:"italic", fontSize:13, letterSpacing:".005em"}}>{tt("rel."+r)}</span>
              <span className="count">{edgeCounts[r]}</span>
            </label>
          ))}

          {viewMode === "social" && (
            <VolumeNavigator
              activeChapter={activeChapter}
              setActiveChapter={setActiveChapter}
              locale={locale}
              tt={tt}
              book={activeBook}
              chapters={[...new Set(entities.flatMap(e => e.chapters || []))].sort((a, b) => a - b)}
            />
          )}
        </div>
      </div> {/* end left panel */}


      <GraphCanvas
        visibleEntities={visibleEntities}
        visibleEdges={visibleEdges}
        positions={livePositions}
        setLivePositions={setLivePositions}
        anchorsRef={anchorsRef}
        draggedRef={draggedRef}
        reignite={reignite}
        resetLayout={resetLayout}
        entities={entities}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        selectedEdgeId={selectedEdgeId}
        setSelectedEdgeId={setSelectedEdgeId}
        locale={locale}
        tt={tt}
        selected={selected}
        fullscreen={fullscreen}
        toggleFullscreen={() => setFullscreen(f => !f)}
        viewMode={viewMode}
        overlays={overlays}
      />

      {/* ===== RIGHT PANEL — always in DOM ===== */}
      <div className="gv-right">
        <div className="gv-drag-handle gv-drag-handle-left"
          onPointerDown={startDrag('right')}
          onDoubleClick={() => { setRightCollapsed(c => !c); if (rightCollapsed) setRightW(380); }} />
        <div className="gv-right-content">
          <PanelEntity entity={selected} ctx={ctx} selectedEdgeId={selectedEdgeId} setSelectedEdgeId={setSelectedEdgeId} />
        </div>
      </div> {/* end right panel */}
    </div>
  );
}

// ============== Edge styling ==============
const EDGE_COLORS = {
  STRUCTURAL: "#8a6e36", INTERACTS:  "#b8954a", ASSERTS:    "#a04a2a",
  INFLUENCES: "#5a6a3f", PREDICTS:   "#4a6a8a", SYMBOLIZES: "#6a4a8a",
};
const EDGE_DASH = {
  STRUCTURAL: null, INTERACTS: null, ASSERTS: null,
  INFLUENCES: "8 4 2 4", PREDICTS: "1 5", SYMBOLIZES: null,
};
const EDGE_WIDTH = {
  STRUCTURAL: 2.0, INTERACTS: 1.5, ASSERTS: 1.4,
  INFLUENCES: 1.2, PREDICTS: 1.1, SYMBOLIZES: 1.0,
};
const EDGE_HAS_ARROW = {
  STRUCTURAL: false, INTERACTS: true, ASSERTS: true,
  INFLUENCES: true, PREDICTS: true, SYMBOLIZES: false,
};
const EDGE_MARKER_SIZE = {
  STRUCTURAL: 0, INTERACTS: 5, ASSERTS: 6.5,
  INFLUENCES: 4.5, PREDICTS: 4, SYMBOLIZES: 0,
};

function edgeLegendArt(r) {
  const col = EDGE_COLORS[r];
  if (r === "STRUCTURAL")  return <line x1="2" y1="4" x2="26" y2="4" stroke={col} strokeWidth="2.2" strokeLinecap="round" />;
  if (r === "INTERACTS")   return (<><line x1="2" y1="4" x2="22" y2="4" stroke={col} strokeWidth="1.5" strokeLinecap="round" /><path d="M 21 2 L 26 4 L 21 6 z" fill={col} /></>);
  if (r === "ASSERTS")     return (<><line x1="2" y1="4" x2="20" y2="4" stroke={col} strokeWidth="1.5" /><path d="M 18 1 L 26 4 L 18 7 L 21 4 z" fill={col} /></>);
  if (r === "INFLUENCES")  return (<><line x1="2" y1="4" x2="22" y2="4" stroke={col} strokeWidth="1.3" strokeDasharray="6 3 1.5 3" strokeLinecap="round" /><path d="M 22 2 L 26 4 L 22 6 z" fill={col} /></>);
  if (r === "PREDICTS")    return (<><line x1="2" y1="4" x2="22" y2="4" stroke={col} strokeWidth="1.2" strokeDasharray="0.5 3" strokeLinecap="round" /><path d="M 22 2 L 26 4 L 22 6" fill="none" stroke={col} strokeWidth="1.2" strokeLinejoin="round" /></>);
  if (r === "SYMBOLIZES")  return (<><line x1="2" y1="3" x2="26" y2="3" stroke={col} strokeWidth="1.1" /><line x1="2" y1="6" x2="26" y2="6" stroke={col} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.7" /></>);
  return null;
}

function nodeRadius(entity) {
  return entity.mentions > 100 ? 36 : entity.mentions > 40 ? 28 : 22;
}

// Write a single edge's geometry (paths' d attribute + label transform)
// directly to the DOM. Called from the drag fast-path and from
// useLayoutEffect after every render. Reads positions from the live ref.
function applyEdgeGeometry(ed, positions, edgeElsMap) {
  const a = positions[ed.src], b = positions[ed.dst];
  if (!a || !b) return;
  const g = edgeElsMap.get(ed.id);
  if (!g) return;
  const { d, midX, midY, angle } = edgePath(a, b, ed.rA, ed.rB, ed.parallelIdx, ed.parallelCount, ed.curveSign);
  let labelAngle = angle;
  if (labelAngle > 90) labelAngle -= 180;
  if (labelAngle < -90) labelAngle += 180;
  // Every <path> in this edge group shares the same d (glow / body / double /
  // flow are styled differently but follow the same curve).
  const paths = g.getElementsByTagName("path");
  for (let i = 0; i < paths.length; i++) paths[i].setAttribute("d", d);
  const label = g.querySelector("[data-label]");
  if (label) label.setAttribute("transform", `translate(${midX} ${midY}) rotate(${labelAngle})`);
}

// After any React render, push every position from the ref into the DOM.
// Cheap (a setAttribute per node + per edge group) and guarantees the
// rendered SVG is always in sync with the ref, even if React's JSX has
// stale "x"/"y" because state lagged behind a drag.
function syncDomFromRef(positions, nodeEls, edgeEls, edgeRenderData) {
  for (const [id, el] of nodeEls) {
    const p = positions[id];
    if (el && p) el.setAttribute("transform", `translate(${p.x} ${p.y})`);
  }
  for (const ed of edgeRenderData) {
    applyEdgeGeometry(ed, positions, edgeEls);
  }
}

function edgePath(a, b, rA, rB, parallelIdx, parallelCount, curveSign = 1) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1) return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, midX: a.x, midY: a.y, angle: 0 };
  const ux = dx/len, uy = dy/len;
  const sx = a.x + ux*rA, sy = a.y + uy*rA;
  const ex = b.x - ux*rB, ey = b.y - uy*rB;
  const nx = -uy, ny = ux;
  let offset;
  if (parallelCount <= 1) {
    // Curve sign is precomputed per-edge from a stable hash of its endpoints.
    // The old formula derived it from (a.x + b.y) | 0, which flipped every
    // pixel during a drag — that was the source of the edge wriggle.
    offset = curveSign * Math.min(12, len * 0.04);
  } else {
    const center = (parallelCount - 1) / 2;
    offset = (parallelIdx - center) * 28;
  }
  const mx = (sx + ex) / 2 + nx * offset;
  const my = (sy + ey) / 2 + ny * offset;
  const cx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
  const cy = 0.25 * sy + 0.5 * my + 0.25 * ey;
  // tangent angle at midpoint of quadratic = vector from c1 to c2 ≈ ex - sx direction
  const angle = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
  return {
    d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
    midX: cx, midY: cy, angle,
  };
}

// =========================== Overlays (mode backgrounds) ===========================
function SocialOverlay({ regions, entities, locale, selectedEntityId, setSelectedEntityId }) {
  // Is *any* region in focus right now? When so, dim the others to push the
  // active region forward as a clear spotlight.
  const anyActive = regions.some(r =>
    r.members.includes(selectedEntityId) || r.entity === selectedEntityId
  );
  return (
    <g className="social-overlay">
      {/* shared gradient defs — one per region for the soft-pool effect.
          When a region is active its pool brightens dramatically; when
          something else is active the pool dims past background. */}
      <defs>
        {regions.map(r => {
          const isActive = r.members.includes(selectedEntityId) || r.entity === selectedEntityId;
          const dim = anyActive && !isActive;
          return (
            <radialGradient key={r.id} id={`reg-grad-${r.id}`} cx="50%" cy="50%" r="65%">
              <stop offset="0%"  stopColor="rgba(184,149,74,1)" stopOpacity={isActive ? 0.34 : (dim ? 0.04 : 0.10)} />
              <stop offset="55%" stopColor="rgba(184,149,74,1)" stopOpacity={isActive ? 0.14 : (dim ? 0.015 : 0.03)} />
              <stop offset="100%" stopColor="rgba(184,149,74,1)" stopOpacity="0" />
            </radialGradient>
          );
        })}
      </defs>

      {regions.map((r) => {
        const isActive = r.members.includes(selectedEntityId) || r.entity === selectedEntityId;
        const dim = anyActive && !isActive;
        // Faction regions carry an explicit `label` (取经队伍 / 天庭 …) — a locale
        // map or string — which wins. Otherwise fall back to the representative
        // entity's localized name, then a raw title.
        const pick = (v) => typeof v === "string" ? v : (v && (v[locale] || v.en || Object.values(v)[0]));
        const title = (r.label && pick(r.label))
          || (r.entity && window.entityLocale(r.entity, locale)?.name)
          || pick(r.title);
        return (
          <g key={r.id}
             style={{cursor: r.entity ? "pointer" : "default", transition: "opacity 0.4s", opacity: dim ? 0.42 : 1}}
             onClick={() => r.entity && setSelectedEntityId(r.entity)}>
            {/* Layer 1: soft radial pool */}
            <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              fill={`url(#reg-grad-${r.id})`}
              style={{transition: "all 0.3s"}} />
            {/* Layer 2: pulsing outer halo when active — breathing spotlight */}
            {isActive && (<>
              <ellipse cx={r.cx} cy={r.cy} rx={r.rx + 4} ry={r.ry + 4}
                fill="none" stroke="rgba(184,149,74,0.45)" strokeWidth="1">
                <animate attributeName="rx" values={`${r.rx + 4};${r.rx + 14};${r.rx + 4}`} dur="3.2s" repeatCount="indefinite" />
                <animate attributeName="ry" values={`${r.ry + 4};${r.ry + 14};${r.ry + 4}`} dur="3.2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.5;0.1;0.5" dur="3.2s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={r.cx} cy={r.cy} rx={r.rx + 2} ry={r.ry + 2}
                fill="none" stroke="rgba(184,149,74,0.30)" strokeWidth="0.6" />
            </>)}
            {/* Layer 3: dashed boundary */}
            <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              fill="none"
              stroke={isActive ? "rgba(184,149,74,0.75)" : "rgba(184,149,74,0.28)"}
              strokeWidth={isActive ? 1.4 : 0.9}
              strokeDasharray={isActive ? "6 4" : "4 6"}
              style={{transition: "all 0.3s"}} />
            {/* Layer 4: title — flanking gold rules + center dot + serif italic */}
            <g transform={`translate(${r.cx} ${r.cy - r.ry + 22})`}>
              <line x1={-Math.min(72, r.rx * 0.52)} y1="0" x2={isActive ? -26 : -22} y2="0"
                stroke={isActive ? "var(--gold)" : "rgba(138,110,54,0.3)"} strokeWidth={isActive ? 0.9 : 0.7}
                style={{transition: "all 0.3s"}} />
              <line x1={isActive ? 26 : 22} y1="0" x2={Math.min(72, r.rx * 0.52)} y2="0"
                stroke={isActive ? "var(--gold)" : "rgba(138,110,54,0.3)"} strokeWidth={isActive ? 0.9 : 0.7}
                style={{transition: "all 0.3s"}} />
              {isActive && (
                <circle cx="0" cy="0" r="2.6" fill="none" stroke="var(--gold)" strokeWidth="0.8">
                  <animate attributeName="r" values="2.6;3.6;2.6" dur="2.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r={isActive ? 1.8 : 1.4}
                fill={isActive ? "var(--gold)" : "rgba(138,110,54,0.5)"}
                style={{transition: "all 0.3s"}} />
              <text textAnchor="middle" dy={isActive ? "-9" : "-7"}
                fontFamily="Spectral, serif" fontStyle="italic" fontWeight={isActive ? 500 : 400}
                fontSize={isActive ? 16 : 14}
                fill={isActive ? "#5a4828" : "#8a6e36"}
                opacity={isActive ? 1 : 0.72}
                letterSpacing={isActive ? "0.1em" : "0.08em"}
                style={{transition: "all 0.3s"}}>
                {title}
              </text>
              {/* Subtle subtitle when active: shows member count in words */}
              {isActive && (
                <text textAnchor="middle" dy="9"
                  fontFamily="JetBrains Mono, monospace" fontSize="9"
                  fill="var(--gold-deep)" letterSpacing="0.32em"
                  opacity="0.85">
                  {String(r.members.length).padStart(2, "0")} {locale === "en" ? "MEMBERS" : locale === "zh-CN" ? "成员" : locale === "zh-TW" ? "成員" : locale === "ja" ? "メンバー" : locale === "ko" ? "구성원" : locale === "fr" ? "MEMBRES" : locale === "es" ? "MIEMBROS" : "MITGLIEDER"}
                </text>
              )}
            </g>
            {/* Layer 5: member-count badge bottom-right (hidden when active — info moved to title block) */}
            {!isActive && (
              <text x={r.cx + r.rx - 12} y={r.cy + r.ry - 8}
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace" fontSize="9"
                fill="rgba(138,110,54,0.55)" opacity={0.5}
                letterSpacing="0.22em"
                style={{transition: "opacity 0.3s"}}>
                {String(r.members.length).padStart(2, "0")}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ThemesOverlay() {
  // Soft radial glow at center
  return (
    <g className="themes-overlay">
      <defs>
        <radialGradient id="themes-bg">
          <stop offset="0%"  stopColor="#b8954a" stopOpacity="0.10" />
          <stop offset="60%" stopColor="#b8954a" stopOpacity="0.02" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="480" cy="420" r="320" fill="url(#themes-bg)" />
      <text x="480" y="425" textAnchor="middle"
        fontFamily="Spectral, serif" fontStyle="italic" fontSize="14"
        fill="rgba(184,149,74,0.35)" letterSpacing="0.4em">THEMES</text>
    </g>
  );
}

function ChronicleOverlay({ chToX, axisY }) {
  return (
    <g className="chronicle-overlay">
      <line x1="60" y1={axisY} x2="1380" y2={axisY} stroke="#8a6e36" strokeWidth="0.8" opacity="0.4" />
      {[1, 12, 25, 35, 47, 56, 61].map(ch => (
        <g key={ch} transform={`translate(${chToX(ch)} ${axisY})`}>
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#8a6e36" strokeWidth="1" opacity="0.5" />
          <text y="20" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10"
            fill="#8a6e36" letterSpacing="0.08em" opacity="0.7">ch{ch}</text>
        </g>
      ))}
      {[
        { x: chToX(6),  label: "Opening — Meryton" },
        { x: chToX(25), label: "Misreading — Hunsford & Letter" },
        { x: chToX(45), label: "Crisis — Lydia & Pemberley" },
        { x: chToX(58), label: "Resolution" },
      ].map((p, i) => (
        <text key={i} x={p.x} y={axisY - 280} textAnchor="middle"
          fontFamily="Spectral, serif" fontStyle="italic" fontSize="13"
          fill="rgba(138,110,54,0.5)" letterSpacing="0.04em">{p.label}</text>
      ))}
    </g>
  );
}

// =========================== Graph canvas ===========================
function GraphCanvas({ visibleEntities, visibleEdges, positions, setLivePositions, anchorsRef, draggedRef, reignite, resetLayout, entities, selectedEntityId, setSelectedEntityId, selectedEdgeId, setSelectedEdgeId, locale, tt, selected, fullscreen, toggleFullscreen, viewMode, overlays }) {
  const { useState, useRef, useEffect, useLayoutEffect, useCallback } = React;
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  // ====== DOM-direct rendering of positions ======
  // The key insight from looking at how other smooth force-directed graphs
  // are built (eg. MiroFish): never go through React state for the per-frame
  // position updates. React's reconciliation, even with memo, is too coarse
  // for 60Hz drag-induced re-renders of 25 nodes + 80 edges.
  //
  // Instead: positions live in a ref (positionsRef). React state still drives
  // *structure* (which nodes/edges exist) and *visual styling* (selection,
  // hover, mute), but position attributes are written directly to the DOM
  // by useLayoutEffect after render, and by the drag handler during drag.
  // No React re-render is scheduled by a position change. Drag is silky.
  const positionsRef = useRef(positions);
  // Sync ref from state when state changes — but never during a drag, or we'd
  // clobber the cursor-tracking position with the stale state value.
  useLayoutEffect(() => {
    if (!draggedRef.current) positionsRef.current = positions;
  }, [positions]);

  // Stable Maps from id → DOM element.
  const nodeElsRef = useRef(new Map());
  const edgeElsRef = useRef(new Map());

  // edge geometry as a closure so the drag fast-path and the layout sync
  // both use the same formula. Returns null if either endpoint is missing.
  const edgeRenderData = useRef([]);
  // Maintain a quick lookup from edge id → { rA, rB, parallelIdx, parallelCount, label }
  // computed once per React render, used by useLayoutEffect and drag.
  edgeRenderData.current = (() => {
    const pairKey = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;
    const pairCount = {};
    visibleEdges.forEach(e => { const k = pairKey(e.src, e.dst); pairCount[k] = (pairCount[k] || 0) + 1; });
    const pairIdx = {};
    return visibleEdges.map(edge => {
      const k = pairKey(edge.src, edge.dst);
      const idx = pairIdx[k] || 0;
      pairIdx[k] = idx + 1;
      const srcE = entities.find(en => en.id === edge.src);
      const dstE = entities.find(en => en.id === edge.dst);
      // Stable curve direction per edge — derived from the edge id so it
      // never changes during a drag. (The original formula used current
      // positions, which flipped every pixel and made edges wriggle.)
      let h = 0;
      for (let i = 0; i < edge.id.length; i++) h = (h * 31 + edge.id.charCodeAt(i)) | 0;
      const curveSign = (h & 1) === 0 ? 1 : -1;
      return {
        id: edge.id, src: edge.src, dst: edge.dst,
        rA: srcE ? nodeRadius(srcE) : 22,
        rB: dstE ? nodeRadius(dstE) : 22,
        parallelIdx: idx,
        parallelCount: pairCount[k],
        curveSign,
      };
    });
  })();

  // Re-apply all DOM positions from the ref after every render. Runs
  // synchronously before paint, so the user never sees a stale frame.
  // For non-drag renders (selection / hover changes) this just rewrites
  // the same values — the SVG repaint is identical.
  useLayoutEffect(() => {
    syncDomFromRef(positionsRef.current, nodeElsRef.current, edgeElsRef.current, edgeRenderData.current);
  });

  // Node drag: bypass React entirely until release.
  const onNodePointerDown = (entityId) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const t = transformRef.current;
    const worldX = (e.clientX - rect.left - t.x) / t.k;
    const worldY = (e.clientY - rect.top  - t.y) / t.k;
    const start = positionsRef.current[entityId] || { x: 0, y: 0 };
    const offsetX = worldX - start.x;
    const offsetY = worldY - start.y;
    let moved = false;

    // rAF-coalesced flush: at most one DOM update per display frame.
    let pendingEv = null;
    let rafScheduled = false;
    const flush = () => {
      rafScheduled = false;
      const ev = pendingEv;
      if (!ev) return;
      pendingEv = null;
      if (!moved && (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) <= 3)) return;
      if (!moved) {
        moved = true;
        draggedRef.current = entityId;
        reignite(0.3);
      }
      const r = svgRef.current.getBoundingClientRect();
      const tt2 = transformRef.current;
      const wx = (ev.clientX - r.left - tt2.x) / tt2.k - offsetX;
      const wy = (ev.clientY - r.top  - tt2.y) / tt2.k - offsetY;
      // 1) mutate ref + anchor (NOT React state — no re-render)
      positionsRef.current[entityId] = { x: wx, y: wy };
      if (anchorsRef.current[entityId]) {
        anchorsRef.current[entityId].x = wx;
        anchorsRef.current[entityId].y = wy;
      }
      // 2) DOM-direct: move the dragged node's <g> and recompute edges touching it
      const nodeEl = nodeElsRef.current.get(entityId);
      if (nodeEl) nodeEl.setAttribute("transform", `translate(${wx} ${wy})`);
      for (const ed of edgeRenderData.current) {
        if (ed.src !== entityId && ed.dst !== entityId) continue;
        applyEdgeGeometry(ed, positionsRef.current, edgeElsRef.current);
      }
    };
    const onMove = (ev) => {
      pendingEv = ev;
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(flush);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      draggedRef.current = null;
      if (!moved) {
        // pure click: select the entity
        setSelectedEntityId(entityId);
        setSelectedEdgeId(null);
      } else {
        // drag end: commit positions to React state so the sim and other
        // components see the new layout. DOM already matches; no flash.
        setLivePositions({ ...positionsRef.current });
        reignite(0.2);
      }
    };
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
  };

  const WORLD_W = 960;
  const WORLD_H = 840;

  const fitToContainer = () => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 50) return;
    const k = Math.min(rect.width / WORLD_W, rect.height / WORLD_H) * 0.94;
    const x = (rect.width  - WORLD_W * k) / 2;
    const y = (rect.height - WORLD_H * k) / 2;
    setTransform({ x, y, k });
  };

  useEffect(() => { fitToContainer(); }, []);
  // refit when mode changes (recenter)
  useEffect(() => { fitToContainer(); }, [viewMode]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setTransform(prev => {
        const newK = Math.max(0.25, Math.min(5, prev.k * factor));
        const actual = newK / prev.k;
        return { k: newK, x: cx - (cx - prev.x) * actual, y: cy - (cy - prev.y) * actual };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-node]")) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y, moved: false };
    setIsPanning(true);
  };
  const handleMouseMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    // Capture origin into locals: the setTransform updater can run after
    // mouseup/mouseleave nulls dragRef.current, so it must not read it lazily.
    if (d.moved) {
      const ox = d.origX, oy = d.origY;
      setTransform(t => ({ ...t, x: ox + dx, y: oy + dy }));
    }
  };
  const handleMouseUp = () => {
    if (dragRef.current && !dragRef.current.moved) setSelectedEdgeId(null);
    dragRef.current = null;
    setIsPanning(false);
  };
  const zoomBy = (factor) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    setTransform(prev => {
      const newK = Math.max(0.25, Math.min(5, prev.k * factor));
      const actual = newK / prev.k;
      return { k: newK, x: cx - (cx - prev.x) * actual, y: cy - (cy - prev.y) * actual };
    });
  };

  // parallel edge counting
  const pairKey = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;
  const pairCount = {};
  visibleEdges.forEach(e => { const k = pairKey(e.src, e.dst); pairCount[k] = (pairCount[k] || 0) + 1; });
  const pairIdx = {};
  const edgeRender = visibleEdges.map(edge => {
    const k = pairKey(edge.src, edge.dst);
    const idx = pairIdx[k] || 0;
    pairIdx[k] = idx + 1;
    return { edge, parallelIdx: idx, parallelCount: pairCount[k] };
  });

  return (
    <div className="gv-canvas">
      <svg
        ref={svgRef}
        width="100%" height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
      >
        <defs>
          <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x % (32*transform.k)} ${transform.y % (32*transform.k)}) scale(${transform.k})`}>
            <circle cx="16" cy="16" r="0.7" fill="#c8b88a" opacity="0.45" />
          </pattern>
          {Object.entries(EDGE_COLORS).map(([rel, col]) => (
            EDGE_HAS_ARROW[rel] ? (
              <marker key={rel} id={`arr-${rel}`} viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth={EDGE_MARKER_SIZE[rel]} markerHeight={EDGE_MARKER_SIZE[rel]} orient="auto">
                {rel === "ASSERTS"
                  ? <path d="M 0 1 L 10 5 L 0 9 L 3 5 z" fill={col} />
                  : rel === "PREDICTS"
                  ? <path d="M 1 2 L 10 5 L 1 8" fill="none" stroke={col} strokeWidth="1.4" strokeLinejoin="round" />
                  : <path d="M 0 0 L 10 5 L 0 10 z" fill={col} />
                }
              </marker>
            ) : null
          ))}
          <marker id="arr-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8954a" />
          </marker>
          <marker id="arr-mute" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d9cfb3" opacity="0.6" />
          </marker>
        </defs>


      {/* ===== GRAPH SVG ===== */}

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* mode-specific background overlays */}
          {overlays}

          {/* Edges — paths have no d in JSX; useLayoutEffect / drag handler
              write d directly to the DOM each frame for jitter-free updates. */}
          {edgeRender.map(({edge, parallelIdx, parallelCount}) => {
            if (!positions[edge.src] || !positions[edge.dst]) return null;
            const touchesSelected = selectedEntityId && (edge.src === selectedEntityId || edge.dst === selectedEntityId);
            const isSel = edge.id === selectedEdgeId || touchesSelected;
            const isHovered = hoveredEdgeId === edge.id;
            const isMute = selectedEntityId && !isSel;
            const color = (isSel || isHovered) ? "#b8954a" : isMute ? "#d9cfb3" : EDGE_COLORS[edge.rel];
            const dash = EDGE_DASH[edge.rel];
            const baseW = EDGE_WIDTH[edge.rel];
            const hasArrow = EDGE_HAS_ARROW[edge.rel];
            const isDouble = edge.rel === "SYMBOLIZES";
            const isStructural = edge.rel === "STRUCTURAL";
            // Label only the specific edge under the cursor / explicitly clicked —
            // NOT every edge of a selected node (a hub like Alice has dozens, which
            // turns the centre into an unreadable pile of relation tags).
            const showLabel = isHovered || edge.id === selectedEdgeId;
            const label = window.t("rel."+edge.rel);

            return (
              <g key={edge.id}
                ref={el => { if (el) edgeElsRef.current.set(edge.id, el); else edgeElsRef.current.delete(edge.id); }}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(edge.id); }}
                style={{cursor:"pointer"}}>
                {/* invisible thick hit-area */}
                <path fill="none" stroke="transparent" strokeWidth="14" />
                {isStructural && !isMute && (
                  <path fill="none" stroke={color}
                    strokeWidth={isSel ? 5 : 4} opacity="0.12" strokeLinecap="round" />
                )}
                <path fill="none" stroke={color}
                  strokeWidth={(isSel || isHovered) ? baseW + 1.0 : baseW}
                  strokeDasharray={(isSel || isHovered) ? null : dash}
                  strokeLinecap="round"
                  opacity={isMute ? 0.16 : ((isSel || isHovered) ? 1 : 0.42)}
                  markerEnd={hasArrow ? (isSel ? "url(#arr-sel)" : isMute ? "url(#arr-mute)" : `url(#arr-${edge.rel})`) : null}
                  style={{transition: "stroke-width 0.2s, opacity 0.2s"}} />
                {isDouble && !isMute && (
                  <path fill="none" stroke={color}
                    strokeWidth="0.7" opacity={(isSel || isHovered) ? 0.9 : 0.55}
                    strokeDasharray="3 3"
                    style={{transform: "translate(0, 3px)"}} />
                )}
                {isSel && (
                  <path fill="none" stroke={color}
                    strokeWidth={baseW + 1.2} strokeDasharray="4 6" opacity="0.6"
                    style={{animation: "lg-edge-flow 1.4s linear infinite"}} />
                )}
                {showLabel && (
                  <g data-label>
                    <rect x={-label.length * 3.6 - 4} y={-9} width={label.length * 7.2 + 8} height={15}
                      fill="#fbf7ea" stroke={color} strokeWidth="0.6" opacity="0.96" rx="3" />
                    <text textAnchor="middle" dy="3"
                      fontFamily="Spectral, serif" fontStyle="italic" fontSize="10" fill={color}
                      letterSpacing="0.04em">{label}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes — wrapping <g> per node carries the transform that
              positions it. useLayoutEffect / drag handler write transform
              directly via the ref Map; React never re-renders for position. */}
          {visibleEntities.map(entity => {
            const p = positions[entity.id];
            if (!p) return null;
            const sel = entity.id === selectedEntityId;
            const isMute = selectedEntityId && selectedEntityId !== entity.id && !visibleEdges.some(e => (e.src === selectedEntityId && e.dst === entity.id) || (e.dst === selectedEntityId && e.src === entity.id));
            const loc = window.entityLocale(entity.id, locale);
            const name = loc?.name || entity.name;
            const isDragging = draggedRef.current === entity.id;
            return (
              <GraphNode
                key={entity.id}
                entity={entity}
                name={name}
                sel={sel}
                mute={isMute}
                dragging={isDragging}
                onPointerDown={onNodePointerDown(entity.id)}
                nodeRef={el => { if (el) nodeElsRef.current.set(entity.id, el); else nodeElsRef.current.delete(entity.id); }}
              />
            );
          })}
        </g>
      </svg>

      <div className="gv-canvas-controls">
        <button title={tt("gv.zoomIn")} onClick={() => zoomBy(1.3)}>＋</button>
        <button title={tt("gv.zoomOut")} onClick={() => zoomBy(1/1.3)}>−</button>
        <button title={tt("gv.fit")} onClick={fitToContainer}>◳</button>
        <button title={locale === "en" ? "Reset layout" : locale === "zh-CN" ? "重置布局" : locale === "zh-TW" ? "重置布局" : locale === "ja" ? "レイアウトリセット" : locale === "ko" ? "레이아웃 초기화" : locale === "fr" ? "Réinitialiser" : locale === "es" ? "Reiniciar" : "Zurücksetzen"}
          onClick={resetLayout}>↻</button>
        <button title={fullscreen ? tt("gv.fullscreenOff") : tt("gv.fullscreenOn")}
          onClick={toggleFullscreen}
          style={{color: fullscreen ? "var(--gold)" : undefined}}>
          {fullscreen ? "⤢" : "⛶"}
        </button>
      </div>

      <div className="gv-canvas-status">
        <span>{visibleEntities.length} {tt("gv.status.nodes")}</span>
        <span>{visibleEdges.length} {tt("gv.status.edges")}</span>
        <span style={{color:"var(--gold-deep)"}}>{Math.round(transform.k * 100)}%</span>
      </div>

      <div className="gv-canvas-hint">
        <span>{locale === "en" ? "Drag nodes · scroll to zoom · drag canvas to pan" :
               locale === "zh-CN" ? "拖拽节点 · 滚轮缩放 · 拖动画布平移" :
               locale === "zh-TW" ? "拖曳節點 · 滾輪縮放 · 拖動畫布平移" :
               locale === "ja" ? "ノードをドラッグ · スクロールで拡縮 · 画布をドラッグで移動" :
               locale === "ko" ? "노드 드래그 · 스크롤 확대 · 캔버스 드래그 이동" :
               locale === "fr" ? "Glisser les nœuds · molette zoom · glisser pour déplacer" :
               locale === "es" ? "Arrastra nodos · rueda zoom · arrastra para mover" :
               "Knoten ziehen · scrollen zoomt · Canvas ziehen verschiebt"}</span>
      </div>
    </div>
  );
}

// ============== Node ==============
// All internal elements are positioned at (0, 0). The wrapping <g> carries
// the transform — written via ref by useLayoutEffect / the drag handler.
// JSX never includes x/y, so React re-renders don't disturb position.
const GraphNode = React.memo(function GraphNode({ entity, name, sel, mute, dragging, onPointerDown, nodeRef }) {
  const { useState } = React;
  const [hover, setHover] = useState(false);
  const baseR = nodeRadius(entity);
  const r = baseR * (dragging ? 1.1 : sel ? 1.06 : hover ? 1.04 : 1);
  const opacity = mute ? 0.35 : 1;
  const stroke = (sel || dragging) ? "#b8954a" : (hover ? "#8a6e36" : "#a08758");
  const strokeWidth = (sel || dragging) ? 2.4 : 1.2;
  const fill = (sel || dragging) ? "#fbf3dc" : "#fbf7ea";

  let shape;
  if (entity.type === "agent") {
    shape = <circle cx="0" cy="0" r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (entity.type === "object") {
    shape = <rect x={-r} y={-r} width={r*2} height={r*2} rx="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (entity.type === "event") {
    shape = <rect x={-r} y={-r} width={r*2} height={r*2} rx="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth} transform="rotate(45)" />;
  } else if (entity.type === "concept") {
    const w = r*1.05, h = r*1.2;
    const pts = [`0,${-h}`,`${w*0.95},${-h/2}`,`${w*0.95},${h/2}`,`0,${h}`,`${-w*0.95},${h/2}`,`${-w*0.95},${-h/2}`].join(" ");
    shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  const halo = sel && (
    <circle cx="0" cy="0" r={r + 14} fill="none" stroke="#b8954a" strokeWidth="0.6" opacity="0.4">
      <animate attributeName="r" values={`${r+10};${r+18};${r+10}`} dur="2.6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.6s" repeatCount="indefinite" />
    </circle>
  );

  const avatar = window.avatarFor(entity);
  const avatarScale = r / 24;
  const shortName = name.length > 18 ? name.slice(0, 18) + "…" : name;
  const labelY = baseR + 18;

  return (
    <g data-node
       data-id={entity.id}
       ref={nodeRef}
       style={{cursor: dragging ? "grabbing" : "grab", opacity, transition:"opacity 0.2s"}}
       onPointerDown={onPointerDown}
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}>
      {halo}
      {shape}
      <g transform={`scale(${avatarScale})`}>
        {avatar}
      </g>
      <text x="0" y={labelY} textAnchor="middle"
        fontFamily="Spectral, serif" fontSize={baseR > 28 ? 14 : 12.5}
        fill={sel ? "#8a6e36" : "#1a1a1a"}
        fontStyle={entity.type === "concept" ? "italic" : "normal"}
        fontWeight={sel ? 500 : 400}
        style={{transition:"fill 0.2s"}}>{shortName}</text>
      {(sel || hover) && (
        <text x="0" y={labelY + 13} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#8a6e36"
          letterSpacing="1.4" opacity="0.8">{entity.mentions} mentions</text>
      )}
    </g>
  );
}, (prev, next) =>
  prev.sel === next.sel &&
  prev.mute === next.mute &&
  prev.dragging === next.dragging &&
  prev.name === next.name &&
  prev.entity === next.entity
  // onPointerDown and nodeRef are intentionally not compared:
  // their identities change every render but their behaviour is stable.
);

// ============== Side panel ==============
function PanelEntity({ entity, ctx, selectedEdgeId, setSelectedEdgeId }) {
  const { tt, data, locale, entities, edges, gotoEntity, glucose: bookGlucose } = ctx;
  const { useState } = React;
  const [tab, setTab] = useState("outgoing");

  if (!entity) return <div className="empty">No entity selected</div>;
  const safeAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
  const safeChapters = Array.isArray(entity.chapters) ? entity.chapters : [];
  const loc = window.entityLocale(entity.id, locale);
  const localizedName = loc?.name || entity.name;
  const localizedGloss = loc?.gloss || entity.summary;

  const out = edges.filter(e => e.src === entity.id);
  const inc = edges.filter(e => e.dst === entity.id);
  const glucose = bookGlucose.filter(g => g.entity === entity.id);
  const mentionCount = entity.mentions;

  const tabs = [
    { k: "outgoing", l: tt("gv.panel.outgoing"), n: out.length },
    { k: "incoming", l: tt("gv.panel.incoming"), n: inc.length },
    { k: "glucose",  l: tt("gv.panel.glucose"),  n: glucose.length },
    { k: "mentions", l: tt("gv.panel.mentions"), n: mentionCount },
  ];

  return (
    <>
      <div className="gv-panel-head">
        <div style={{display:"flex", gap:14, alignItems:"start", marginBottom:8}}>
          <svg viewBox="-22 -22 44 44" width="60" height="60" style={{flexShrink:0}}>
            {entity.type === "agent"   && <circle cx="0" cy="0" r="20" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
            {entity.type === "object"  && <rect x="-19" y="-19" width="38" height="38" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
            {entity.type === "event"   && <rect x="-16" y="-16" width="32" height="32" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" transform="rotate(45)" />}
            {entity.type === "concept" && <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="#fbf7ea" stroke="#8a6e36" strokeWidth="1.2" />}
            {window.avatarFor(entity)}
          </svg>
          <div style={{flex:1, minWidth:0}}>
            <div className="gv-panel-type">{({agent:"○ "+tt("type.agent"),object:"▢ "+tt("type.object"),event:"◇ "+tt("type.event"),concept:"⬡ "+tt("type.concept")})[entity.type].toUpperCase()}</div>
            <div className="gv-panel-name"><em>{localizedName}</em></div>
            {locale !== "en" && entity.name !== localizedName && (
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:"var(--paper-text-mute)", letterSpacing:".06em", marginTop:2}}>
                <span style={{color:"var(--gold-deep)", letterSpacing:".16em", textTransform:"uppercase", marginRight:6, fontSize:9.5}}>EN</span>{entity.name}
              </div>
            )}
          </div>
        </div>
        {safeAliases.length > 0 && (
          <div className="gv-panel-aliases">
            <span>{tt("gv.panel.aliases")}</span>
            {safeAliases.slice(0, 4).map((a, i) => (<span key={i} style={{color:"var(--paper-text)", letterSpacing:0, fontSize:11, marginRight:6}}>"{a}"{i < Math.min(safeAliases.length, 4) - 1 ? " · " : ""}</span>))}
            {safeAliases.length > 4 && <span style={{color:"var(--paper-text-mute)", textTransform:"none", letterSpacing:0, fontSize:11}}>+{safeAliases.length - 4}</span>}
          </div>
        )}
        <div className="gv-panel-stats">
          <div><strong>{entity.mentions}</strong> {tt("gv.panel.mentionCount").toLowerCase()}</div>
          <div><strong>{safeChapters.length}</strong> {tt("gv.panel.chapters").toLowerCase()}</div>
        </div>
      </div>

      <div className="gv-panel-tabs">
        {tabs.map(t => (
          <button key={t.k} className={"gv-panel-tab " + (tab === t.k ? "active" : "")} onClick={() => setTab(t.k)}>
            {t.l}<span className="ct">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="gv-panel-body">
        <div className="gv-summary">{localizedGloss}</div>

        {tab === "outgoing" && out.map(e => <ClaimItem key={e.id} edge={e} ctx={ctx} selected={e.id === selectedEdgeId} onClick={() => setSelectedEdgeId(e.id)} dir="out" />)}
        {tab === "outgoing" && out.length === 0 && <Empty msg="No outgoing claims" />}

        {tab === "incoming" && inc.map(e => <ClaimItem key={e.id} edge={e} ctx={ctx} selected={e.id === selectedEdgeId} onClick={() => setSelectedEdgeId(e.id)} dir="in" />)}
        {tab === "incoming" && inc.length === 0 && <Empty msg="No incoming claims" />}

        {tab === "glucose" && glucose.map((g, i) => (
          <div key={i} className="claim" style={{cursor:"default"}}>
            <div className="claim-rel">
              <span style={{fontFamily:"'Spectral', serif", fontStyle:"italic", textTransform:"none", letterSpacing:0, fontSize:12, color:"var(--paper-text)"}}>{g.dim}</span>
              <span style={{marginLeft:10, fontSize:9}}>{g.depth}</span>
            </div>
            <div className="claim-text">{g.text}</div>
            <EvidPeek>
              <div className="evid">{g.evidence}</div>
            </EvidPeek>
            <div className="evid-meta">
              <span>{window.friendlyChunkId(g.chunk, locale)}</span>
              {g.verified && <span className="ok">{tt("gv.verifiedBy")}</span>}
            </div>
          </div>
        ))}
        {tab === "glucose" && glucose.length === 0 && <Empty msg="No GLUCOSE facts for this entity" />}

        {tab === "mentions" && (
          <div>
            <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:"var(--paper-text-mute)", letterSpacing:".08em", marginBottom: 16}}>
              {entity.mentions} {tt("gv.panel.mentionCount").toLowerCase()} · {tt("gv.panel.chapters").toLowerCase()} {safeChapters.slice(0,8).join(", ")}{safeChapters.length > 8 ? "…" : ""}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(12, 1fr)", gap:3, padding:"12px 0"}}>
              {Array.from({length:61}, (_, i) => i + 1).map(n => {
                const isActive = safeChapters.includes(n);
                return <div key={n} title={`ch${n}`} style={{
                  aspectRatio:"1", border:"1px solid var(--paper-line)",
                  background: isActive ? "var(--gold)" : "transparent",
                  fontFamily:"'JetBrains Mono', monospace", fontSize: 9,
                  display:"grid", placeItems:"center",
                  color: isActive ? "var(--ink)" : "var(--paper-text-mute)",
                }}>{n}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ClaimItem({ edge, ctx, selected, onClick, dir }) {
  const { tt, entities, locale, gotoEntity } = ctx;
  const src = entities.find(e => e.id === edge.src);
  const dst = entities.find(e => e.id === edge.dst);
  const sLoc = window.entityLocale(edge.src, locale)?.name || src?.name;
  const dLoc = window.entityLocale(edge.dst, locale)?.name || dst?.name;
  // edge.claim carries the English predicate ("X — converses with — Y"). For
  // non-English locales the predicate verb isn't translated, so reconstruct the
  // claim from localized names + the localized relation type instead of showing
  // raw English. English keeps the specific predicate verb.
  const claimText = locale === "en"
    ? edge.claim
    : `${sLoc} — ${window.t("rel."+edge.rel)} — ${dLoc}`;
  return (
    <div className="claim" onClick={onClick} style={{borderLeftColor: selected ? "var(--gold)" : undefined}}>
      <div className="claim-rel">
        <span className="src" onClick={(e) => { e.stopPropagation(); gotoEntity(edge.src); }}>{sLoc}</span>
        <span className="arrow">{dir === "out" ? "→" : "←"}</span>
        {window.t("rel."+edge.rel)}
        <span className="arrow">{dir === "out" ? "→" : "←"}</span>
        <span className="dst" onClick={(e) => { e.stopPropagation(); gotoEntity(edge.dst); }}>{dLoc}</span>
      </div>
      <div className="claim-text">{claimText}</div>
      <EvidPeek>
        <div className="evid">{edge.evidence}</div>
      </EvidPeek>
      <div className="evid-meta">
        <span>{window.friendlyChunkId(edge.chunk, locale)}</span>
        {edge.verified && <span className="ok">{tt("gv.verifiedBy")}</span>}
      </div>
    </div>
  );
}

// Shared peek-and-expand wrapper for evidence quotes.
function EvidPeek({ children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={"evid-peek " + (open ? "open" : "")}
         onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
      {children}
      {!open && <div className="evid-peek-fade" />}
    </div>
  );
}
window.EvidPeek = EvidPeek;

function Empty({ msg }) {
  return <div style={{textAlign:"center", padding:40, color:"var(--paper-text-mute)", fontFamily:"'Spectral', serif", fontStyle:"italic", fontSize:14}}>{msg}</div>;
}

window.VolumeNavigator = VolumeNavigator;
window.ViewGraph = ViewGraph;

// =========================== Volume Navigator ===========================
const PP_STRUCTURE = {
  en: [
    { vol: "I",   start: 1,  end: 23, subtitle: "Netherfield & Meryton",
      theme: "Every neighbourhood must want a young man of fortune — and the Bennet daughters are thrust upon the scene.",
      chapters: [
        { n:1,  t: "\"It is a truth universally acknowledged…\"" },
        { n:3,  t: "The Netherfield Ball" },
        { n:6,  t: "Charlotte's warning" },
        { n:10, t: "Darcy draws Miss Elizabeth's portrait" },
        { n:13, t: "Mr. Collins announced" },
        { n:15, t: "Wickham's arrival" },
        { n:19, t: "Mr. Collins proposes" },
        { n:22, t: "Charlotte accepts" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "Hunsford & the Letter",
      theme: "Misreading — pride, prejudice, and a confession that breaks both.",
      chapters: [
        { n:24, t: "Jane in London" },
        { n:28, t: "Rosings Park" },
        { n:31, t: "Colonel Fitzwilliam's disclosure" },
        { n:34, t: "First proposal — Hunsford" },
        { n:35, t: "The Letter" },
        { n:36, t: "\"Till this moment, I never knew myself.\"" },
        { n:38, t: "Departure from Hunsford" },
        { n:42, t: "A northern tour proposed" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "Pemberley & Resolution",
      theme: "Reckoning — Lydia's elopement, Darcy's hidden act, and two proposals.",
      chapters: [
        { n:43, t: "Pemberley" },
        { n:44, t: "Meeting at Pemberley" },
        { n:46, t: "Lydia is gone off with Wickham" },
        { n:50, t: "The settlement" },
        { n:52, t: "Mrs. Gardiner's letter" },
        { n:56, t: "Lady Catherine confronts Elizabeth" },
        { n:58, t: "\"My feelings will not be repressed.\"" },
        { n:61, t: "Epilogue" },
      ],
    },
  ],
  "zh-CN": [
    { vol: "I",   start: 1,  end: 23, subtitle: "尼日斐 · 梅里顿",
      theme: "有钱的单身汉，理所当然应该娶一位太太。班纳特家的女儿们正式登场。",
      chapters: [
        { n:1,  t: "「这是一条举世公认的真理……」" },
        { n:3,  t: "尼日斐舞会" },
        { n:6,  t: "夏洛特的警示" },
        { n:10, t: "达西默默为伊丽莎白画像" },
        { n:13, t: "柯林斯先生登场" },
        { n:15, t: "韦克翰的到来" },
        { n:19, t: "柯林斯求婚" },
        { n:22, t: "夏洛特接受了" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "亨斯福德 · 那封信",
      theme: "误读 —— 傲慢、偏见，以及一份摧毁两者的告白。",
      chapters: [
        { n:24, t: "简在伦敦" },
        { n:28, t: "罗辛斯庄园" },
        { n:31, t: "费茨威廉上校的透露" },
        { n:34, t: "第一次求婚 —— 亨斯福德" },
        { n:35, t: "那封信" },
        { n:36, t: "「直到这一刻，我才真正认识自己。」" },
        { n:38, t: "离开亨斯福德" },
        { n:42, t: "北上游历" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "潘伯里 · 终章",
      theme: "清算 —— 莉迪亚私奔、达西暗中斡旋、两次求婚。",
      chapters: [
        { n:43, t: "潘伯里庄园" },
        { n:44, t: "在潘伯里重逢" },
        { n:46, t: "莉迪亚与韦克翰私奔" },
        { n:50, t: "和解" },
        { n:52, t: "嘉丁纳太太的信" },
        { n:56, t: "凯瑟琳夫人对峙" },
        { n:58, t: "「我的感情再也压抑不住了。」" },
        { n:61, t: "尾声" },
      ],
    },
  ],
  "zh-TW": [
    { vol: "I",   start: 1,  end: 23, subtitle: "尼日斐 · 梅里頓",
      theme: "有錢的單身漢，理所當然應該娶一位太太。班內特家的女兒們正式登場。",
      chapters: [
        { n:1,  t: "「這是一條舉世公認的真理……」" },
        { n:3,  t: "尼日斐舞會" },
        { n:6,  t: "夏洛特的警示" },
        { n:10, t: "達西默默為伊麗莎白畫像" },
        { n:13, t: "柯林斯先生登場" },
        { n:15, t: "韋克翰的到來" },
        { n:19, t: "柯林斯求婚" },
        { n:22, t: "夏洛特接受了" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "亨斯福德 · 那封信",
      theme: "誤讀 —— 傲慢、偏見，以及一份摧毀兩者的告白。",
      chapters: [
        { n:24, t: "簡在倫敦" },
        { n:28, t: "羅辛斯莊園" },
        { n:31, t: "費茨威廉上校的透露" },
        { n:34, t: "第一次求婚 —— 亨斯福德" },
        { n:35, t: "那封信" },
        { n:36, t: "「直到這一刻，我才真正認識自己。」" },
        { n:38, t: "離開亨斯福德" },
        { n:42, t: "北上遊歷" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "潘伯里 · 終章",
      theme: "清算 —— 莉迪亞私奔、達西暗中斡旋、兩次求婚。",
      chapters: [
        { n:43, t: "潘伯里莊園" },
        { n:44, t: "在潘伯里重逢" },
        { n:46, t: "莉迪亞與韋克翰私奔" },
        { n:50, t: "和解" },
        { n:52, t: "嘉丁納太太的信" },
        { n:56, t: "凱瑟琳夫人對峙" },
        { n:58, t: "「我的感情再也壓抑不住了。」" },
        { n:61, t: "尾聲" },
      ],
    },
  ],
  ja: [
    { vol: "I",   start: 1,  end: 23, subtitle: "ネザーフィールドとメリトン",
      theme: "財産ある独身男性は妻を必要とするもの——ベネット家の娘たちが舞台に登場する。",
      chapters: [
        { n:1,  t: "「財産ある独身男性は……」" },
        { n:3,  t: "ネザーフィールドの舞踏会" },
        { n:10, t: "ダーシーの肖像" },
        { n:13, t: "コリンズ氏の登場" },
        { n:15, t: "ウィッカムの到着" },
        { n:19, t: "コリンズ氏の求婚" },
        { n:22, t: "シャーロットの決断" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "ハンスフォードと手紙",
      theme: "誤読——傲慢と偏見、そして両者を砕く告白。",
      chapters: [
        { n:24, t: "ロンドンのジェーン" },
        { n:28, t: "ロージングス館" },
        { n:34, t: "最初の求婚" },
        { n:35, t: "手紙" },
        { n:36, t: "「この瞬間まで、私は自分を知らなかった。」" },
        { n:42, t: "北方への旅" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "ペンバリーと終結",
      theme: "清算——リディアの駆け落ち、ダーシーの秘めた行為、二度の求婚。",
      chapters: [
        { n:43, t: "ペンバリー" },
        { n:46, t: "リディアの失踪" },
        { n:56, t: "キャサリン夫人との対決" },
        { n:58, t: "再度の求婚" },
        { n:61, t: "エピローグ" },
      ],
    },
  ],
  ko: [
    { vol: "I",   start: 1,  end: 23, subtitle: "네더필드 · 메리튼",
      theme: "재산 있는 독신 남성은 반드시 아내를 원해야 한다——베넷가 딸들이 등장한다.",
      chapters: [
        { n:1,  t: "\"보편적 진리로 인정되는 것은……\"" },
        { n:3,  t: "네더필드 무도회" },
        { n:10, t: "다아시의 초상" },
        { n:13, t: "콜린스 씨의 등장" },
        { n:19, t: "콜린스 씨의 청혼" },
        { n:22, t: "샬럿의 결정" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "헌스포드 · 편지",
      theme: "오독——오만과 편견, 그리고 둘을 부수는 고백.",
      chapters: [
        { n:24, t: "런던의 제인" },
        { n:28, t: "로징스 파크" },
        { n:34, t: "첫 번째 청혼" },
        { n:35, t: "편지" },
        { n:36, t: "\"이 순간까지 나는 나 자신을 몰랐다.\"" },
        { n:42, t: "북쪽 여행" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "펨벌리 · 결말",
      theme: "청산——리디아의 도주, 다아시의 비밀 행동, 두 번의 청혼.",
      chapters: [
        { n:43, t: "펨벌리" },
        { n:46, t: "리디아의 도주" },
        { n:56, t: "캐서린 부인의 대결" },
        { n:58, t: "두 번째 청혼" },
        { n:61, t: "에필로그" },
      ],
    },
  ],
  fr: [
    { vol: "I",   start: 1,  end: 23, subtitle: "Netherfield & Meryton",
      theme: "Tout célibataire possédant une belle fortune doit avoir envie d'une femme — les demoiselles Bennet entrent en scène.",
      chapters: [
        { n:1,  t: "\"C'est une vérité universellement reconnue…\"" },
        { n:3,  t: "Le bal de Netherfield" },
        { n:10, t: "Le portrait de Miss Elizabeth par Darcy" },
        { n:13, t: "Arrivée de M. Collins" },
        { n:19, t: "M. Collins demande en mariage" },
        { n:22, t: "Charlotte accepte" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "Hunsford & la lettre",
      theme: "Méprise — orgueil, préjugés et un aveu qui brise les deux.",
      chapters: [
        { n:24, t: "Jane à Londres" },
        { n:28, t: "Rosings Park" },
        { n:34, t: "Première demande — Hunsford" },
        { n:35, t: "La lettre" },
        { n:36, t: "\"Je ne me suis jamais connue jusqu'à ce moment.\"" },
        { n:42, t: "Un voyage dans le Nord" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "Pemberley & dénouement",
      theme: "Règlement de comptes — la fugue de Lydia, l'acte caché de Darcy, deux demandes.",
      chapters: [
        { n:43, t: "Pemberley" },
        { n:46, t: "Lydia s'est enfuie avec Wickham" },
        { n:56, t: "Lady Catherine affronte Elizabeth" },
        { n:58, t: "La seconde demande" },
        { n:61, t: "Épilogue" },
      ],
    },
  ],
  es: [
    { vol: "I",   start: 1,  end: 23, subtitle: "Netherfield y Meryton",
      theme: "Todo soltero con buena fortuna debe necesitar una esposa — las hijas Bennet entran en escena.",
      chapters: [
        { n:1,  t: "\"Es una verdad universalmente reconocida…\"" },
        { n:3,  t: "El baile de Netherfield" },
        { n:10, t: "El retrato de Darcy" },
        { n:13, t: "Llegada del Sr. Collins" },
        { n:19, t: "El Sr. Collins propone matrimonio" },
        { n:22, t: "Charlotte acepta" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "Hunsford y la carta",
      theme: "Malentendido — orgullo, prejuicio y una confesión que rompe ambos.",
      chapters: [
        { n:24, t: "Jane en Londres" },
        { n:28, t: "Rosings Park" },
        { n:34, t: "Primera propuesta — Hunsford" },
        { n:35, t: "La carta" },
        { n:36, t: "\"Hasta este momento, nunca me conocí a mí misma.\"" },
        { n:42, t: "Un viaje al norte" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "Pemberley y resolución",
      theme: "Ajuste de cuentas — la fuga de Lydia, el acto oculto de Darcy, dos propuestas.",
      chapters: [
        { n:43, t: "Pemberley" },
        { n:46, t: "Lydia se ha fugado con Wickham" },
        { n:56, t: "Lady Catherine confronta a Elizabeth" },
        { n:58, t: "La segunda propuesta" },
        { n:61, t: "Epílogo" },
      ],
    },
  ],
  de: [
    { vol: "I",   start: 1,  end: 23, subtitle: "Netherfield & Meryton",
      theme: "Jeder unverheiratete Mann mit Vermögen muss eine Frau wollen — die Bennet-Töchter betreten die Bühne.",
      chapters: [
        { n:1,  t: "\"Es ist eine allgemein anerkannte Wahrheit…\"" },
        { n:3,  t: "Der Ball in Netherfield" },
        { n:10, t: "Darcys Porträt von Miss Elizabeth" },
        { n:13, t: "Mr. Collins' Ankunft" },
        { n:19, t: "Mr. Collins macht einen Heiratsantrag" },
        { n:22, t: "Charlotte nimmt an" },
      ],
    },
    { vol: "II",  start: 24, end: 42, subtitle: "Hunsford & der Brief",
      theme: "Missdeutung — Stolz, Vorurteil und ein Geständnis, das beides bricht.",
      chapters: [
        { n:24, t: "Jane in London" },
        { n:28, t: "Rosings Park" },
        { n:34, t: "Erster Antrag — Hunsford" },
        { n:35, t: "Der Brief" },
        { n:36, t: "\"Bis zu diesem Moment kannte ich mich nie selbst.\"" },
        { n:42, t: "Eine Reise in den Norden" },
      ],
    },
    { vol: "III", start: 43, end: 61, subtitle: "Pemberley & Auflösung",
      theme: "Abrechnung — Lydias Flucht, Darcys verborgene Tat, zwei Anträge.",
      chapters: [
        { n:43, t: "Pemberley" },
        { n:46, t: "Lydia ist mit Wickham durchgebrannt" },
        { n:56, t: "Lady Catherine konfrontiert Elizabeth" },
        { n:58, t: "Der zweite Antrag" },
        { n:61, t: "Epilog" },
      ],
    },
  ],
};

// Generic 3-part volume split for any book that has no hand-authored structure.
function generateStructure(locale, chapters) {
  const parts = {
    en: ["Part One", "Part Two", "Part Three"],
    "zh-CN": ["第一部分", "第二部分", "第三部分"],
    "zh-TW": ["第一部分", "第二部分", "第三部分"],
    ja: ["第一部", "第二部", "第三部"],
    ko: ["1부", "2부", "3부"],
    fr: ["Partie I", "Partie II", "Partie III"],
    es: ["Parte I", "Parte II", "Parte III"],
    de: ["Teil I", "Teil II", "Teil III"],
  };
  const labels = parts[locale] || parts.en;
  const romans = ["I", "II", "III"];
  const chs = (chapters || []).filter((n) => Number.isFinite(n));
  if (!chs.length) return [];
  const size = Math.ceil(chs.length / 3);
  const vols = [];
  for (let i = 0; i < 3; i++) {
    const slice = chs.slice(i * size, (i + 1) * size);
    if (!slice.length) continue;
    vols.push({
      vol: romans[i],
      start: slice[0],
      end: slice[slice.length - 1],
      subtitle: labels[i],
      theme: "",
      chapters: slice.map((n) => ({ n, t: "" })),
    });
  }
  return vols;
}

function getStructure(locale, book, chapters) {
  // Curated demo book keeps its rich structure; everything else is generated
  // from its real chapter list (so no book ever borrows P&P's volume labels).
  if (book && book.id !== "pap" && chapters && chapters.length) {
    return generateStructure(locale, chapters);
  }
  return PP_STRUCTURE[locale] || PP_STRUCTURE.en;
}

function VolumeNavigator({ activeChapter, setActiveChapter, locale, tt, book, chapters }) {
  const { useState } = React;
  const structure = getStructure(locale, book, chapters);
  const TOTAL = structure.length ? structure[structure.length - 1].end : 61;
  const [expandedVol, setExpandedVol] = useState(null);

  const L = locale;
  const volLabel = { en:"VOLUME","zh-CN":"卷","zh-TW":"卷",ja:"巻",ko:"권",fr:"TOME",es:"VOLUMEN",de:"BAND" };
  const allLabel = { en:"all chapters","zh-CN":"全部章节","zh-TW":"全部章節",ja:"全章",ko:"전체 장",fr:"tous chapitres",es:"todos caps.",de:"alle Kapitel" };

  return (
    <div style={{marginTop:24}}>
      <div className="gv-section-label" style={{marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <span>{volLabel[L] || volLabel.en}</span>
        {activeChapter && (
          <button onClick={() => setActiveChapter(null)}
            style={{fontFamily:"'Spectral',serif", fontStyle:"italic", fontSize:11, color:"var(--gold-deep)", background:"transparent", border:"none", cursor:"pointer"}}>
            × {allLabel[L] || allLabel.en}
          </button>
        )}
      </div>
      {structure.map((vol) => {
        const isExpanded = expandedVol === vol.vol;
        const isInRange = activeChapter && activeChapter >= vol.start && activeChapter <= vol.end;
        const fillPct = Math.round(((vol.end - vol.start + 1) / TOTAL) * 100);
        return (
          <div key={vol.vol} style={{marginBottom:8}}>
            <button className={"gv-vol-header " + (isInRange ? "active" : "")}
              onClick={() => setExpandedVol(isExpanded ? null : vol.vol)}>
              <div className="gv-vol-label">
                <span className="gv-vol-roman">Vol. {vol.vol}</span>
                <span className="gv-vol-sub">{vol.subtitle}</span>
              </div>
              <div className="gv-vol-bar-wrap">
                <div className="gv-vol-bar">
                  <div className="gv-vol-fill" style={{width: fillPct+"%"}} />
                  {isInRange && (
                    <div className="gv-vol-cursor" style={{left: ((activeChapter - vol.start) / (vol.end - vol.start + 1) * fillPct) + "%"}} />
                  )}
                </div>
                <div className="gv-vol-range">ch{vol.start}–ch{vol.end}</div>
              </div>
              <span className="gv-vol-chevron">{isExpanded ? "▴" : "▾"}</span>
            </button>
            {isExpanded && vol.theme && (
              <p className="gv-vol-theme">{vol.theme}</p>
            )}
            {isExpanded && (
              <div className="gv-ch-list">
                {vol.chapters.map(ch => (
                  <button key={ch.n}
                    className={"gv-ch-row " + (activeChapter === ch.n ? "active" : "")}
                    onClick={() => setActiveChapter(activeChapter === ch.n ? null : ch.n)}>
                    <span className="gv-ch-num">ch{ch.n}</span>
                    <span className="gv-ch-title">{ch.t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
