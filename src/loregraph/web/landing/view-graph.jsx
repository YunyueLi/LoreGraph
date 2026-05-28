// LoreGraph — Graph view
// Three view modes: SOCIAL (people in places), THEMES (concepts), CHRONICLE (events on a timeline).

// ====== Force-directed simulation ======
// Lightweight bespoke physics, tuned for 20–40 nodes. Three forces:
//   - SPRINGS on edges (target length 165, gentle k)
//   - CHARGE between every pair of nodes (Coulomb-ish, repulsive)
//   - GRAVITY (social mode only): each node is softly pulled to its region centre
// Velocities decay every frame (DAMPING). Alpha cools toward 0 so the system
// settles; drag / book-switch reignites it.
const SIM = {
  LINK_DIST: 165,
  LINK_K:    0.045,
  CHARGE:    2600,
  MIN_DIST2: 400,
  GRAVITY:   0.022,
  DAMPING:   0.55,
  MAX_SPEED: 32,
};

function deepClonePos(pos) {
  const out = {};
  for (const id in pos) out[id] = { x: pos[id].x, y: pos[id].y };
  return out;
}

function stepSimulation(prev, vels, edges, regions, alpha, draggedId) {
  const ids = Object.keys(prev);
  const next = {};
  for (const id of ids) next[id] = { x: prev[id].x, y: prev[id].y };

  // ensure velocity slots
  for (const id of ids) if (!vels[id]) vels[id] = { vx: 0, vy: 0 };

  // 1) charge — pairwise repulsion (1/r²)
  for (let i = 0; i < ids.length; i++) {
    const a = next[ids[i]];
    for (let j = i + 1; j < ids.length; j++) {
      const b = next[ids[j]];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx*dx + dy*dy;
      if (d2 < SIM.MIN_DIST2) {
        // jitter & clamp
        if (d2 < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); d2 = dx*dx + dy*dy + 1; }
        d2 = SIM.MIN_DIST2;
      }
      const f = SIM.CHARGE * alpha / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      vels[ids[i]].vx -= fx; vels[ids[i]].vy -= fy;
      vels[ids[j]].vx += fx; vels[ids[j]].vy += fy;
    }
  }

  // 2) springs — each edge pulls its endpoints toward LINK_DIST
  for (const edge of edges) {
    const a = next[edge.src], b = next[edge.dst];
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
    const f = (d - SIM.LINK_DIST) * SIM.LINK_K * alpha;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    if (vels[edge.src]) { vels[edge.src].vx += fx; vels[edge.src].vy += fy; }
    if (vels[edge.dst]) { vels[edge.dst].vx -= fx; vels[edge.dst].vy -= fy; }
  }

  // 3) region gravity (social mode)
  if (regions) {
    for (const r of regions) {
      for (const memberId of r.members) {
        if (!next[memberId] || !vels[memberId]) continue;
        const dx = r.cx - next[memberId].x;
        const dy = r.cy - next[memberId].y;
        vels[memberId].vx += dx * SIM.GRAVITY * alpha;
        vels[memberId].vy += dy * SIM.GRAVITY * alpha;
      }
    }
  }

  // 4) integrate (skip dragged node — it's pinned to the cursor)
  for (const id of ids) {
    if (id === draggedId) { vels[id].vx = 0; vels[id].vy = 0; continue; }
    const v = vels[id];
    v.vx *= 1 - SIM.DAMPING;
    v.vy *= 1 - SIM.DAMPING;
    const sp = Math.hypot(v.vx, v.vy);
    if (sp > SIM.MAX_SPEED) { v.vx = v.vx / sp * SIM.MAX_SPEED; v.vy = v.vy / sp * SIM.MAX_SPEED; }
    next[id].x += v.vx;
    next[id].y += v.vy;
  }

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
      // Gen I (founders)
      sa01: { x: 170, y: 165 }, sa02: { x: 270, y: 195 },
      // Gen II
      sa03: { x: 420, y: 145 }, sa04: { x: 490, y: 190 }, sa05: { x: 570, y: 150 }, sa06: { x: 620, y: 200 },
      // Gen III
      sa07: { x: 770, y: 210 }, sa08: { x: 830, y: 250 }, sa09: { x: 890, y: 220 },
      // Gen IV (twins + Remedios the Beauty)
      sa10: { x: 175, y: 445 }, sa11: { x: 245, y: 470 }, sa12: { x: 315, y: 445 }, sa15: { x: 245, y: 510 },
      // Gen V
      sa13: { x: 490, y: 460 }, sa14: { x: 570, y: 480 },
      // Gen VI/VII
      sa16: { x: 780, y: 490 }, sa17: { x: 840, y: 520 }, sa18: { x: 880, y: 565 },
      // Outsiders to the household
      sa19: { x: 240, y: 745 }, // Melquíades — leftmost
      sa20: { x: 370, y: 770 }, // Pilar
      sa21: { x: 470, y: 745 }, // Pietro Crespi
      sa22: { x: 570, y: 775 }, // Petra Cotes
      sa23: { x: 670, y: 750 }, // Mauricio Babilonia
      sa24: { x: 770, y: 770 }, // Mr. Brown / Banana Company
      // Central anchor: the parchments — the structural pivot of the book
      so04: { x: 500, y: 330 },
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
  const SOCIAL_REGIONS = SOCIAL_REGIONS_BY_BOOK[bookId] || SOCIAL_REGIONS_BY_BOOK.pap;
  const SOCIAL_POS = SOCIAL_POS_BY_BOOK[bookId] || SOCIAL_POS_BY_BOOK.pap;
  const THEMES_POS = THEMES_POS_BY_BOOK[bookId] || THEMES_POS_BY_BOOK.pap;

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

  const visibleEdges = useMemo(() => edges.filter(e => {
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
  }), [edgeFilter, activeChapter, viewMode, bookId]);

  const edgeCounts = {
    STRUCTURAL: edges.filter(e => e.rel === "STRUCTURAL").length,
    INTERACTS:  edges.filter(e => e.rel === "INTERACTS").length,
    ASSERTS:    edges.filter(e => e.rel === "ASSERTS").length,
    INFLUENCES: edges.filter(e => e.rel === "INFLUENCES").length,
    PREDICTS:   edges.filter(e => e.rel === "PREDICTS").length,
    SYMBOLIZES: edges.filter(e => e.rel === "SYMBOLIZES").length,
  };

  // ====== Live positions — physics-driven, seeded from the curated layout ======
  // Each entity has a steady-state position from SOCIAL_POS / THEMES_POS. We
  // then run a slow force simulation on top: edges act as soft springs, nodes
  // weakly repel each other, and region centres (social mode) gently pull
  // their members back. The seed already gives a good layout, so the sim's
  // job is just to make the graph feel alive — drag a node, see neighbours
  // shift; release, the cloud relaxes back into balance.
  const [livePositions, setLivePositions] = useState(() => deepClonePos(seedPositions));
  const velRef = useRef({});           // id -> {vx, vy}
  const draggedRef = useRef(null);     // currently-dragged node id
  const alphaRef = useRef(1.0);        // simulation "temperature", decays toward 0
  const reignite = useCallback((to = 0.7) => { alphaRef.current = Math.max(alphaRef.current, to); }, []);

  // Reset to seed when book or view-mode changes.
  useEffect(() => {
    setLivePositions(deepClonePos(seedPositions));
    velRef.current = {};
    draggedRef.current = null;
    reignite(1.0);
  }, [bookId, viewMode]);

  // Single rAF loop, alpha-cooled. Cheap when idle.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (alphaRef.current < 0.005 && !draggedRef.current) return;
      setLivePositions(prev => stepSimulation(prev, velRef.current, visibleEdges, viewMode === "social" ? SOCIAL_REGIONS : null, alphaRef.current, draggedRef.current));
      alphaRef.current *= 0.985;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visibleEdges, viewMode, bookId]);

  const selected = entities.find(e => e.id === selectedEntityId) || entities[0];
  const toggleEdge = (r) => setEdgeFilter(f => ({...f, [r]: !f[r]}));
  const resetLayout = () => {
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
            />
          )}
        </div>
      </div> {/* end left panel */}


      <GraphCanvas
        visibleEntities={visibleEntities}
        visibleEdges={visibleEdges}
        positions={livePositions}
        setLivePositions={setLivePositions}
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

function edgePath(a, b, rA, rB, parallelIdx, parallelCount) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1) return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, midX: a.x, midY: a.y, angle: 0 };
  const ux = dx/len, uy = dy/len;
  const sx = a.x + ux*rA, sy = a.y + uy*rA;
  const ex = b.x - ux*rB, ey = b.y - uy*rB;
  const nx = -uy, ny = ux;
  let offset;
  if (parallelCount <= 1) {
    const sign = ((a.x + b.y) | 0) % 2 === 0 ? 1 : -1;
    offset = sign * Math.min(12, len * 0.04);
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
  return (
    <g className="social-overlay">
      {regions.map((r, i) => {
        const isActive = r.members.includes(selectedEntityId);
        const title = (typeof r.title === "string") ? r.title : (r.title[locale] || r.title.en);
        return (
          <g key={r.id}
             style={{cursor: r.entity ? "pointer" : "default"}}
             onClick={() => r.entity && setSelectedEntityId(r.entity)}>
            <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              fill={isActive ? "rgba(184,149,74,0.10)" : "rgba(184,149,74,0.05)"}
              stroke={isActive ? "rgba(184,149,74,0.45)" : "rgba(184,149,74,0.22)"}
              strokeWidth="1" strokeDasharray="4 6"
              style={{transition: "all 0.3s"}} />
            <text x={r.cx} y={r.cy - r.ry + 18} textAnchor="middle"
              fontFamily="Spectral, serif" fontStyle="italic"
              fontSize="14" fill="#8a6e36" opacity={isActive ? 1 : 0.7}
              letterSpacing="0.04em">
              {title}
            </text>
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
function GraphCanvas({ visibleEntities, visibleEdges, positions, setLivePositions, draggedRef, reignite, resetLayout, entities, selectedEntityId, setSelectedEntityId, selectedEdgeId, setSelectedEdgeId, locale, tt, selected, fullscreen, toggleFullscreen, viewMode, overlays }) {
  const { useState, useRef, useEffect } = React;
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  // small ticker so dragging a node forces a re-render of selected edges
  const [, setTick] = useState(0);

  // Node drag: pointerdown on a node captures its id and offset (in world
  // coords). Subsequent pointermoves on the document update the node's
  // position directly via setLivePositions and reignite the simulation so
  // neighbours respond.
  const onNodePointerDown = (entityId) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const t = transformRef.current;
    const worldX = (e.clientX - rect.left - t.x) / t.k;
    const worldY = (e.clientY - rect.top  - t.y) / t.k;
    const start = positions[entityId] || { x: 0, y: 0 };
    const offsetX = worldX - start.x;
    const offsetY = worldY - start.y;
    draggedRef.current = entityId;
    reignite(0.6);
    let moved = false;
    const onMove = (ev) => {
      const r = svgRef.current.getBoundingClientRect();
      const tt2 = transformRef.current;
      const wx = (ev.clientX - r.left - tt2.x) / tt2.k - offsetX;
      const wy = (ev.clientY - r.top  - tt2.y) / tt2.k - offsetY;
      if (!moved && (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 3)) moved = true;
      setLivePositions(prev => ({ ...prev, [entityId]: { x: wx, y: wy } }));
      setTick(n => n + 1);
      reignite(0.4);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      draggedRef.current = null;
      if (!moved) {
        // treat as click — select
        setSelectedEntityId(entityId);
        setSelectedEdgeId(null);
      }
      reignite(0.5);
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

          {/* Edges */}
          {edgeRender.map(({edge, parallelIdx, parallelCount}) => {
            const a = positions[edge.src], b = positions[edge.dst];
            if (!a || !b) return null;
            const srcE = entities.find(e => e.id === edge.src);
            const dstE = entities.find(e => e.id === edge.dst);
            const rA = srcE ? nodeRadius(srcE) : 22;
            const rB = dstE ? nodeRadius(dstE) : 22;
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

            const { d, midX, midY, angle } = edgePath(a, b, rA, rB, parallelIdx, parallelCount);

            // Label visibility: only on hover / selection. Never auto-shown.
            const showLabel = isSel || isHovered;
            // Rotate label so it follows edge direction, but stay upright (flip if upside-down).
            let labelAngle = angle;
            if (labelAngle > 90) labelAngle -= 180;
            if (labelAngle < -90) labelAngle += 180;

            return (
              <g key={edge.id}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(edge.id); }}
                style={{cursor:"pointer"}}>
                <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
                {isStructural && !isMute && (
                  <path d={d} fill="none" stroke={color}
                    strokeWidth={isSel ? 5 : 4} opacity="0.12" strokeLinecap="round" />
                )}
                <path d={d} fill="none" stroke={color}
                  strokeWidth={(isSel || isHovered) ? baseW + 1.0 : baseW}
                  strokeDasharray={(isSel || isHovered) ? null : dash}
                  strokeLinecap="round"
                  opacity={isMute ? 0.18 : ((isSel || isHovered) ? 1 : 0.6)}
                  markerEnd={hasArrow ? (isSel ? "url(#arr-sel)" : isMute ? "url(#arr-mute)" : `url(#arr-${edge.rel})`) : null}
                  style={{transition: "stroke-width 0.2s, opacity 0.2s"}} />
                {isDouble && !isMute && (
                  <path d={d} fill="none" stroke={color}
                    strokeWidth="0.7" opacity={(isSel || isHovered) ? 0.9 : 0.55}
                    strokeDasharray="3 3"
                    style={{transform: "translate(0, 3px)"}} />
                )}
                {isSel && (
                  <path d={d} fill="none" stroke={color}
                    strokeWidth={baseW + 1.2} strokeDasharray="4 6" opacity="0.6"
                    style={{animation: "lg-edge-flow 1.4s linear infinite"}} />
                )}
                {showLabel && (
                  <g transform={`translate(${midX} ${midY}) rotate(${labelAngle})`}>
                    {(() => {
                      const label = window.t("rel."+edge.rel);
                      return (<>
                        <rect x={-label.length * 3.6 - 4} y={-9} width={label.length * 7.2 + 8} height={15}
                          fill="#fbf7ea" stroke={color} strokeWidth="0.6" opacity="0.96" rx="3" />
                        <text textAnchor="middle" dy="3"
                          fontFamily="Spectral, serif" fontStyle="italic" fontSize="10" fill={color}
                          letterSpacing="0.04em">{label}</text>
                      </>);
                    })()}
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
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
                x={p.x} y={p.y}
                sel={sel}
                mute={isMute}
                dragging={isDragging}
                onPointerDown={onNodePointerDown(entity.id)}
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
function GraphNode({ entity, name, x, y, sel, mute, dragging, onPointerDown }) {
  const { useState } = React;
  const [hover, setHover] = useState(false);
  const baseR = nodeRadius(entity);
  const r = baseR * (dragging ? 1.1 : sel ? 1.06 : hover ? 1.04 : 1);
  const opacity = mute ? 0.35 : 1;
  const stroke = (sel || dragging) ? "#b8954a" : (hover ? "#8a6e36" : "#a08758");
  const strokeWidth = (sel || dragging) ? 2.4 : 1.2;
  const fill = (sel || dragging) ? "#fbf3dc" : "#fbf7ea";

  const phase = ((entity.id.charCodeAt(0) + entity.id.charCodeAt(entity.id.length-1)) % 8) / 8;

  let shape;
  if (entity.type === "agent") {
    shape = <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (entity.type === "object") {
    shape = <rect x={x-r} y={y-r} width={r*2} height={r*2} rx="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (entity.type === "event") {
    shape = <rect x={-r} y={-r} width={r*2} height={r*2} rx="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth} transform={`translate(${x} ${y}) rotate(45)`} />;
  } else if (entity.type === "concept") {
    const w = r*1.05, h = r*1.2;
    const pts = [`${x},${y-h}`,`${x+w*0.95},${y-h/2}`,`${x+w*0.95},${y+h/2}`,`${x},${y+h}`,`${x-w*0.95},${y+h/2}`,`${x-w*0.95},${y-h/2}`].join(" ");
    shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  const halo = sel && (
    <circle cx={x} cy={y} r={r + 14} fill="none" stroke="#b8954a" strokeWidth="0.6" opacity="0.4">
      <animate attributeName="r" values={`${r+10};${r+18};${r+10}`} dur="2.6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.6s" repeatCount="indefinite" />
    </circle>
  );

  const avatar = window.avatarFor(entity);
  const avatarScale = r / 24;
  const shortName = name.length > 18 ? name.slice(0, 18) + "…" : name;
  const labelY = y + baseR + 18;

  return (
    <g data-node
       style={{cursor: dragging ? "grabbing" : "grab", opacity, transition:"opacity 0.2s"}}
       onPointerDown={onPointerDown}
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}>
      <g style={{
        animation: dragging ? "none" : `${["lg-drift-a","lg-drift-b","lg-drift-c"][Math.floor(phase * 3)]} ${6 + phase * 4}s ease-in-out ${phase * 3}s infinite`,
      }}>
        {halo}
        {shape}
        <g transform={`translate(${x} ${y}) scale(${avatarScale})`}>
          {avatar}
        </g>
      </g>
      <text x={x} y={labelY} textAnchor="middle"
        fontFamily="Spectral, serif" fontSize={baseR > 28 ? 14 : 12.5}
        fill={sel ? "#8a6e36" : "#1a1a1a"}
        fontStyle={entity.type === "concept" ? "italic" : "normal"}
        fontWeight={sel ? 500 : 400}
        style={{transition:"fill 0.2s"}}>{shortName}</text>
      {(sel || hover) && (
        <text x={x} y={labelY + 13} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#8a6e36"
          letterSpacing="1.4" opacity="0.8">{entity.mentions} mentions</text>
      )}
    </g>
  );
}

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
  return (
    <div className="claim" onClick={onClick} style={{borderLeftColor: selected ? "var(--gold)" : undefined}}>
      <div className="claim-rel">
        <span className="src" onClick={(e) => { e.stopPropagation(); gotoEntity(edge.src); }}>{sLoc}</span>
        <span className="arrow">{dir === "out" ? "→" : "←"}</span>
        {window.t("rel."+edge.rel)}
        <span className="arrow">{dir === "out" ? "→" : "←"}</span>
        <span className="dst" onClick={(e) => { e.stopPropagation(); gotoEntity(edge.dst); }}>{dLoc}</span>
      </div>
      <div className="claim-text">{edge.claim}</div>
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

function getStructure(locale) {
  return PP_STRUCTURE[locale] || PP_STRUCTURE.en;
}

function VolumeNavigator({ activeChapter, setActiveChapter, locale, tt }) {
  const { useState } = React;
  const structure = getStructure(locale);
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
        const fillPct = Math.round(((vol.end - vol.start + 1) / 61) * 100);
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
            {isExpanded && (
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
