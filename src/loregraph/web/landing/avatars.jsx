// LoreGraph — Character & object emblems (sigil style)
// Each archetype is a single iconographic mark — not a face.
// Drawn in a (-22, -22) ↔ (22, 22) box, designed to read at any size.

const S  = "#1a1a1a";   // ink
const G  = "#8a6e36";   // gold-deep
const Gx = "#b8954a";   // gold
const Gb = "#d1ac5e";   // gold-bright
const C  = "#fbf7ea";   // cream
const R  = "#9c2424";   // crimson
const M  = "#5a6a3f";   // moss
const SW = 1.2;

window.LG_ARCHETYPES = {

  // ═══════════════ YOUNG WOMEN — flower / bloom sigils ═══════════════

  // Elizabeth-like — full rose, slight tilt
  lady_young: () => (
    <g>
      <circle cx="0" cy="-1" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* rose */}
      <g transform="translate(0 -1)">
        <circle r="9" fill={Gx} stroke={S} strokeWidth={SW} />
        <path d="M 0 -7 Q -4 -4 -5 0 Q -4 4 0 6 Q 4 4 5 0 Q 4 -4 0 -7 z" fill={C} stroke={S} strokeWidth={SW*0.8} />
        <path d="M 0 -4 Q -2 -2 -2 0 Q 0 2 2 0 Q 2 -2 0 -4 z" fill={Gx} stroke={S} strokeWidth={SW*0.5} />
        <circle r="0.8" fill={S} />
      </g>
      {/* leaves */}
      <path d="M -12 6 Q -7 3 -3 9" fill={M} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 12 6 Q 7 3 3 9" fill={M} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Jane-like — gentle daisy
  lady_gentle: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <ellipse key={deg} cx="0" cy="-8" rx="2.4" ry="5" fill={C} stroke={S} strokeWidth={SW*0.8}
                 transform={`rotate(${deg} 0 0)`} />
      ))}
      <circle r="3.5" fill={Gx} stroke={S} strokeWidth={SW*0.8} />
      <circle r="1" fill={S} />
    </g>
  ),

  // Lydia-like — frivolous bow
  lady_silly: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* big ribbon bow */}
      <path d="M -12 -4 Q -16 -8 -16 -2 Q -16 4 -12 0 L -2 -2 L -2 2 L -12 4 Q -16 8 -16 2 z"
            fill={Gx} stroke={S} strokeWidth={SW*0.8} />
      <path d="M 12 -4 Q 16 -8 16 -2 Q 16 4 12 0 L 2 -2 L 2 2 L 12 4 Q 16 8 16 2 z"
            fill={Gx} stroke={S} strokeWidth={SW*0.8} />
      <rect x="-3" y="-4" width="6" height="8" fill={Gb} stroke={S} strokeWidth={SW*0.8} />
      <path d="M -1 6 L -3 12 M 1 6 L 3 12" stroke={Gx} strokeWidth={SW} fill="none" />
    </g>
  ),

  // Charlotte-like — practical leaf / sage sprig
  lady_plain: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <line x1="0" y1="11" x2="0" y2="-11" stroke={M} strokeWidth={SW*1.4} />
      {/* leaves alternating */}
      <path d="M 0 -8 Q 7 -10 7 -5 Q 4 -3 0 -4 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 -4 Q -7 -6 -7 -1 Q -4 1 0 0 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 0 Q 7 -2 7 3 Q 4 5 0 4 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 4 Q -7 2 -7 7 Q -4 9 0 8 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Caroline-like — ostrich feather plume
  lady_fashion: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 12 Q 6 6 4 -2 Q 8 -8 4 -14 Q -2 -10 -2 -2 Q -6 4 0 12 z"
            fill={C} stroke={S} strokeWidth={SW} />
      <path d="M 0 12 L 2 -10" stroke={S} strokeWidth={SW*0.6} />
      <path d="M -1 8 Q 2 6 3 4 M -1 4 Q 3 2 4 0 M 0 0 Q 4 -2 5 -4 M 1 -4 Q 4 -6 5 -8 M 2 -8 Q 4 -10 4 -12"
            stroke={S} strokeWidth={SW*0.5} fill="none" />
      <circle cx="0" cy="13" r="1.2" fill={Gx} />
    </g>
  ),

  // Mary-like — bookish, an open book + small specs
  lady_bookish: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -10 -6 L 0 -8 L 10 -6 L 10 4 L 0 2 L -10 4 z" fill={C} stroke={S} strokeWidth={SW} />
      <line x1="0" y1="-8" x2="0" y2="2" stroke={S} strokeWidth={SW*0.7} />
      <line x1="-8" y1="-3" x2="-2" y2="-4" stroke={S} strokeWidth={SW*0.4} />
      <line x1="-8" y1="-1" x2="-2" y2="-2" stroke={S} strokeWidth={SW*0.4} />
      <line x1="2" y1="-4" x2="8" y2="-3" stroke={S} strokeWidth={SW*0.4} />
      <line x1="2" y1="-2" x2="8" y2="-1" stroke={S} strokeWidth={SW*0.4} />
      {/* tiny specs below */}
      <circle cx="-3" cy="8" r="2.2" fill="none" stroke={S} strokeWidth={SW} />
      <circle cx=" 3" cy="8" r="2.2" fill="none" stroke={S} strokeWidth={SW} />
      <line x1="-1" y1="8" x2="1" y2="8" stroke={S} strokeWidth={SW} />
    </g>
  ),

  // Georgiana-like — shy bud
  lady_shy: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* closed bud */}
      <path d="M 0 12 L 0 -2" stroke={M} strokeWidth={SW*1.4} />
      <path d="M 0 -2 Q -5 -4 -4 -10 Q -2 -13 0 -12 Q 2 -13 4 -10 Q 5 -4 0 -2 z"
            fill={Gx} stroke={S} strokeWidth={SW} />
      <path d="M 0 -2 Q -3 -3 -2 -8" stroke={S} strokeWidth={SW*0.5} fill="none" />
      <path d="M 0 -2 Q 3 -3 2 -8" stroke={S} strokeWidth={SW*0.5} fill="none" />
      {/* small leaves */}
      <path d="M 0 4 Q -7 2 -7 7 Q -4 9 0 7 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 6 Q 6 4 6 9 Q 3 11 0 9 z" fill={M} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // ═══════════════ MATRONS — domestic / authority emblems ═══════════════

  // Mrs. Bennet-like — folding fan
  matron_anxious: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* fan blades */}
      <g transform="translate(0 10)">
        <path d="M 0 0 L -14 -16 L 14 -16 z" fill={C} stroke={S} strokeWidth={SW} />
        <line x1="0" y1="0" x2="-12" y2="-14" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="-8"  y2="-15" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="-4"  y2="-16" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="0"   y2="-16" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="4"   y2="-16" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="8"   y2="-15" stroke={S} strokeWidth={SW*0.6} />
        <line x1="0" y1="0" x2="12"  y2="-14" stroke={S} strokeWidth={SW*0.6} />
        <path d="M -12 -10 Q 0 -13 12 -10" fill="none" stroke={Gx} strokeWidth={SW*0.7} />
        <circle r="1.6" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      </g>
    </g>
  ),

  // Mrs. Gardiner-like — housekeeper key
  matron_kind: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-7" cy="0" r="5" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <circle cx="-7" cy="0" r="1.4" fill={S} />
      <line x1="-2" y1="0" x2="12" y2="0" stroke={S} strokeWidth={SW*1.4} />
      <line x1="8" y1="0" x2="8" y2="5" stroke={S} strokeWidth={SW*1.4} />
      <line x1="12" y1="0" x2="12" y2="5" stroke={S} strokeWidth={SW*1.4} />
      {/* ribbon */}
      <path d="M -12 -10 L -4 -7 L -10 -3 z" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Lady Catherine-like — coronet
  matron_imperious: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 4 L -12 -2 L -8 -8 L -4 -2 L 0 -10 L 4 -2 L 8 -8 L 12 -2 L 12 4 z"
            fill={Gx} stroke={S} strokeWidth={SW} />
      <line x1="-12" y1="4" x2="12" y2="4" stroke={S} strokeWidth={SW} />
      <line x1="-12" y1="7" x2="12" y2="7" stroke={S} strokeWidth={SW*0.7} />
      {/* gems */}
      <circle cx="-8" cy="-4" r="1.2" fill={R} stroke={S} strokeWidth={SW*0.5} />
      <circle cx=" 0" cy="-6" r="1.6" fill={R} stroke={S} strokeWidth={SW*0.5} />
      <circle cx=" 8" cy="-4" r="1.2" fill={R} stroke={S} strokeWidth={SW*0.5} />
      {/* pearls */}
      <circle cx="-12" cy="-2" r="1.2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <circle cx=" 12" cy="-2" r="1.2" fill={C} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // ═══════════════ GENTLEMEN — accoutrement emblems ═══════════════

  // Darcy-like — tall stiff cravat / heraldic chevron
  gentleman_proud: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* shield with cravat */}
      <path d="M -8 -10 L 8 -10 L 8 4 Q 8 11 0 12 Q -8 11 -8 4 z"
            fill={S} stroke={S} strokeWidth={SW} />
      {/* cravat folds */}
      <path d="M -4 -8 L 0 4 L 4 -8 z" fill={C} stroke={S} strokeWidth={SW*0.7} />
      <line x1="0" y1="-4" x2="0" y2="4" stroke={S} strokeWidth={SW*0.5} />
      {/* small pin */}
      <circle cx="0" cy="-2" r="1.2" fill={Gx} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Bingley-like — friendly top hat
  gentleman_friendly: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-7" y="-12" width="14" height="14" fill={S} stroke={S} strokeWidth={SW} />
      <path d="M -12 2 L 12 2" stroke={S} strokeWidth={SW*1.4} />
      <path d="M -7 -2 L 7 -2" stroke={Gx} strokeWidth={SW*0.8} />
      {/* small leaf at brim */}
      <path d="M 7 4 Q 12 4 12 9" stroke={Gx} strokeWidth={SW*0.7} fill="none" />
      <circle cx="12" cy="9" r="1.4" fill={Gx} />
    </g>
  ),

  // Mr. Bennet-like — spectacles + quill
  gentleman_scholar: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-5" cy="-1" r="5" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <circle cx=" 5" cy="-1" r="5" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <line x1="-1" y1="-1" x2="1" y2="-1" stroke={S} strokeWidth={SW*1.4} />
      {/* quill behind */}
      <path d="M -14 12 L 14 -14" stroke={S} strokeWidth={SW*1.4} />
      <path d="M -14 12 L -8 10 L 8 -8 L 14 -14 L 8 -12 L -10 6 z"
            fill={C} stroke={S} strokeWidth={SW*0.8} />
      <path d="M -10 8 L 10 -10" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Mr. Gardiner-like — merchant scales
  gentleman_merchant: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <line x1="0" y1="-11" x2="0" y2="11" stroke={S} strokeWidth={SW*1.2} />
      <line x1="-10" y1="-7" x2="10" y2="-7" stroke={S} strokeWidth={SW*1.2} />
      {/* two pans */}
      <path d="M -14 -2 Q -10 0 -6 -2 L -8 -4 z" fill="none" stroke={S} strokeWidth={SW} />
      <path d="M  6 -2 Q  10 0  14 -2 L 12 -4 z" fill="none" stroke={S} strokeWidth={SW} />
      <line x1="-10" y1="-7" x2="-10" y2="-3" stroke={S} strokeWidth={SW*0.6} />
      <line x1=" 10" y1="-7" x2=" 10" y2="-3" stroke={S} strokeWidth={SW*0.6} />
      {/* base */}
      <path d="M -5 11 L 5 11 L 7 8 L -7 8 z" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Elder gentleman — walking stick + monocle
  gentleman_elder: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* cane */}
      <path d="M 5 -12 Q 9 -10 7 -6 L -8 12" stroke={S} strokeWidth={SW*1.5} fill="none" />
      {/* monocle */}
      <circle cx="-4" cy="-5" r="4" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <path d="M -4 -1 L -6 4" stroke={S} strokeWidth={SW*0.6} fill="none" />
    </g>
  ),

  // Young dandy — fancy cravat with stickpin
  gentleman_dandy: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -8 -10 L 8 -10 L 6 12 L -6 12 z" fill={C} stroke={S} strokeWidth={SW} />
      {/* layered cravat */}
      <path d="M -6 -8 Q 0 -4 6 -8" stroke={S} strokeWidth={SW*0.7} fill="none" />
      <path d="M -5 -4 Q 0 0 5 -4" stroke={S} strokeWidth={SW*0.7} fill="none" />
      <path d="M -4 0 Q 0 4 4 0" stroke={S} strokeWidth={SW*0.7} fill="none" />
      {/* pin */}
      <circle cx="0" cy="-2" r="1.6" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <line x1="0" y1="0" x2="0" y2="4" stroke={Gx} strokeWidth={SW*0.8} />
    </g>
  ),

  // ═══════════════ PROFESSION / ROLE ═══════════════

  // Collins-like — clergy cross + bands
  clergyman: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-9" y="-12" width="18" height="24" fill={S} stroke={S} strokeWidth={SW} />
      <path d="M -2 -8 L -2 -2 L -6 -2 L -6 2 L -2 2 L -2 10 L 2 10 L 2 2 L 6 2 L 6 -2 L 2 -2 L 2 -8 z"
            fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* white tabs above cross */}
      <rect x="-3" y="-12" width="2" height="4" fill={C} />
      <rect x=" 1" y="-12" width="2" height="4" fill={C} />
    </g>
  ),

  // Wickham-like — crossed sabres
  officer_dashing: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -12 L 12 12 L 13 9 L -9 -13 z" fill={C} stroke={S} strokeWidth={SW} />
      <path d="M 12 -12 L -12 12 L -13 9 L 9 -13 z" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-13" y="-14" width="6" height="2" fill={Gx} stroke={S} strokeWidth={SW*0.5}
            transform="rotate(45 -10 -13)" />
      <rect x="7" y="-14" width="6" height="2" fill={Gx} stroke={S} strokeWidth={SW*0.5}
            transform="rotate(-45 10 -13)" />
      <circle cx="0" cy="0" r="2.6" fill={R} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Colonel Fitzwilliam-like — military star + ribbon
  officer_steady: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* star */}
      <path d="M 0 -11 L 3.2 -3.4 L 11 -3.4 L 4.8 1.4 L 7 9 L 0 4.8 L -7 9 L -4.8 1.4 L -11 -3.4 L -3.2 -3.4 z"
            fill={Gx} stroke={S} strokeWidth={SW*0.8} />
      <circle r="3" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <text x="0" y="3" textAnchor="middle" fontFamily="Spectral, serif" fontSize="6" fill={S} fontStyle="italic">VI</text>
    </g>
  ),

  // Monk — simple Greek cross in circle
  monk: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={S} stroke={S} strokeWidth={SW*0.6} />
      <circle r="9" fill="none" stroke={Gx} strokeWidth={SW} />
      <line x1="0" y1="-7" x2="0" y2="7" stroke={Gx} strokeWidth={SW*1.4} />
      <line x1="-7" y1="0" x2="7" y2="0" stroke={Gx} strokeWidth={SW*1.4} />
      <circle r="1.4" fill={Gx} />
    </g>
  ),

  // Detective — magnifying glass
  detective: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-2" cy="-2" r="8" fill="none" stroke={S} strokeWidth={SW*1.6} />
      <circle cx="-2" cy="-2" r="5.5" fill="none" stroke={S} strokeWidth={SW*0.5} />
      <line x1="3.5" y1="3.5" x2="11" y2="11" stroke={S} strokeWidth={SW*2.5} />
      <line x1="3.5" y1="3.5" x2="11" y2="11" stroke={Gx} strokeWidth={SW*1.2} />
      {/* glint */}
      <line x1="-6" y1="-5" x2="-4" y2="-3" stroke={C} strokeWidth={SW*0.8} opacity="0.8" />
    </g>
  ),

  // Doctor — mortar and pestle
  doctor: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* mortar bowl */}
      <path d="M -10 0 Q -10 9 0 11 Q 10 9 10 0 z" fill={C} stroke={S} strokeWidth={SW*1.2} />
      <ellipse cx="0" cy="0" rx="10" ry="2.5" fill={C} stroke={S} strokeWidth={SW*1.2} />
      <ellipse cx="0" cy="0" rx="7" ry="1.6" fill={S} />
      {/* pestle */}
      <line x1="-7" y1="-12" x2="3" y2="-2" stroke={S} strokeWidth={SW*2.4} />
      <circle cx="-7" cy="-12" r="2.2" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Narrator — quill & ink
  narrator: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* inkwell */}
      <path d="M -10 6 L -8 12 L 4 12 L 6 6 z" fill={S} stroke={S} strokeWidth={SW} />
      <ellipse cx="-2" cy="6" rx="8" ry="1.6" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      {/* quill */}
      <path d="M -2 6 L 14 -14" stroke={S} strokeWidth={SW*1.4} />
      <path d="M -2 6 L 3 4 L 12 -10 L 14 -14 L 10 -12 L 1 2 z"
            fill={C} stroke={S} strokeWidth={SW*0.8} />
      <path d="M 1 2 L 12 -10" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Ghost — wisp / candle flame
  ghost: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={S} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 12 L 0 4 Q -6 -2 -3 -8 Q 0 -4 2 -8 Q -1 -14 0 -16 Q 4 -10 3 -4 Q 6 -2 0 4"
            fill={Gb} stroke={Gx} strokeWidth={SW*0.7} opacity="0.9" />
      <ellipse cx="0" cy="12" rx="6" ry="1.2" fill={Gb} opacity="0.5" />
      {/* faint glow */}
      <circle r="10" fill="none" stroke={Gx} strokeWidth={SW*0.3} opacity="0.4" />
    </g>
  ),

  // Villain — black mask
  villain: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -4 Q -12 -10 -7 -10 L -2 -8 L 2 -8 L 7 -10 Q 12 -10 12 -4 Q 12 4 6 2 Q 0 0 -6 2 Q -12 4 -12 -4 z"
            fill={S} stroke={S} strokeWidth={SW} />
      {/* eye holes */}
      <ellipse cx="-6" cy="-3" rx="2.5" ry="1.6" fill={C} />
      <ellipse cx=" 6" cy="-3" rx="2.5" ry="1.6" fill={C} />
      {/* ribbon ties */}
      <path d="M -12 -4 L -16 -2 L -14 2 z" fill={R} stroke={S} strokeWidth={SW*0.5} />
      <path d="M 12 -4 L 16 -2 L 14 2 z" fill={R} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Sailor — anchor
  sailor: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="0" cy="-9" r="3" fill="none" stroke={S} strokeWidth={SW*1.6} />
      <line x1="0" y1="-6" x2="0" y2="9" stroke={S} strokeWidth={SW*1.8} />
      <line x1="-6" y1="-3" x2="6" y2="-3" stroke={S} strokeWidth={SW*1.6} />
      <path d="M -11 4 Q -11 11 0 11 Q 11 11 11 4" fill="none" stroke={S} strokeWidth={SW*1.6} />
      <path d="M -11 4 L -8 8 M 11 4 L 8 8" stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Pirate — skull (simplified, friendly)
  pirate: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -9 -4 Q -9 -12 0 -12 Q 9 -12 9 -4 Q 9 4 6 6 L 6 10 L 3 10 L 3 7 L -3 7 L -3 10 L -6 10 L -6 6 Q -9 4 -9 -4 z"
            fill={C} stroke={S} strokeWidth={SW} />
      <circle cx="-3.5" cy="-3" r="2" fill={S} />
      <circle cx=" 3.5" cy="-3" r="2" fill={S} />
      <path d="M -2 2 L -1 4 L 1 4 L 2 2 z" fill={S} />
      <line x1="-3" y1="6" x2="-2" y2="8" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-1" y1="6" x2="0" y2="8" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 1" y1="6" x2="2" y2="8" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Royal — crown
  royal: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -11 5 L -11 -4 L -7 0 L -3 -8 L 0 -2 L 3 -8 L 7 0 L 11 -4 L 11 5 z"
            fill={Gx} stroke={S} strokeWidth={SW} />
      <line x1="-11" y1="5" x2="11" y2="5" stroke={S} strokeWidth={SW} />
      <line x1="-11" y1="8" x2="11" y2="8" stroke={S} strokeWidth={SW*0.7} />
      <circle cx="-7" cy="0" r="1.4" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <circle cx="0" cy="-4" r="1.6" fill={R} stroke={S} strokeWidth={SW*0.5} />
      <circle cx=" 7" cy="0" r="1.4" fill={C} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // Worker — hammer
  worker: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-9" y="-7" width="14" height="6" fill={S} stroke={S} strokeWidth={SW} transform="rotate(35 -2 -4)" />
      <line x1="3" y1="-1" x2="-9" y2="11" stroke={Gx} strokeWidth={SW*2} />
      <line x1="-8" y1="10" x2="-10" y2="12" stroke={S} strokeWidth={SW*0.8} />
    </g>
  ),

  // Child — kite / balloon
  child: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 -10 L 8 0 L 0 10 L -8 0 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <line x1="0" y1="-10" x2="0" y2="10" stroke={S} strokeWidth={SW*0.6} />
      <line x1="-8" y1="0" x2="8" y2="0" stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 10 Q -2 14 -1 16 Q 1 14 2 16 Q -1 18 -2 20" fill="none" stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  // Monster — broken chain (bondage / unleashed)
  monster: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-7" cy="-5" rx="3.5" ry="5" fill="none" stroke={S} strokeWidth={SW*1.4} transform="rotate(-30 -7 -5)" />
      <ellipse cx=" 7" cy=" 5" rx="3.5" ry="5" fill="none" stroke={S} strokeWidth={SW*1.4} transform="rotate(-30 7 5)" />
      {/* broken middle */}
      <path d="M -4 -2 L 0 0 L -2 4" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <path d="M 4 2 L 2 -2 L 5 -1" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <path d="M 0 0 L -3 6 M 0 0 L 4 -4" stroke={Gx} strokeWidth={SW*0.8} opacity="0.8" />
    </g>
  ),

  // ═══════════════ OBJECTS — architectural / item silhouettes ═══════════════

  manor: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* portico */}
      <path d="M -16 -4 L 0 -14 L 16 -4 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <rect x="-14" y="-4" width="28" height="14" fill={C} stroke={S} strokeWidth={SW} />
      <line x1="-10" y1="-4" x2="-10" y2="10" stroke={S} strokeWidth={SW*0.7} />
      <line x1="-3"  y1="-4" x2="-3"  y2="10" stroke={S} strokeWidth={SW*0.7} />
      <line x1=" 3"  y1="-4" x2=" 3"  y2="10" stroke={S} strokeWidth={SW*0.7} />
      <line x1=" 10" y1="-4" x2=" 10" y2="10" stroke={S} strokeWidth={SW*0.7} />
      <line x1="-14" y1="10" x2="14" y2="10" stroke={S} strokeWidth={SW*0.8} />
      <rect x="-2.5" y="3" width="5" height="7" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <circle cx="0" cy="-8" r="1.2" fill={C} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  house: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -4 L 0 -12 L 12 -4 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <rect x="-10" y="-4" width="20" height="14" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-7" y="0" width="4" height="4" fill="none" stroke={S} strokeWidth={SW*0.6} />
      <line x1="-5" y1="0" x2="-5" y2="4" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-7" y1="2" x2="-3" y2="2" stroke={S} strokeWidth={SW*0.5} />
      <rect x=" 3" y="0" width="4" height="4" fill="none" stroke={S} strokeWidth={SW*0.6} />
      <line x1=" 5" y1="0" x2=" 5" y2="4" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 3" y1="2" x2=" 7" y2="2" stroke={S} strokeWidth={SW*0.5} />
      <rect x="-1.5" y="4" width="3" height="6" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <rect x="5" y="-10" width="3" height="6" fill={C} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  cottage: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -10 -2 L 0 -11 L 10 -2 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <rect x="-9" y="-2" width="18" height="12" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-1.5" y="3" width="3" height="7" fill={S} stroke={S} strokeWidth={SW*0.5} />
      {/* smoke */}
      <path d="M 6 -10 Q 9 -13 7 -16" stroke={S} strokeWidth={SW*0.6} fill="none" opacity="0.6" />
      <path d="M 8 -8 Q 11 -11 9 -14" stroke={S} strokeWidth={SW*0.6} fill="none" opacity="0.4" />
    </g>
  ),

  estate: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -2 -14 L 0 -18 L 2 -14 z" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -13 -2 L 0 -14 L 13 -2 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <rect x="-12" y="-2" width="24" height="13" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-9" y="2" width="3" height="4" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <rect x="-1.5" y="2" width="3" height="4" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <rect x=" 6" y="2" width="3" height="4" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <rect x="-2" y="6" width="4" height="5" fill={S} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  castle: () => (
    <g>
      <rect x="-16" y="-16" width="32" height="32" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-14" y="-2" width="28" height="13" fill={C} stroke={S} strokeWidth={SW} />
      {/* turrets */}
      <rect x="-14" y="-10" width="6" height="8" fill={C} stroke={S} strokeWidth={SW} />
      <rect x=" 8" y="-10" width="6" height="8" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-3" y="-13" width="6" height="11" fill={C} stroke={S} strokeWidth={SW} />
      {/* crenellations */}
      <rect x="-14" y="-12" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <rect x="-11" y="-12" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <rect x="  8" y="-12" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <rect x=" 11" y="-12" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <rect x="-3" y="-15" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      <rect x=" 1" y="-15" width="2" height="2" fill={C} stroke={S} strokeWidth={SW*0.5} />
      {/* flag */}
      <line x1="0" y1="-15" x2="0" y2="-19" stroke={S} strokeWidth={SW*0.8} />
      <path d="M 0 -19 L 5 -18 L 4 -17 L 0 -17 z" fill={R} stroke={S} strokeWidth={SW*0.5} />
      {/* gate */}
      <path d="M -2 11 L -2 5 Q 0 3 2 5 L 2 11 z" fill={S} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  ship: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -14 6 L 14 6 L 10 12 L -10 12 z" fill={S} stroke={S} strokeWidth={SW} />
      <line x1="0" y1="6" x2="0" y2="-12" stroke={S} strokeWidth={SW*1.4} />
      <path d="M 1 4 L 11 -6 L 1 -6 z" fill={C} stroke={S} strokeWidth={SW*0.8} />
      <path d="M -1 -6 L -8 -12 L -1 -12 z" fill={C} stroke={S} strokeWidth={SW*0.8} />
      <path d="M -10 10 Q 0 14 10 10" stroke={Gx} strokeWidth={SW*0.6} fill="none" />
    </g>
  ),

  letter: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-12" y="-7" width="24" height="14" fill={C} stroke={S} strokeWidth={SW} />
      <path d="M -12 -7 L 0 3 L 12 -7" fill="none" stroke={S} strokeWidth={SW*0.8} />
      <path d="M -12 7 L -3 0 M 12 7 L 3 0" stroke={S} strokeWidth={SW*0.6} fill="none" />
      <circle cx="0" cy="2" r="3.4" fill={R} stroke={S} strokeWidth={SW*0.8} />
      <path d="M -1.5 0.5 L 1.5 3.5 M 1.5 0.5 L -1.5 3.5" stroke={C} strokeWidth={SW*0.7} />
    </g>
  ),

  book: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -8 Q 0 -10 0 -8 Q 0 -10 12 -8 L 12 8 Q 0 6 0 8 Q 0 6 -12 8 z"
            fill={C} stroke={S} strokeWidth={SW} />
      <line x1="0" y1="-8" x2="0" y2="8" stroke={S} strokeWidth={SW*0.8} />
      <line x1="-9" y1="-5" x2="-3" y2="-5.5" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-9" y1="-3" x2="-3" y2="-3.5" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-9" y1="-1" x2="-3" y2="-1.5" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-9" y1="1" x2="-3" y2="0.5" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 3" y1="-5.5" x2=" 9" y2="-5" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 3" y1="-3.5" x2=" 9" y2="-3" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 3" y1="-1.5" x2=" 9" y2="-1" stroke={S} strokeWidth={SW*0.5} />
      <line x1=" 3" y1="0.5"  x2=" 9" y2="1"  stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  scroll: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-11" cy="0" rx="3" ry="10" fill={C} stroke={S} strokeWidth={SW} />
      <ellipse cx=" 11" cy="0" rx="3" ry="10" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-11" y="-10" width="22" height="20" fill={C} />
      <line x1="-11" y1="-10" x2="11" y2="-10" stroke={S} strokeWidth={SW} />
      <line x1="-11" y1="10"  x2="11" y2="10"  stroke={S} strokeWidth={SW} />
      <line x1="-7" y1="-5" x2="7" y2="-5" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-7" y1="-2" x2="5" y2="-2" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-7" y1=" 1" x2="6" y2=" 1" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-7" y1=" 4" x2="4" y2=" 4" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  key: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-7" cy="0" r="6" fill="none" stroke={S} strokeWidth={SW*1.6} />
      <circle cx="-7" cy="0" r="2.2" fill="none" stroke={S} strokeWidth={SW*1.2} />
      <line x1="-1" y1="0" x2="13" y2="0" stroke={S} strokeWidth={SW*1.8} />
      <line x1="9" y1="0" x2="9" y2="5" stroke={S} strokeWidth={SW*1.6} />
      <line x1="12" y1="0" x2="12" y2="5" stroke={S} strokeWidth={SW*1.6} />
    </g>
  ),

  chain: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-9" cy="0" rx="4" ry="6" fill="none" stroke={Gx} strokeWidth={SW*1.6} transform="rotate(45 -9 0)" />
      <ellipse cx=" 0" cy="0" rx="4" ry="6" fill="none" stroke={Gx} strokeWidth={SW*1.6} transform="rotate(-45 0 0)" />
      <ellipse cx=" 9" cy="0" rx="4" ry="6" fill="none" stroke={Gx} strokeWidth={SW*1.6} transform="rotate(45 9 0)" />
    </g>
  ),

  ring: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="0" cy="3" r="8" fill="none" stroke={Gx} strokeWidth={SW*2.2} />
      <path d="M -3 -7 L 0 -10 L 3 -7 z" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="0" cy="-9" r="2" fill={R} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  weapon: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 11 -11 L -7 7 L -10 10 L -8 12 L -5 9 L 13 -9 z" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-2" y="-2" width="5" height="2" fill={S} transform="rotate(-45 0 0)" />
      <circle cx="-1" cy="1" r="1.8" fill={Gx} stroke={S} strokeWidth={SW*0.5} />
      <line x1="11" y1="-11" x2="13" y2="-13" stroke={S} strokeWidth={SW} />
    </g>
  ),

  garden: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <line x1="0" y1="14" x2="0" y2="-2" stroke={S} strokeWidth={SW*1.4} />
      <circle cx="0" cy="-5" r="9" fill={M} stroke={S} strokeWidth={SW} />
      <circle cx="-4" cy="-7" r="3" fill="none" stroke={C} strokeWidth={SW*0.6} />
      <circle cx=" 4" cy="-3" r="3" fill="none" stroke={C} strokeWidth={SW*0.6} />
      <line x1="-9" y1="14" x2="9" y2="14" stroke={S} strokeWidth={SW*0.8} />
    </g>
  ),

  coach: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-10" y="-6" width="20" height="8" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-7" y="-4" width="5" height="4" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <rect x=" 2" y="-4" width="5" height="4" fill={S} stroke={S} strokeWidth={SW*0.5} />
      <circle cx="-6" cy="6" r="4.5" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <circle cx="-6" cy="6" r="1.2" fill={S} />
      <circle cx=" 6" cy="6" r="4.5" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <circle cx=" 6" cy="6" r="1.2" fill={S} />
      <line x1="-6" y1="2" x2="-6" y2="10" stroke={S} strokeWidth={SW*0.5} />
      <line x1="-10" y1="6" x2="-2" y2="6" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  door: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <rect x="-7" y="-12" width="14" height="22" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-5" y="-10" width="10" height="8" fill="none" stroke={S} strokeWidth={SW*0.6} />
      <rect x="-5" y="0" width="10" height="8" fill="none" stroke={S} strokeWidth={SW*0.6} />
      <circle cx="3" cy="-1" r="1" fill={Gx} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // ═══════════════ EVENTS ═══════════════

  meeting: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-4" cy="6" rx="3.5" ry="2.5" fill={S} stroke={S} strokeWidth={SW} transform="rotate(-15 -4 6)" />
      <line x1="-0.5" y1="6" x2="-0.5" y2="-10" stroke={S} strokeWidth={SW*1.6} />
      <path d="M -0.5 -10 Q 8 -8 6 -2" fill="none" stroke={S} strokeWidth={SW*1.6} />
    </g>
  ),

  wedding: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-4" cy="0" r="6" fill="none" stroke={Gx} strokeWidth={SW*2} />
      <circle cx=" 4" cy="0" r="6" fill="none" stroke={Gx} strokeWidth={SW*2} />
    </g>
  ),

  proposal: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 -9 Q -7 -13 -9 -7 Q -9 0 0 8 Q 9 0 9 -7 Q 7 -13 0 -9 z" fill={R} stroke={S} strokeWidth={SW} />
    </g>
  ),

  carriage_wheel: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle r="11" fill="none" stroke={S} strokeWidth={SW*1.4} />
      <line x1="0" y1="-11" x2="0" y2="11" stroke={S} strokeWidth={SW*0.8} />
      <line x1="-11" y1="0" x2="11" y2="0" stroke={S} strokeWidth={SW*0.8} />
      <line x1="-7.8" y1="-7.8" x2="7.8" y2="7.8" stroke={S} strokeWidth={SW*0.8} />
      <line x1="-7.8" y1="7.8" x2="7.8" y2="-7.8" stroke={S} strokeWidth={SW*0.8} />
      <circle r="3" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  footsteps: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-5" cy="-7" rx="2.4" ry="3.5" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx=" 3" cy="-1" rx="2.4" ry="3.5" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <ellipse cx="-3" cy=" 5" rx="2.4" ry="3.5" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-5" cy="-11" r="0.8" fill={Gx} />
      <circle cx="-3" cy="-10" r="0.8" fill={Gx} />
    </g>
  ),

  pointing: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -2 L 0 -2 L 0 -7 L 11 0 L 0 7 L 0 2 L -12 2 z" fill={Gx} stroke={S} strokeWidth={SW} />
    </g>
  ),

  battle: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -12 L 12 12 L 13 9 L -9 -13 z" fill={C} stroke={S} strokeWidth={SW} />
      <path d="M 12 -12 L -12 12 L -13 9 L 9 -13 z" fill={C} stroke={S} strokeWidth={SW} />
      <circle r="2.2" fill={R} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  death: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      {/* urn */}
      <path d="M -8 -8 L 8 -8 L 6 -4 L 7 6 Q 0 11 -7 6 L -6 -4 z" fill={C} stroke={S} strokeWidth={SW} />
      <line x1="-8" y1="-8" x2="8" y2="-8" stroke={S} strokeWidth={SW*1.2} />
      <line x1="-7" y1="0" x2="7" y2="0" stroke={S} strokeWidth={SW*0.5} />
      <path d="M -3 -6 L -3 -2 M 3 -6 L 3 -2" stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  // ═══════════════ CONCEPTS ═══════════════

  pride: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 -14 Q -8 -8 -6 4 Q 0 8 6 4 Q 8 -8 0 -14 z" fill={C} stroke={S} strokeWidth={SW} />
      <circle cx="0" cy="-4" r="4" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="0" cy="-4" r="1.6" fill={S} />
      <line x1="0" y1="8" x2="0" y2="13" stroke={S} strokeWidth={SW} />
    </g>
  ),

  prejudice: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 0 Q 0 -8 12 0 Q 0 8 -12 0 z" fill={C} stroke={S} strokeWidth={SW} />
      <rect x="-14" y="-3" width="28" height="6" fill={S} />
      <line x1="-14" y1="-6" x2="-14" y2="6" stroke={S} strokeWidth={SW*0.6} />
      <line x1=" 14" y1="-6" x2=" 14" y2="6" stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  love: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 -8 Q -8 -13 -10 -5 Q -10 5 0 11 Q 10 5 10 -5 Q 8 -13 0 -8 z" fill={R} stroke={S} strokeWidth={SW} />
    </g>
  ),

  marriage: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <circle cx="-4" cy="0" r="5.5" fill="none" stroke={Gx} strokeWidth={SW*2} />
      <circle cx=" 4" cy="0" r="5.5" fill="none" stroke={Gx} strokeWidth={SW*2} />
    </g>
  ),

  class: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 9 L 0 -12 L 12 9 z" fill="none" stroke={S} strokeWidth={SW*1.2} />
      <line x1="-8" y1="2" x2="8" y2="2" stroke={S} strokeWidth={SW*0.6} />
      <line x1="-4" y1="-4" x2="4" y2="-4" stroke={S} strokeWidth={SW*0.6} />
      <path d="M -2 -10 L 0 -12 L 2 -10 L 0 -8 z" fill={Gx} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  reputation: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -10 10 L 10 -10" stroke={S} strokeWidth={SW*1.4} />
      <path d="M -10 10 L -2 8 L 8 -2 L 10 -10 L 2 -8 L -8 2 z" fill={C} stroke={S} strokeWidth={SW} />
      <path d="M -8 2 L 8 -2 M -2 8 L 2 -8" stroke={S} strokeWidth={SW*0.5} />
      <circle cx="-10" cy="10" r="1.4" fill={S} />
    </g>
  ),

  madness: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M 0 0 m -1 0 a 1 1 0 1 1 2 0 a 3 3 0 1 1 -6 0 a 5 5 0 1 1 10 0 a 7 7 0 1 1 -14 0 a 9 9 0 1 1 18 0"
            fill="none" stroke={S} strokeWidth={SW*1.2} />
    </g>
  ),

  knowledge: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -12 -6 Q 0 -8 0 -6 Q 0 -8 12 -6 L 12 8 Q 0 6 0 8 Q 0 6 -12 8 z" fill={C} stroke={S} strokeWidth={SW} />
      <line x1="0" y1="-6" x2="0" y2="8" stroke={S} strokeWidth={SW*0.8} />
      {/* candle flame above */}
      <path d="M 0 -8 Q -3 -12 -1 -15 Q 0 -13 1 -15 Q 3 -12 0 -8 z" fill={Gx} stroke={S} strokeWidth={SW*0.6} />
    </g>
  ),

  power: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -11 5 L -11 -4 L -7 0 L -3 -8 L 0 -2 L 3 -8 L 7 0 L 11 -4 L 11 5 z" fill={Gx} stroke={S} strokeWidth={SW} />
      <line x1="-11" y1="5" x2="11" y2="5" stroke={S} strokeWidth={SW} />
      <circle cx="0" cy="-4" r="1.6" fill={R} stroke={S} strokeWidth={SW*0.5} />
    </g>
  ),

  time: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <path d="M -10 -12 L 10 -12 L 10 -9 L 0 0 L 10 9 L 10 12 L -10 12 L -10 9 L 0 0 L -10 -9 z"
            fill={C} stroke={S} strokeWidth={SW*1.2} />
      <path d="M -7 -10 L 7 -10 L 0 -3 z" fill={Gx} />
      <path d="M -7 10 L 7 10 L 0 3 z" fill={Gx} opacity="0.4" />
    </g>
  ),

  nature: () => (
    <g>
      <circle cx="0" cy="0" r="14" fill={C} stroke={S} strokeWidth={SW*0.6} />
      <line x1="0" y1="13" x2="0" y2="-3" stroke={S} strokeWidth={SW*1.6} />
      <circle cx="0" cy="-5" r="10" fill={M} stroke={S} strokeWidth={SW} />
      <circle cx="-4" cy="-7" r="3.5" fill="none" stroke={C} strokeWidth={SW*0.7} />
      <circle cx=" 4" cy="-3" r="3" fill="none" stroke={C} strokeWidth={SW*0.7} />
      <circle cx="-2" cy="-2" r="2" fill="none" stroke={C} strokeWidth={SW*0.7} />
    </g>
  ),
};

window.LG_ARCHETYPE_ALIAS = {
  young_lady: "lady_young",
  ostrich: "lady_fashion",
  matron: "matron_kind",
  bookish_lady: "lady_bookish",
  officer: "officer_dashing",
  priest: "clergyman",
};

// Per-type rotating pools used when an entity has no explicit archetype
// mapping. Pulled by hashing the entity id so two unmapped entities don't
// land on the same fallback — this is how every new book added later
// still gets visually distinct icons without needing per-character work.
window.LG_FALLBACK_POOLS = {
  agent: [
    "lady_young","lady_gentle","lady_plain","lady_fashion","lady_bookish","lady_shy",
    "matron_anxious","matron_kind","matron_imperious",
    "gentleman_proud","gentleman_friendly","gentleman_scholar","gentleman_merchant","gentleman_elder","gentleman_dandy",
    "clergyman","officer_dashing","officer_steady",
    "monk","detective","doctor","narrator","ghost","villain","sailor","pirate","royal","worker","child",
  ],
  object: ["manor","house","cottage","estate","castle","ship","letter","book","scroll","key","chain","ring","weapon","garden","coach","door"],
  event:  ["meeting","wedding","proposal","carriage_wheel","footsteps","pointing","battle","death"],
  concept:["pride","prejudice","love","marriage","class","reputation","madness","knowledge","power","time","nature"],
};

window.getAvatar = function(archetypeOrId, fallbackType, entityId) {
  const key = window.LG_ARCHETYPE_ALIAS[archetypeOrId] || archetypeOrId;
  const fn = window.LG_ARCHETYPES[key];
  if (fn) return fn();
  // Deterministic hash-based fallback so unmapped entities of the same
  // type don't collapse to a single icon.
  if (entityId && fallbackType) {
    const pool = window.LG_FALLBACK_POOLS[fallbackType];
    if (pool && pool.length) {
      let h = 0;
      for (let i = 0; i < entityId.length; i++) h = (h * 31 + entityId.charCodeAt(i)) | 0;
      const arch = pool[Math.abs(h) % pool.length];
      const f = window.LG_ARCHETYPES[arch];
      if (f) return f();
    }
  }
  const fb = {
    agent:   "lady_young",
    object:  "letter",
    event:   "meeting",
    concept: "love",
  }[fallbackType];
  return fb && window.LG_ARCHETYPES[fb] ? window.LG_ARCHETYPES[fb]() : null;
};

// Per-book archetype mapping. New books extend this map.
window.LG_ENTITY_ARCHETYPE = {
  // ───── Pride and Prejudice ─────
  e01: "lady_young", e02: "gentleman_proud", e03: "lady_gentle",
  e04: "gentleman_friendly", e05: "gentleman_scholar", e06: "matron_anxious",
  e07: "lady_silly", e08: "lady_bookish", e09: "lady_young",
  e10: "officer_dashing", e11: "clergyman", e12: "matron_imperious",
  e13: "lady_plain", e14: "lady_fashion", e15: "lady_shy",
  e16: "gentleman_merchant", e17: "matron_kind", e18: "officer_steady",
  o01: "manor", o02: "house", o03: "estate", o04: "estate",
  o05: "letter", o06: "chain",
  v01: "key", v02: "meeting", v03: "proposal", v04: "carriage_wheel",
  v05: "footsteps", v06: "pointing", v07: "wedding", v08: "proposal",
  c01: "pride", c02: "prejudice", c03: "marriage",
  c04: "class", c05: "reputation", c06: "chain",

  // ───── One Hundred Years of Solitude ─────
  // Buendía family — six generations
  sa01: "gentleman_elder",      // José Arcadio Buendía — founding patriarch, alchemy obsession
  sa02: "matron_imperious",     // Úrsula Iguarán — 120-year matriarch
  sa03: "sailor",               // José Arcadio (son) — wandered the world at sea
  sa04: "officer_dashing",      // Colonel Aureliano Buendía — 32 uprisings
  sa05: "lady_plain",           // Amaranta — bitter, lifelong spinster
  sa06: "lady_shy",             // Rebeca — orphan with the bag of bones
  sa07: "villain",              // Arcadio — tyrant of Macondo
  sa08: "officer_steady",       // Aureliano José — Colonel's son
  sa09: "matron_kind",          // Santa Sofía de la Piedad — silent caretaker
  sa10: "worker",               // José Arcadio Segundo — labor activist
  sa11: "gentleman_dandy",      // Aureliano Segundo — hedonist, fortune of breeding livestock
  sa12: "lady_fashion",         // Fernanda del Carpio — high-bred outsider
  sa13: "lady_young",           // Meme — modern youth
  sa14: "clergyman",            // José Arcadio (seminarian)
  sa15: "lady_gentle",          // Remedios the Beauty — ethereal
  sa16: "gentleman_scholar",    // Aureliano Babilonia — solitary reader of the parchments
  sa17: "lady_silly",           // Amaranta Úrsula — joyful, modern
  sa18: "child",                // Aureliano (the last) — pig-tailed baby
  // Outsiders to the Buendía household
  sa19: "narrator",             // Melquíades — gypsy chronicler
  sa20: "matron_anxious",       // Pilar Ternera — fortune-teller
  sa21: "gentleman_friendly",   // Pietro Crespi — Italian musician
  sa22: "lady_bookish",         // Petra Cotes — mistress whose love makes livestock breed
  sa23: "detective",            // Mauricio Babilonia — mechanic followed by yellow butterflies
  sa24: "gentleman_merchant",   // Mr. Brown / Banana Company

  // Macondo objects
  so01: "estate",               // Macondo itself
  so02: "cottage",              // Melquíades's room
  so03: "garden",               // the chestnut tree
  so04: "scroll",               // the parchments
  so05: "coach",                // the railway
  so06: "ring",                 // the yellow butterflies (delicate symbolic object)

  // Macondo events
  sv01: "meeting",              // founding of Macondo
  sv02: "death",                // the insomnia plague
  sv03: "battle",               // the 32 uprisings
  sv04: "carriage_wheel",       // banana company arrives
  sv05: "pointing",             // banana workers' massacre (the gesture of denial)
  sv06: "footsteps",            // the four-year rain (time passing)
  sv07: "wedding",              // Remedios the Beauty's ascension
  sv08: "key",                  // deciphering the parchments — the moment of unlocking

  // Macondo concepts
  sc01: "madness",              // solitude / soledad
  sc02: "time",                 // circular time
  sc03: "knowledge",            // memory & forgetting
  sc04: "nature",               // magic realism
  sc05: "reputation",           // the cursed bloodline
};

window.avatarFor = function(entity) {
  if (!entity) return null;
  const archetype = entity.archetype || window.LG_ENTITY_ARCHETYPE[entity.id];
  return window.getAvatar(archetype, entity.type, entity.id);
};
