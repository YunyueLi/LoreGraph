// LoreGraph — Book covers.
// Primary: real public-domain title-page scans from Wikimedia Commons,
// unified visually via a sepia/warm filter so the shelf reads as one collection.
// Fallback: hand-designed SVG cover (for books without a reliable PD scan).

const COVER_FILTER = "sepia(0.18) saturate(0.92) contrast(1.05) brightness(0.96)";

function CoverImage({ src, alt, fallback }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) return fallback;
  return (
    <div style={{
      width: "100%", height: "100%",
      position: "relative",
      overflow: "hidden",
      background: "#1a1714",
    }}>
      <img src={src} alt={alt}
        onError={() => setErrored(true)}
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          display: "block",
          filter: COVER_FILTER,
        }} />
      {/* warm gold overlay to unify shelves */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, rgba(184,149,74,0.04), rgba(60,40,10,0.10) 70%, rgba(26,23,20,0.18))",
        mixBlendMode: "multiply",
        pointerEvents: "none",
      }} />
      {/* edge vignette */}
      <div style={{
        position: "absolute", inset: 0,
        boxShadow: "inset 0 0 30px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,240,200,0.08)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

function CoverFrame({ children, bg = "#f5efe2" }) {
  return (
    <svg viewBox="0 0 240 340" preserveAspectRatio="xMidYMid slice" style={{width:"100%", height:"100%", display:"block"}}>
      <rect width="240" height="340" fill={bg} />
      {children}
    </svg>
  );
}

// Real photographs of public-domain title pages / first editions.
// URLs verified via Wikipedia's REST summary API (canonical Wikimedia paths).
// Rose: Eco's 1980 work is still copyrighted, so we use Book of Kells fol. 32v
// "Christ Enthroned" — a thematically appropriate medieval illuminated page.
window.LG_COVER_IMAGES = {
  pap:   "https://upload.wikimedia.org/wikipedia/commons/1/17/PrideAndPrejudiceTitlePage.jpg",
  rose:  "https://upload.wikimedia.org/wikipedia/commons/b/b1/KellsFol032vChristEnthroned.jpg",
  frank: "https://upload.wikimedia.org/wikipedia/commons/5/53/Christie%27s_auction_scan_of_Frankenstein_1818.jpg",
  drac:  "https://upload.wikimedia.org/wikipedia/commons/4/45/Dracula_1st_ed_cover_reproduction.jpg",
  mob:   "https://upload.wikimedia.org/wikipedia/commons/3/36/Moby-Dick_FE_title_page.jpg",
  alice: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Alice%27s_Adventures_in_Wonderland_cover_%281865%29.jpg",

  // Expanded library — URLs pulled from Wikipedia's REST summary API, all 200-verified.
  wuth:    "https://upload.wikimedia.org/wikipedia/commons/6/64/Houghton_Lowell_1238.5_%28A%29_-_Wuthering_Heights%2C_1847.jpg",
  jane:    "https://upload.wikimedia.org/wikipedia/commons/9/9b/Jane_Eyre_title_page.jpg",
  gex:     "https://upload.wikimedia.org/wikipedia/commons/8/8d/Greatexpectations_vol1.jpg",
  t2c:     "https://upload.wikimedia.org/wikipedia/commons/3/3c/Tales_serial.jpg",
  holm:    "https://upload.wikimedia.org/wikipedia/commons/b/b9/Adventures_of_sherlock_holmes.jpg",
  dorian:  "https://upload.wikimedia.org/wikipedia/commons/2/24/Lippincott_doriangray.jpg",
  treas:   "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Treasure_Island_%28title_page%2C_1883%29.webp/3840px-Treasure_Island_%28title_page%2C_1883%29.webp.png",
  huck:    "https://upload.wikimedia.org/wikipedia/commons/6/61/Huckleberry_Finn_book.JPG",
  war:     "https://upload.wikimedia.org/wikipedia/commons/3/30/The_War_of_the_Worlds_first_edition.jpg",
  hod:     "https://upload.wikimedia.org/wikipedia/commons/4/4a/Blackwood%27s_Magazine_-_1899_cover.jpg",
  lwom:    "https://upload.wikimedia.org/wikipedia/commons/f/f9/Houghton_AC85.A%E2%84%93194L.1869_pt.2aa_-_Little_Women%2C_title.jpg",
  oz:      "https://upload.wikimedia.org/wikipedia/commons/6/68/The_Wonderful_Wizard_of_Oz%2C_006.png",
  phant:   "https://upload.wikimedia.org/wikipedia/commons/7/76/Andr%C3%A9_Castaigne_Fant%C3%B4me_Op%C3%A9ra1.jpg",
  quix:    "https://upload.wikimedia.org/wikipedia/commons/b/ba/Title_page_first_edition_Don_Quijote.jpg",
  mis:     "https://upload.wikimedia.org/wikipedia/commons/f/fd/Monsieur_Madeleine_par_Gustave_Brion.jpg",
  mc:      "https://upload.wikimedia.org/wikipedia/commons/d/d6/Louis_Fran%C3%A7ais-Dant%C3%A8s_sur_son_rocher.jpg",
  cp:      "https://upload.wikimedia.org/wikipedia/en/4/4b/Crimeandpunishmentcover.png",
  kafka:   "https://upload.wikimedia.org/wikipedia/commons/a/a5/Franz_Kafka_Die_Verwandlung_1916_Orig.-Pappband.jpg",
  xyj:     "https://upload.wikimedia.org/wikipedia/commons/6/6a/Evl53201b_pic.jpg",
  hlm:     "https://upload.wikimedia.org/wikipedia/commons/7/79/Hongloumeng2.jpg",
  genji:   "https://upload.wikimedia.org/wikipedia/commons/4/4b/Genji_emaki_01003_002.jpg",
  hamlet:  "https://upload.wikimedia.org/wikipedia/commons/6/6a/Edwin_Booth_Hamlet_1870.jpg",
  macb:    "https://upload.wikimedia.org/wikipedia/commons/4/40/First-page-first-folio-macbeth.jpg",
  rj:      "https://upload.wikimedia.org/wikipedia/commons/5/55/Romeo_and_juliet_brown.jpg",
  midsum:  "https://upload.wikimedia.org/wikipedia/commons/6/60/John_Simmons_-_Titania_sleeping_in_the_moonlight_protected_by_her_fairies.jpg",
  earnest: "https://upload.wikimedia.org/wikipedia/en/4/49/Algy-and-Jack-1895.jpg",
  doll:    "https://upload.wikimedia.org/wikipedia/commons/f/fd/A_Doll%27s_House.jpeg",
  pyg:     "https://upload.wikimedia.org/wikipedia/commons/1/19/Cover-play1913.jpg",
  chr:     "https://upload.wikimedia.org/wikipedia/commons/3/35/The_Cherry_Orchard_MAT.jpg",
  mikado:  "https://upload.wikimedia.org/wikipedia/commons/c/ca/Doyly_Carte_Opera_Company_poster%2C_John_Hassall.jpg",
  // Original Carmen poster is ~57MB; Wikimedia's thumbnailer only serves 330px for it.
  carmen:  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Prudent-Louis_Leray_-_Poster_for_the_premi%C3%A8re_of_Georges_Bizet%27s_Carmen.jpg/330px-Prudent-Louis_Leray_-_Poster_for_the_premi%C3%A8re_of_Georges_Bizet%27s_Carmen.jpg",
  nosf:    "https://upload.wikimedia.org/wikipedia/en/9/90/Nosferatu_poster_%28Albin_Grau%2C_1922%29_1.jpg",
  metro:   "https://upload.wikimedia.org/wikipedia/en/9/97/Metropolis_%28German_three-sheet_poster%29.jpg",
  cali:    "https://upload.wikimedia.org/wikipedia/commons/5/52/Das_Cabinet_des_Dr._Caligari.JPG",

  // ---- More plays · musicals · operas · screenplays ----
  othello:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Othello_et_Desd%C3%A9mone_%C3%A0_Venise_-_Th%C3%A9odore_Chass%C3%A9riau_-_Mus%C3%A9e_du_Louvre_Peintures_RF_3897.jpg/3840px-Othello_et_Desd%C3%A9mone_%C3%A0_Venise_-_Th%C3%A9odore_Chass%C3%A9riau_-_Mus%C3%A9e_du_Louvre_Peintures_RF_3897.jpg",
  lear:       "https://upload.wikimedia.org/wikipedia/commons/3/31/Cordelia%27s_Portion.jpg",
  tempest:    "https://upload.wikimedia.org/wikipedia/commons/f/f9/First-page-first-folio-tempest.jpg",
  caesar:     "https://upload.wikimedia.org/wikipedia/commons/a/ab/Edwin_Austin_Abbey_-_Within_the_Tent_of_Brutus%2C_Enter_the_Ghost_of_Caesar%2C_Julius_Caesar%2C_Act_IV%2C_Scene_III_-_1937.1148_-_Yale_University_Art_Gallery.jpg",
  twelfth:    "https://upload.wikimedia.org/wikipedia/commons/c/ce/Daniel_Maclise_%281806-1870%29_-_Scene_from_%27Twelfth_Night%27_%28%27Malvolio_and_the_Countess%27%29_-_N00423_-_National_Gallery.jpg",
  merch:      "https://upload.wikimedia.org/wikipedia/commons/5/52/Merchant_venice_tp.jpg",
  oedipus:    "https://upload.wikimedia.org/wikipedia/commons/6/69/Oedipus.jpg",
  antigone:   "https://upload.wikimedia.org/wikipedia/commons/8/8c/Lytras_nikiforos_antigone_polynices.jpeg",
  medea:      "https://upload.wikimedia.org/wikipedia/commons/d/d8/Relief_of_Medea_and_the_Peliades_Antikensammlung_Berlin.jpg",
  lysist:     "https://upload.wikimedia.org/wikipedia/commons/4/43/Lysistrata.jpg",
  tartuffe:   "https://upload.wikimedia.org/wikipedia/commons/d/d2/Tartuffe.jpg",
  faust:      "https://upload.wikimedia.org/wikipedia/commons/5/51/Goethe_Faust_I_1808.jpg",
  peer:       "https://upload.wikimedia.org/wikipedia/commons/3/30/Henrik_Klausen_som_Peer_Gynt_-_1876_-_Ernst_Emil_Aubert_-_Oslo_Museum_-_TM.T01211_%28cropped%29.jpg",
  hedda:      "https://upload.wikimedia.org/wikipedia/commons/5/50/Nazimova_1907.jpg",
  seagull:    "https://upload.wikimedia.org/wikipedia/commons/0/04/Maly_Theatre_foto_4.jpg",
  vanya:      "https://upload.wikimedia.org/wikipedia/commons/9/94/Uncle_Vanya_MAT.jpg",
  julie:      "https://upload.wikimedia.org/wikipedia/commons/1/1f/MissJulie1906.jpg",
  salome:     "https://upload.wikimedia.org/wikipedia/commons/c/cb/Salom%C3%A9-_a_tragedy_in_one_act_pg_79.jpg",
  pinafore:   "https://upload.wikimedia.org/wikipedia/commons/e/eb/H_m_s_pinafore_restoration.jpg",
  pirates:    "https://upload.wikimedia.org/wikipedia/commons/d/da/Drawing_of_Act_I_Finale.jpg",
  iolanthe:   "https://upload.wikimedia.org/wikipedia/commons/a/a3/Iolanthe_piano_transcriptions_by_Ernst_Perabo.jpg",
  gondolier:  "https://upload.wikimedia.org/wikipedia/commons/1/17/1907_Gondoliers.jpg",
  threepenny: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Dreigroschenoper.JPG",
  mflute:     "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Mozart_magic_flute.jpg/3840px-Mozart_magic_flute.jpg",
  dongiov:    "https://upload.wikimedia.org/wikipedia/commons/5/58/Max_Slevogt_-_Der_S%C3%A4nger_Francisco_d%27Andrade_als_Don_Giovanni_in_Mozarts_Oper_-_Google_Art_Project.jpg",
  figaro:     "https://upload.wikimedia.org/wikipedia/commons/2/24/Ramberg_figaro_1.jpg",
  traviata:   "https://upload.wikimedia.org/wikipedia/commons/f/f6/La_Traviata_Premiere_Violetta_Costume.jpg",
  rigoletto:  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Philippe_Chaperon_-_Rigoletto.jpg/3840px-Philippe_Chaperon_-_Rigoletto.jpg",
  aida:       "https://upload.wikimedia.org/wikipedia/en/f/f7/Giuseppe_Verdi%2C_c._1872_Aida_vocal_score_cover_-_Restoration.jpg",
  boheme:     "https://upload.wikimedia.org/wikipedia/commons/7/70/La_Boheme_poster_by_Hohenstein.PNG",
  tosca:      "https://upload.wikimedia.org/wikipedia/commons/4/40/Tosca_%281899%29.jpg",
  butterfly:  "https://upload.wikimedia.org/wikipedia/commons/b/b4/Hohenstein_Madama_Butterfly.jpg",
  turandot:   "https://upload.wikimedia.org/wikipedia/commons/4/41/Poster_Turandot.jpg",
  barber:     "https://upload.wikimedia.org/wikipedia/commons/5/55/Alexandre_Fragonard_-_Sc%C3%A8ne_de_L%27orage_%28Barbier_de_S%C3%A9ville%29.jpg",
  tristan:    "https://upload.wikimedia.org/wikipedia/commons/c/c5/Joseph_Albert_-_Ludwig_und_Malwine_Schnorr_von_Carolsfeld_-_Tristan_und_Isolde%2C_1865f.jpg",
  onegin:     "https://upload.wikimedia.org/wikipedia/commons/2/20/Sobinov_as_Lensky.jpg",
  potemkin:   "https://upload.wikimedia.org/wikipedia/commons/8/85/Vintage_Potemkin.jpg",
  joanarc:    "https://upload.wikimedia.org/wikipedia/commons/d/d8/The_Passion_of_Joan_of_Arc_%281928%29_English_Poster.png",
  sunrise:    "https://upload.wikimedia.org/wikipedia/commons/2/27/Sunrise_-_A_Song_of_Two_Humans.jpg",
  goldrush:   "https://upload.wikimedia.org/wikipedia/commons/4/4d/Gold_rush_poster.jpg",
  general:    "https://upload.wikimedia.org/wikipedia/commons/0/0c/The_General_%281926%29_-_Movie_Poster_2.png",
  nanook:     "https://upload.wikimedia.org/wikipedia/commons/3/33/Nanook_of_the_north.jpg",
  phancar:    "https://upload.wikimedia.org/wikipedia/en/5/56/The_Phantom_Carriage_%281921%29_poster.jpg",
  phantfilm:  "https://upload.wikimedia.org/wikipedia/commons/5/53/Phantom_of_the_opera_1925_poster.jpg",
  // 百年孤独: García Márquez 1967 仍在版权期,使用 Aracataca(马尔克斯出生地、马孔多的原型) 的公版照片作为题材化封面。
  soledad:    "https://upload.wikimedia.org/wikipedia/commons/7/79/Aracataca%27s_church_where_Garcia_Marquez_was_baptized.JPG",
};

window.LG_COVERS = {

  // ============== Pride and Prejudice ==============
  // Regency: aged ivory, gold rules, palmette ornaments, italic title
  pap: (book) => (
    <CoverFrame bg="#f1e5c7">
      <defs>
        <pattern id="cov-pap-noise" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#f1e5c7" />
          <circle cx="1" cy="1" r="0.3" fill="#d9c490" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="240" height="340" fill="url(#cov-pap-noise)" />

      {/* outer double-rule frame */}
      <rect x="14" y="14" width="212" height="312" fill="none" stroke="#8a6e36" strokeWidth="1.2" />
      <rect x="20" y="20" width="200" height="300" fill="none" stroke="#8a6e36" strokeWidth="0.5" />

      {/* top palmette */}
      <g transform="translate(120 38)" fill="none" stroke="#8a6e36" strokeWidth="0.9">
        <path d="M 0 0 Q -8 -6 -14 0 Q -8 6 0 0 Q 8 -6 14 0 Q 8 6 0 0 z" />
        <line x1="-30" y1="0" x2="-16" y2="0" />
        <line x1="30" y1="0" x2="16" y2="0" />
        <circle cx="-30" cy="0" r="1.4" fill="#8a6e36" />
        <circle cx="30" cy="0" r="1.4" fill="#8a6e36" />
      </g>

      {/* "A NOVEL" label */}
      <text x="120" y="68" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#8a6e36"
            letterSpacing="3">A · NOVEL</text>

      {/* Title (italic, multi-line if needed) */}
      <text x="120" y="135" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="32" fill="#1a1a1a" fontStyle="italic" fontWeight="400">
        Pride
      </text>
      <text x="120" y="170" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="14" fill="#8a6e36" fontStyle="italic" fontWeight="300"
            letterSpacing="3">
        &amp;
      </text>
      <text x="120" y="205" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="32" fill="#1a1a1a" fontStyle="italic" fontWeight="400">
        Prejudice
      </text>

      {/* delicate rule */}
      <line x1="60" y1="225" x2="180" y2="225" stroke="#8a6e36" strokeWidth="0.6" />

      {/* author */}
      <text x="120" y="246" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#1a1a1a"
            letterSpacing="5">JANE AUSTEN</text>

      {/* bottom ornament: rosette */}
      <g transform="translate(120 285)" stroke="#8a6e36" strokeWidth="0.8" fill="none">
        <circle r="9" />
        <circle r="4.5" />
        <path d="M 0 -9 L 0 -3 M 0 3 L 0 9 M -9 0 L -3 0 M 3 0 L 9 0
                 M -6.4 -6.4 L -2 -2 M 2 2 L 6.4 6.4
                 M -6.4 6.4 L -2 2 M 2 -2 L 6.4 -6.4" />
      </g>

      {/* year, Roman */}
      <text x="120" y="310" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#8a6e36"
            letterSpacing="3">MDCCCXIII</text>
    </CoverFrame>
  ),

  // ============== Name of the Rose ==============
  // Medieval manuscript: dark vellum, gold ink, illuminated letter
  rose: (book) => (
    <CoverFrame bg="#2a1410">
      {/* corner flourishes */}
      <g fill="none" stroke="#b8954a" strokeWidth="0.8">
        <rect x="12" y="12" width="216" height="316" />
        <path d="M 18 18 L 30 18 M 18 18 L 18 30" />
        <path d="M 222 18 L 210 18 M 222 18 L 222 30" />
        <path d="M 18 322 L 30 322 M 18 322 L 18 310" />
        <path d="M 222 322 L 210 322 M 222 322 L 222 310" />
        {/* inner thin rule */}
        <rect x="24" y="24" width="192" height="292" strokeWidth="0.4" />
      </g>

      {/* "ANNO MCMLXXX" */}
      <text x="120" y="48" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#b8954a"
            letterSpacing="4">ANNO · MCMLXXX</text>

      {/* Illuminated letter R in box */}
      <g transform="translate(120 130)">
        <rect x="-38" y="-38" width="76" height="76" fill="#b8954a" />
        <rect x="-34" y="-34" width="68" height="68" fill="none" stroke="#2a1410" strokeWidth="1" />
        {/* the R */}
        <text x="0" y="14" textAnchor="middle"
              fontFamily="Spectral, serif" fontSize="58" fill="#2a1410" fontWeight="600" fontStyle="italic">R</text>
        {/* tiny vine decoration */}
        <path d="M -32 -32 Q -28 -36 -24 -32 M 32 32 Q 28 36 24 32"
              stroke="#2a1410" strokeWidth="0.5" fill="none" />
      </g>

      {/* Title */}
      <text x="120" y="200" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#e8d5a8"
            letterSpacing="5">THE NAME OF</text>
      <text x="120" y="232" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="26" fill="#b8954a" fontStyle="italic" fontWeight="500">
        the Rose
      </text>

      {/* divider rose petal */}
      <g transform="translate(120 255)" fill="none" stroke="#b8954a" strokeWidth="0.7">
        <path d="M -6 0 Q 0 -5 6 0 Q 0 5 -6 0" fill="#b8954a" />
        <line x1="-30" y1="0" x2="-10" y2="0" />
        <line x1="30" y1="0" x2="10" y2="0" />
      </g>

      <text x="120" y="282" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#e8d5a8"
            letterSpacing="4">UMBERTO ECO</text>
      <text x="120" y="304" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="9" fill="#8a6e36" fontStyle="italic">
        translated from the Italian
      </text>
    </CoverFrame>
  ),

  // ============== Frankenstein ==============
  // Gothic Romantic: stormy dust-blue, lightning, bold spectral title
  frank: (book) => (
    <CoverFrame bg="#2a3038">
      <defs>
        <linearGradient id="cov-frank-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1f25" />
          <stop offset="60%" stopColor="#2a3038" />
          <stop offset="100%" stopColor="#404a4d" />
        </linearGradient>
      </defs>
      <rect width="240" height="340" fill="url(#cov-frank-sky)" />

      {/* thin frame */}
      <rect x="14" y="14" width="212" height="312" fill="none" stroke="#7a8588" strokeWidth="0.6" />

      {/* lightning bolt */}
      <g transform="translate(120 90)">
        <path d="M -8 -50 L -16 0 L -2 -4 L -12 50 L 14 -8 L -2 -4 L 8 -50 z"
              fill="#e8d5a8" stroke="#b8954a" strokeWidth="0.8" />
      </g>

      {/* glow */}
      <circle cx="120" cy="90" r="60" fill="none" stroke="#b8954a" strokeWidth="0.3" opacity="0.5" />
      <circle cx="120" cy="90" r="85" fill="none" stroke="#b8954a" strokeWidth="0.2" opacity="0.3" />

      {/* title */}
      <text x="120" y="195" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="22" fill="#f0e8d4" fontWeight="600"
            letterSpacing="2">FRANKENSTEIN</text>
      <line x1="60" y1="208" x2="180" y2="208" stroke="#b8954a" strokeWidth="0.6" />
      <text x="120" y="226" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#b8954a" fontStyle="italic">
        Or, The Modern Prometheus
      </text>

      {/* horizontal flourish */}
      <g transform="translate(120 254)" fill="none" stroke="#7a8588" strokeWidth="0.6">
        <path d="M -28 0 L -10 0 M 10 0 L 28 0" />
        <circle cx="-30" r="1.6" fill="#7a8588" />
        <circle cx="30" r="1.6" fill="#7a8588" />
        <path d="M -3 -2 L 0 2 L 3 -2 z" fill="#7a8588" />
      </g>

      {/* author */}
      <text x="120" y="285" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#e8d5a8"
            letterSpacing="5">MARY SHELLEY</text>
      <text x="120" y="306" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#7a8588"
            letterSpacing="3">M · D · C · C · C · X · V · I · I · I</text>
    </CoverFrame>
  ),

  // ============== Dracula ==============
  // Victorian gothic: black & blood red, bat, gothic title
  drac: (book) => (
    <CoverFrame bg="#0d0a0a">
      {/* blood drip pattern at top */}
      <g fill="#7a1a1a">
        <path d="M 0 0 L 0 32 Q 12 36 24 32 Q 36 28 48 34 Q 60 38 72 32 Q 84 28 96 32 Q 108 36 120 30 Q 132 28 144 34 Q 156 38 168 32 Q 180 28 192 32 Q 204 36 216 32 Q 228 28 240 32 L 240 0 z" />
      </g>
      <circle cx="40" cy="38" r="2" fill="#9c2424" />
      <circle cx="180" cy="44" r="2" fill="#9c2424" />
      <circle cx="100" cy="40" r="1.4" fill="#9c2424" />

      {/* frame */}
      <rect x="14" y="14" width="212" height="312" fill="none" stroke="#7a1a1a" strokeWidth="0.6" />
      <rect x="20" y="20" width="200" height="300" fill="none" stroke="#7a1a1a" strokeWidth="0.3" />

      {/* bat silhouette */}
      <g transform="translate(120 110)" fill="#0d0a0a" stroke="#7a1a1a" strokeWidth="1">
        <path d="M 0 -10 Q -8 -16 -16 -10 Q -32 -8 -42 -18 Q -38 -4 -32 4 Q -22 8 -16 4 Q -10 8 -6 14 Q -2 20 0 22 Q 2 20 6 14 Q 10 8 16 4 Q 22 8 32 4 Q 38 -4 42 -18 Q 32 -8 16 -10 Q 8 -16 0 -10 z" />
        {/* eyes */}
        <circle cx="-3" cy="-2" r="1.2" fill="#9c2424" stroke="none" />
        <circle cx=" 3" cy="-2" r="1.2" fill="#9c2424" stroke="none" />
      </g>

      {/* title */}
      <text x="120" y="200" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="38" fill="#e8d5a8" fontWeight="600"
            letterSpacing="6">DRACULA</text>

      {/* rule + flourish */}
      <g transform="translate(120 224)">
        <line x1="-50" x2="-8" stroke="#7a1a1a" strokeWidth="0.8" />
        <line x1="50" x2="8" stroke="#7a1a1a" strokeWidth="0.8" />
        <path d="M -4 -4 L 0 0 L 4 -4 M -4 4 L 0 0 L 4 4" stroke="#7a1a1a" strokeWidth="0.8" fill="none" />
      </g>

      <text x="120" y="248" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="10" fill="#9c2424" fontStyle="italic">
        a tale of darkness
      </text>

      {/* author */}
      <text x="120" y="285" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#e8d5a8"
            letterSpacing="4">BRAM STOKER</text>
      <text x="120" y="306" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#7a1a1a"
            letterSpacing="3">LONDON · MDCCCXCVII</text>
    </CoverFrame>
  ),

  // ============== Alice in Wonderland ==============
  // Faded sage cream, whimsical typography, key + heart motifs
  alice: (book) => (
    <CoverFrame bg="#e8e0c4">
      <defs>
        <pattern id="cov-alice-grid" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="0.6" fill="#c8b88a" />
        </pattern>
      </defs>
      <rect width="240" height="340" fill="url(#cov-alice-grid)" opacity="0.5" />

      {/* asymmetric frame — whimsical */}
      <rect x="14" y="14" width="212" height="312" fill="none" stroke="#5a6a3f" strokeWidth="0.9" />
      <path d="M 14 14 L 22 22 M 226 14 L 218 22 M 14 326 L 22 318 M 226 326 L 218 318"
            stroke="#5a6a3f" strokeWidth="0.6" fill="none" />

      {/* playing-card spades on corners */}
      <g fill="#5a6a3f">
        <path d="M 28 30 L 32 26 L 36 30 Q 36 33 33 33 L 35 36 L 29 36 L 31 33 Q 28 33 28 30 z" />
        <path d="M 208 30 L 212 26 L 216 30 Q 216 33 213 33 L 215 36 L 209 36 L 211 33 Q 208 33 208 30 z" />
      </g>

      {/* "EAT ME" small label */}
      <text x="120" y="62" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#5a6a3f"
            letterSpacing="5">«  EAT ME  »</text>

      {/* Title — flowing */}
      <text x="120" y="118" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="32" fill="#3a4a25" fontStyle="italic" fontWeight="400">
        Alice's
      </text>
      <text x="120" y="148" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="13" fill="#8a6e36"
            letterSpacing="4">ADVENTURES IN</text>
      <text x="120" y="186" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="28" fill="#3a4a25" fontStyle="italic" fontWeight="400">
        Wonderland
      </text>

      {/* divider with key motif */}
      <g transform="translate(120 215)">
        <line x1="-50" x2="-14" stroke="#5a6a3f" strokeWidth="0.6" />
        <line x1="50" x2="14" stroke="#5a6a3f" strokeWidth="0.6" />
        {/* tiny key */}
        <g fill="none" stroke="#8a6e36" strokeWidth="1.1">
          <circle cx="-7" cy="0" r="3.5" />
          <line x1="-3.5" y1="0" x2="10" y2="0" />
          <line x1="7" y1="0" x2="7" y2="3" />
          <line x1="9.5" y1="0" x2="9.5" y2="3" />
        </g>
      </g>

      {/* tea cup motif */}
      <g transform="translate(80 248)" stroke="#5a6a3f" strokeWidth="0.8" fill="none">
        <path d="M -6 -3 L 6 -3 L 5 4 Q 0 6 -5 4 z" />
        <path d="M -6 -3 L -7 -6 L 7 -6 L 6 -3" />
        <path d="M 6 -2 Q 11 -2 11 1 Q 11 4 6 4" />
        <path d="M -3 -7 Q -2 -10 -3 -12" />
        <path d="M 0 -7 Q 1 -10 0 -12" />
        <path d="M 3 -7 Q 4 -10 3 -12" />
      </g>

      {/* heart motif */}
      <g transform="translate(160 248)" fill="#9c2424" stroke="#5a6a3f" strokeWidth="0.6">
        <path d="M 0 6 Q -7 -2 -6 -6 Q -3 -10 0 -6 Q 3 -10 6 -6 Q 7 -2 0 6 z" />
      </g>

      <text x="120" y="290" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#3a4a25"
            letterSpacing="4">LEWIS CARROLL</text>
      <text x="120" y="310" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill="#8a6e36"
            letterSpacing="3">CURIOUSER AND CURIOUSER · 1865</text>
    </CoverFrame>
  ),

  // ============== Moby-Dick ==============
  // Deep navy, whale silhouette, bold maritime
  mob: (book) => (
    <CoverFrame bg="#0d1a2a">
      <defs>
        <linearGradient id="cov-mob-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1424" />
          <stop offset="100%" stopColor="#152740" />
        </linearGradient>
      </defs>
      <rect width="240" height="340" fill="url(#cov-mob-deep)" />

      {/* faint wave lines */}
      <g fill="none" stroke="#1f4060" strokeWidth="0.5" opacity="0.4">
        <path d="M 0 250 Q 60 245 120 250 T 240 250" />
        <path d="M 0 265 Q 60 260 120 265 T 240 265" />
        <path d="M 0 280 Q 60 275 120 280 T 240 280" />
        <path d="M 0 295 Q 60 290 120 295 T 240 295" />
        <path d="M 0 310 Q 60 305 120 310 T 240 310" />
      </g>

      {/* frame */}
      <rect x="16" y="16" width="208" height="308" fill="none" stroke="#b8954a" strokeWidth="0.8" />

      {/* whale silhouette */}
      <g transform="translate(120 145)" fill="#e8d5a8" stroke="none">
        <path d="M -70 0 Q -60 -16 -20 -16 Q 30 -16 60 -8 Q 72 -2 70 0 Q 60 0 56 4 L 64 14 L 50 8 Q 35 4 0 4 Q -30 4 -50 0 Q -56 -2 -62 4 L -70 0 z" />
        {/* spout */}
        <path d="M -42 -16 Q -44 -28 -38 -36 M -38 -16 Q -36 -28 -30 -36 M -45 -16 Q -50 -28 -48 -36"
              fill="none" stroke="#b8954a" strokeWidth="1" />
        {/* eye */}
        <circle cx="-50" cy="-6" r="1.2" fill="#0d1a2a" />
      </g>

      {/* compass star */}
      <g transform="translate(120 50)" fill="none" stroke="#b8954a" strokeWidth="0.6">
        <path d="M 0 -12 L 3 -3 L 12 0 L 3 3 L 0 12 L -3 3 L -12 0 L -3 -3 z" fill="#b8954a" />
        <circle r="14" />
      </g>

      {/* title */}
      <text x="120" y="210" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="34" fill="#e8d5a8" fontWeight="600"
            letterSpacing="3">MOBY-DICK</text>
      <line x1="60" y1="222" x2="180" y2="222" stroke="#b8954a" strokeWidth="0.6" />
      <text x="120" y="240" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#b8954a" fontStyle="italic">
        Or, The Whale
      </text>

      <text x="120" y="295" textAnchor="middle"
            fontFamily="Spectral, serif" fontSize="11" fill="#e8d5a8"
            letterSpacing="4">HERMAN MELVILLE</text>
      <text x="120" y="314" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#b8954a"
            letterSpacing="3">CALL ME ISHMAEL · MDCCCLI</text>
    </CoverFrame>
  ),
};

// Fallback generic cover for any book without a custom design.
window.LG_COVER_GENERIC = (book) => (
  <CoverFrame bg="#3a342c">
    <rect x="14" y="14" width="212" height="312" fill="none" stroke="#b8954a" strokeWidth="0.8" />
    <text x="120" y="60" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#b8954a"
          letterSpacing="4">A · NOVEL</text>
    <text x="120" y="170" textAnchor="middle"
          fontFamily="Spectral, serif" fontSize="20" fill="#e8d5a8" fontStyle="italic">
      {(book.title || "").length > 18 ? (book.title || "").slice(0, 18) + "…" : book.title}
    </text>
    <line x1="60" y1="190" x2="180" y2="190" stroke="#b8954a" strokeWidth="0.6" />
    <text x="120" y="220" textAnchor="middle"
          fontFamily="Spectral, serif" fontSize="11" fill="#b8954a" letterSpacing="3">
      {(book.author || "").toUpperCase()}
    </text>
    <text x="120" y="300" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#8a6e36"
          letterSpacing="4">{book.year}</text>
  </CoverFrame>
);

window.bookCover = function(book, style) {
  const imgUrl = window.LG_COVER_IMAGES?.[book.id];
  const svgFn = window.LG_COVERS[book.id];
  const fallback = svgFn ? svgFn(book) : window.LG_COVER_GENERIC(book);
  // style: "photo" (default) | "illustrated"
  if (style === "illustrated") return fallback;
  if (imgUrl) {
    return <CoverImage src={imgUrl} alt={book.title} fallback={fallback} />;
  }
  return fallback;
};
