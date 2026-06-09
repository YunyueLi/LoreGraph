// LoreGraph — anchored force simulation (extracted from view-graph.jsx).
// Pure layout math, no React/DOM. Exposed as window.GraphSim so the graph
// view (a separate <script>) can consume it.
(function () {
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

  window.GraphSim = { deepClonePos, stepSimulation };
})();
