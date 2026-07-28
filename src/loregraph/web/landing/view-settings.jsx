// LoreGraph — Settings view
// Full-page view (not a modal). Section nav on the left, content on the right.
// All infrastructure / preferences / account live here as a single, ordered hierarchy.

function ViewSettings({ ctx }) {
  const { tt, data, locale, setLocale, settingsSection, setSettingsSection, coverStyle, setCoverStyle } = ctx;
  const { useState } = React;

  const sections = [
    { k: "provider",   en: "LLM Provider",  "zh-CN": "模型提供方", "zh-TW": "模型提供方", ja: "モデル提供元",  ko: "모델 제공자",   fr: "Fournisseur LLM",      es: "Proveedor LLM",      de: "LLM-Anbieter" },
    { k: "budget",     en: "Budget & Cost",  "zh-CN": "预算与成本", "zh-TW": "預算與成本", ja: "予算とコスト",  ko: "예산 및 비용", fr: "Budget & coût",        es: "Presupuesto",        de: "Budget" },
    { k: "cache",      en: "Cache",          "zh-CN": "缓存",       "zh-TW": "快取",       ja: "キャッシュ",    ko: "캐시",         fr: "Cache",                es: "Caché",              de: "Cache" },
    { k: "appearance", en: "Appearance",     "zh-CN": "外观",       "zh-TW": "外觀",       ja: "外観",          ko: "외관",         fr: "Apparence",            es: "Apariencia",         de: "Erscheinungsbild" },
    { k: "language",   en: "Language",       "zh-CN": "语言",       "zh-TW": "語言",       ja: "言語",          ko: "언어",         fr: "Langue",               es: "Idioma",             de: "Sprache" },
    { k: "account",    en: "Account",        "zh-CN": "账号",       "zh-TW": "帳號",       ja: "アカウント",    ko: "계정",         fr: "Compte",               es: "Cuenta",             de: "Konto" },
  ];

  // Every note says the same kind of thing: what choosing this provider does to
  // an extraction run. Three of them used to name the vendor instead ("Alibaba",
  // "Google"), which told a reader deciding between them nothing.
  const providers = [
    { id: "anthropic", name: "Anthropic", models: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4.5"], note: { en: "Best prompt caching · default", "zh-CN": "提示缓存最佳 · 默认", "zh-TW": "提示快取最佳 · 預設", ja: "プロンプトキャッシュ最良 · 既定", ko: "프롬프트 캐시 최적 · 기본", fr: "Meilleur cache de prompt · défaut", es: "Mejor caché de prompt · pred.", de: "Bestes Prompt-Caching · Standard" } },
    { id: "openai",    name: "OpenAI",    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"], note: { en: "Widest tooling compatibility", "zh-CN": "生态兼容最广", "zh-TW": "生態相容最廣", ja: "ツール互換性が最も広い", ko: "도구 호환성 최다", fr: "Compatibilité outils la plus large", es: "Mayor compatibilidad de herramientas", de: "Breiteste Tool-Kompatibilität" } },
    { id: "deepseek",  name: "DeepSeek",  models: ["deepseek-chat", "deepseek-reasoner"], note: { en: "3–10× cheaper input", "zh-CN": "输入便宜 3–10 倍", "zh-TW": "輸入便宜 3–10 倍", ja: "入力 3–10 倍安価", ko: "입력 3–10배 저렴", fr: "Entrée 3–10× moins cher", es: "Entrada 3–10× más barato", de: "Eingabe 3–10× günstiger" } },
    { id: "qwen",      name: "通义千问 Qwen", models: ["qwen-max", "qwen-plus"], note: { en: "Strong on Chinese-language source texts", "zh-CN": "中文原文表现好", "zh-TW": "中文原文表現好", ja: "中国語原文に強い", ko: "중국어 원문에 강함", fr: "Solide sur les textes chinois", es: "Sólido en textos en chino", de: "Stark bei chinesischen Quellen" } },
    { id: "gemini",    name: "Google Gemini", models: ["gemini-2.0-flash", "gemini-2.5-pro"], note: { en: "Longest context window", "zh-CN": "上下文窗口最长", "zh-TW": "上下文窗口最長", ja: "コンテキスト窓が最長", ko: "가장 긴 컨텍스트 창", fr: "Fenêtre de contexte la plus longue", es: "Ventana de contexto más larga", de: "Längstes Kontextfenster" } },
    { id: "ollama",    name: "Ollama", models: ["llama3.2", "qwen2.5"], note: { en: "Runs locally · no API cost", "zh-CN": "本地运行 · 无 API 成本", "zh-TW": "本機執行 · 無 API 成本", ja: "ローカル実行 · API 費用なし", ko: "로컬 실행 · API 비용 없음", fr: "Local · aucun coût d'API", es: "Local · sin coste de API", de: "Lokal · keine API-Kosten" } },
  ];

  const [activeProvider, setActiveProvider] = useState("anthropic");
  const [activeModel, setActiveModel] = useState("claude-opus-5");
  const [apiKey, setApiKey] = useState("");
  const [budgetCap, setBudgetCap] = useState(data.user.budgetCap);

  // Three volumes that have a real scan to compare against — an option row of
  // books with no scan would render identically under both settings.
  const previewBooks = React.useMemo(() => {
    const imgs = window.LG_COVER_IMAGES || {};
    return data.books.filter(b => imgs[b.id] && window.LG_COVERS[b.id]).slice(0, 3);
  }, [data.books]);

  const sectionLabel = (s) => s[locale] || s.en;
  const pickNote = (n) => n[locale] || n.en;
  // Provider ids appear on book rows; show the provider's own name. Unknown ids
  // fall back to a capitalized form rather than leaking the bare slug.
  const providerName = (id) =>
    (providers.find(p => p.id === id) || {}).name || (id ? id[0].toUpperCase() + id.slice(1) : "—");

  const L = locale;
  const lbl = {
    provider: {
      sub: { en: "All calls route through a single egress so you can swap LLMs without changing code.", "zh-CN": "所有调用走单一出口；更换 LLM 不必改代码。", "zh-TW": "所有呼叫走單一出口；更換 LLM 不必改程式碼。", ja: "すべての呼び出しは単一の出口を通り、コードを変えずに LLM を切替えられます。", ko: "모든 호출이 단일 출구를 통과해 코드 없이 LLM을 교체할 수 있습니다.", fr: "Toutes les requêtes passent par une sortie unique — changez de LLM sans toucher au code.", es: "Todas las llamadas pasan por una salida única — cambia el LLM sin tocar el código.", de: "Alle Aufrufe gehen über einen einzigen Ausgang — LLM-Wechsel ohne Code." },
      model: { en: "Model",  "zh-CN": "模型",  "zh-TW": "模型",  ja: "モデル", ko: "모델", fr: "Modèle", es: "Modelo", de: "Modell" },
      apiKey: { en: "API key", "zh-CN": "API 密钥", "zh-TW": "API 金鑰", ja: "API キー", ko: "API 키", fr: "Clé API", es: "Clave API", de: "API-Schlüssel" },
      groupLabel: { en: "LLM provider", "zh-CN": "模型提供方", "zh-TW": "模型提供方", ja: "モデル提供元", ko: "모델 제공자", fr: "Fournisseur LLM", es: "Proveedor LLM", de: "LLM-Anbieter" },
      keyHint: { en: "Held in this page only — never stored, never sent anywhere.", "zh-CN": "仅保留在当前页面，不会存储，也不会发送到任何地方。", "zh-TW": "僅保留在當前頁面，不會儲存，也不會傳送到任何地方。", ja: "このページ内だけに保持され、保存も送信もされません。", ko: "이 페이지에만 유지되며 저장·전송되지 않습니다.", fr: "Conservée sur cette page seulement — jamais stockée ni envoyée.", es: "Solo en esta página — nunca se guarda ni se envía.", de: "Nur auf dieser Seite — wird nie gespeichert oder gesendet." },
    },
    budget: {
      sub: { en: "Hard monthly cap. Pipeline pauses when reached.", "zh-CN": "硬性月度上限，达到后流水线暂停。", "zh-TW": "硬性月度上限，達到後流水線暫停。", ja: "月次ハード上限。到達でパイプラインを停止。", ko: "월간 하드 한도. 도달 시 파이프라인 일시정지.", fr: "Plafond mensuel strict ; pipeline en pause au seuil.", es: "Tope mensual estricto; pipeline en pausa al alcanzarlo.", de: "Hartes Monatslimit. Pipeline pausiert beim Erreichen." },
      used: { en: "Spent this month", "zh-CN": "本月已花费", "zh-TW": "本月已花費", ja: "今月の使用", ko: "이번 달 지출", fr: "Dépensé ce mois", es: "Gastado este mes", de: "Diesen Monat ausgegeben" },
      bookCost: { en: "Per-book cost", "zh-CN": "各书目成本", "zh-TW": "各書目成本", ja: "書籍別コスト", ko: "도서별 비용", fr: "Coût par livre", es: "Coste por libro", de: "Kosten pro Buch" },
      // The field's label repeated the section heading verbatim; it names the
      // ceiling, not the section.
      cap: { en: "Monthly ceiling", "zh-CN": "月度上限", "zh-TW": "月度上限", ja: "月次上限", ko: "월 상한", fr: "Plafond mensuel", es: "Tope mensual", de: "Monatslimit" },
    },
    cache: {
      // Was a line of implementation trivia naming a raw API field. What a reader
      // needs here is why the number is as high as it is.
      sub: { en: "Why the rate is this high, and what it is measured against.", "zh-CN": "命中率为何这么高，以及它是相对什么计算的。", "zh-TW": "命中率為何這麼高，以及它是相對什麼計算的。", ja: "なぜこの命中率になるのか、何に対して測っているのか。", ko: "적중률이 이렇게 높은 이유와 무엇을 기준으로 측정하는지.", fr: "Pourquoi ce taux est si élevé, et par rapport à quoi.", es: "Por qué la tasa es tan alta y contra qué se mide.", de: "Warum die Quote so hoch ist und woran sie gemessen wird." },
      hit:   { en: "Cache hit rate", "zh-CN": "缓存命中率", "zh-TW": "快取命中率", ja: "キャッシュ命中率", ko: "캐시 적중률", fr: "Taux de cache", es: "Tasa de caché", de: "Trefferquote" },
      saved: { en: "Saved this month", "zh-CN": "本月节省", "zh-TW": "本月節省", ja: "今月の節約", ko: "이번 달 절약", fr: "Économisé ce mois", es: "Ahorrado este mes", de: "Diesen Monat gespart" },
      why: { en: "Every pass sends the same system prompt and the same shared ontology block ahead of the chunk it is reading. That prefix is identical across the hundreds of chunks in a book, so providers that support prompt caching bill it once at full price and the rest at a fraction — which is why the input side of a run costs so much less than its token count suggests.", "zh-CN": "每一个 Pass 在读取当前切片之前，都会先发送同一段系统提示与同一份共享本体定义。一本书有数百个切片，这段前缀在其中完全一致；支持提示缓存的提供方只按全价计一次，其余按很小的比例计费 —— 这就是一次运行的输入开销远低于其 token 数所暗示的原因。", "zh-TW": "每一個 Pass 在讀取當前切片之前，都會先傳送同一段系統提示與同一份共享本體定義。一本書有數百個切片，這段前綴在其中完全一致；支援提示快取的提供方只按全價計一次，其餘按很小的比例計費 —— 這就是一次執行的輸入開銷遠低於其 token 數所暗示的原因。", ja: "各パスは、読み込む断片の前に同じシステムプロンプトと同じ共有オントロジーを送ります。一冊の数百の断片でこの前置きは完全に同一なので、プロンプトキャッシュ対応の提供元は一度だけ全額で課金し、残りはごく一部の価格で課金します。実行の入力コストがトークン数の印象より大幅に低いのはこのためです。", ko: "모든 패스는 읽을 청크 앞에 동일한 시스템 프롬프트와 동일한 공유 온톨로지를 보냅니다. 한 권의 수백 개 청크에서 이 접두부는 완전히 같으므로, 프롬프트 캐시를 지원하는 제공자는 한 번만 정가로 청구하고 나머지는 아주 낮은 비율로 청구합니다. 실행의 입력 비용이 토큰 수보다 훨씬 낮은 이유입니다.", fr: "Chaque passe envoie le même prompt système et le même bloc d'ontologie avant le fragment qu'elle lit. Ce préfixe est identique sur les centaines de fragments d'un livre : les fournisseurs qui gèrent le cache de prompt le facturent une fois plein tarif et le reste pour une fraction — d'où un coût d'entrée bien inférieur à ce que suggère le nombre de tokens.", es: "Cada pase envía el mismo prompt de sistema y la misma ontología compartida antes del fragmento que lee. Ese prefijo es idéntico en los cientos de fragmentos de un libro, así que los proveedores con caché de prompt lo cobran una vez a precio completo y el resto por una fracción — de ahí que la entrada cueste mucho menos de lo que sugiere el recuento de tokens.", de: "Jeder Pass sendet denselben System-Prompt und denselben Ontologie-Block vor dem Abschnitt, den er liest. Dieses Präfix ist über die hunderte Abschnitte eines Buches identisch; Anbieter mit Prompt-Caching berechnen es einmal voll und den Rest zu einem Bruchteil — daher kostet die Eingabeseite weit weniger, als die Token-Zahl vermuten lässt." },
    },
    appearance: {
      // Promised a theme setting that does not exist; now it describes what is here.
      sub: { en: "How the library draws a book you have not opened yet.", "zh-CN": "尚未打开的书，在书架上以什么面貌出现。", "zh-TW": "尚未打開的書，在書架上以什麼面貌出現。", ja: "まだ開いていない本を、書架でどう描くか。", ko: "아직 열지 않은 책을 서가에서 어떻게 그릴지.", fr: "Comment la bibliothèque dessine un livre encore fermé.", es: "Cómo dibuja la biblioteca un libro aún sin abrir.", de: "Wie die Bibliothek ein noch ungeöffnetes Buch zeichnet." },
      cover: { en: "Library cover style", "zh-CN": "图书馆封面风格", "zh-TW": "圖書館封面風格", ja: "ライブラリ表紙スタイル", ko: "라이브러리 표지 스타일", fr: "Style de couverture", es: "Estilo de cubierta", de: "Cover-Stil" },
      original: { en: "Original", "zh-CN": "原版", "zh-TW": "原版", ja: "原版", ko: "원본", fr: "Original", es: "Original", de: "Original" },
      illustrated: { en: "Illustrated", "zh-CN": "插画", "zh-TW": "插畫", ja: "イラスト", ko: "일러스트", fr: "Illustré", es: "Ilustrado", de: "Illustriert" },
      originalNote: { en: "Scans of public-domain editions", "zh-CN": "公共领域版本的实物扫描", "zh-TW": "公共領域版本的實物掃描", ja: "パブリックドメイン版の実物スキャン", ko: "퍼블릭 도메인 판본의 실물 스캔", fr: "Scans d'éditions du domaine public", es: "Escaneos de ediciones de dominio público", de: "Scans gemeinfreier Ausgaben" },
      illustratedNote: { en: "Drawn in the app's own hand", "zh-CN": "由本站按统一样式绘制", "zh-TW": "由本站按統一樣式繪製", ja: "本サイトが統一様式で描画", ko: "이 사이트가 통일된 양식으로 그림", fr: "Dessinés dans le style du site", es: "Dibujadas en el estilo del sitio", de: "Im Stil der Anwendung gezeichnet" },
    },
    language: {
      sub: { en: "All UI strings and entity descriptions follow this setting.", "zh-CN": "所有界面文字与实体描述随此设置切换。", "zh-TW": "所有介面文字與實體描述隨此設定切換。", ja: "UI とエンティティ説明はこの設定に従います。", ko: "UI 및 엔티티 설명이 이 설정을 따릅니다.", fr: "Tous les textes UI et descriptions suivent ce réglage.", es: "Toda la UI y descripciones siguen este ajuste.", de: "Alle UI- und Entitätstexte folgen dieser Einstellung." },
    },
    account: {
      sub: { en: "Profile, plan, and session.", "zh-CN": "个人资料、订阅与会话。", "zh-TW": "個人資料、訂閱與工作階段。", ja: "プロフィール、プラン、セッション。", ko: "프로필, 플랜, 세션.", fr: "Profil, plan, session.", es: "Perfil, plan y sesión.", de: "Profil, Plan und Sitzung." },
      demo: { en: "This build runs entirely in the browser and has no account backend — the destinations below are shown for structure only.", "zh-CN": "本版本完全在浏览器中运行，没有账号后端；以下入口仅用于呈现结构。", "zh-TW": "本版本完全在瀏覽器中執行，沒有帳號後端；以下入口僅用於呈現結構。", ja: "このビルドはブラウザ内だけで動作し、アカウント基盤を持ちません。以下は構成の提示のみです。", ko: "이 빌드는 브라우저에서만 동작하며 계정 백엔드가 없습니다. 아래 항목은 구조 표시용입니다.", fr: "Cette version tourne entièrement dans le navigateur, sans backend de compte — les entrées ci-dessous sont là pour la structure.", es: "Esta versión funciona solo en el navegador y no tiene backend de cuenta — lo de abajo es solo estructura.", de: "Dieser Build läuft nur im Browser und hat kein Konto-Backend — die Einträge unten zeigen nur die Struktur." },
    },
  };
  const pick = (obj) => obj[L] || obj.en;

  const section = settingsSection || "provider";

  return (
    <div className="sv">
      {/* The rail used to be titled "Settings" — a third copy of the word, after
          the app's own rail item and the view's breadcrumb. */}
      <aside className="sv-nav">
        {sections.map(s => (
          <button key={s.k}
            className={"sv-nav-item " + (section === s.k ? "active" : "")}
            onClick={() => setSettingsSection(s.k)}>
            {sectionLabel(s)}
          </button>
        ))}
      </aside>

      <div className="sv-body">
        {section === "provider" && (
          <>
            <h2>{sectionLabel(sections[0])}</h2>
            <p className="sv-sub">{pick(lbl.provider.sub)}</p>
            {/* A radio group, so announce it as one: only the selected card was
                marked, and only by a faint border a screen reader never sees. */}
            <div className="sv-provider-grid" role="radiogroup" aria-label={pick(lbl.provider.groupLabel)}>
              {providers.map(p => (
                <button key={p.id}
                  role="radio"
                  aria-checked={activeProvider === p.id}
                  className={"sv-provider-card " + (activeProvider === p.id ? "active" : "")}
                  onClick={() => { setActiveProvider(p.id); setActiveModel(p.models[0]); }}>
                  <div className="sv-provider-name">{p.name}</div>
                  <div className="sv-provider-note">{pickNote(p.note)}</div>
                  {activeProvider === p.id && <span className="sv-provider-mark" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
            <div className="sv-field">
              <label htmlFor="sv-model">{pick(lbl.provider.model)}</label>
              <select id="sv-model" value={activeModel} onChange={e => setActiveModel(e.target.value)}>
                {providers.find(p => p.id === activeProvider)?.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="sv-field">
              <label htmlFor="sv-key">{pick(lbl.provider.apiKey)}</label>
              <input id="sv-key" type="password" placeholder="sk-…" autoComplete="off"
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
              {/* True of this page: the value lives in component state only — it is
                  never stored and never sent anywhere. Worth saying out loud next
                  to a field asking for a credential. */}
              <p className="sv-field-hint">{pick(lbl.provider.keyHint)}</p>
            </div>
          </>
        )}

        {section === "budget" && (
          <>
            <h2>{sectionLabel(sections[1])}</h2>
            <p className="sv-sub">{pick(lbl.budget.sub)}</p>

            <div className="sv-budget-display">
              <div className="sv-budget-num">
                ${data.user.budgetUsed.toFixed(2)}
                <small> / ${budgetCap.toFixed(0)}</small>
              </div>
              <div className="sv-budget-bar">
                <div style={{width: (data.user.budgetUsed/budgetCap*100)+"%"}} />
              </div>
              <div className="sv-budget-label">{pick(lbl.budget.used)}</div>
            </div>

            <div className="sv-field" style={{maxWidth: 280}}>
              <label htmlFor="sv-cap">{pick(lbl.budget.cap)}</label>
              {/* The currency sign belongs inside the field, not floating beside it. */}
              <div className="sv-field-money">
                <span aria-hidden="true">$</span>
                <input id="sv-cap" type="number" min="0" step="1" value={budgetCap}
                  onChange={e => setBudgetCap(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <h3 className="sv-h3">{pick(lbl.budget.bookCost)}</h3>
            <div className="sv-cost-table">
              {data.books.filter(b => b.cost > 0).map(b => (
                <div key={b.id} className="sv-cost-row">
                  <span className="sv-cost-name">{window.bookTitle(b, locale)}</span>
                  {/* Was the raw provider id — "anthropic", "deepseek" — where the
                      provider's own name belongs. */}
                  <span className="sv-cost-provider">{providerName(b.provider)}</span>
                  <span className="sv-cost-val">${b.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {section === "cache" && (
          <>
            <h2>{sectionLabel(sections[2])}</h2>
            <p className="sv-sub">{pick(lbl.cache.sub)}</p>
            <div className="sv-cache-grid">
              <div className="sv-stat-card">
                <div className="sv-stat-num">82<small>%</small></div>
                <div className="sv-stat-lbl">{pick(lbl.cache.hit)}</div>
              </div>
              <div className="sv-stat-card">
                <div className="sv-stat-num gold">$5.42</div>
                <div className="sv-stat-lbl">{pick(lbl.cache.saved)}</div>
              </div>
            </div>
            {/* Two numbers on their own left this section three-quarters empty and
                explained nothing. The mechanism behind them is the interesting part. */}
            <p className="sv-note">{pick(lbl.cache.why)}</p>
          </>
        )}

        {section === "appearance" && (
          <>
            <h2>{sectionLabel(sections[3])}</h2>
            <p className="sv-sub">{pick(lbl.appearance.sub)}</p>
            {/* A choice between two ways of drawing a book is decided by looking,
                not by reading two words on a segmented switch. Each option shows
                the same three volumes rendered its own way. */}
            <fieldset className="sv-cover-choice">
              <legend>{pick(lbl.appearance.cover)}</legend>
              {[
                { k: "photo",       label: pick(lbl.appearance.original),    note: pick(lbl.appearance.originalNote) },
                { k: "illustrated", label: pick(lbl.appearance.illustrated), note: pick(lbl.appearance.illustratedNote) },
              ].map(opt => (
                <button key={opt.k}
                  role="radio"
                  aria-checked={coverStyle === opt.k}
                  className={"sv-cover-opt " + (coverStyle === opt.k ? "active" : "")}
                  onClick={() => setCoverStyle(opt.k)}>
                  <div className="sv-cover-row">
                    {previewBooks.map(b => (
                      <div key={b.id} className="sv-cover-thumb">{window.bookCover(b, opt.k)}</div>
                    ))}
                  </div>
                  <div className="sv-cover-meta">
                    <span className="sv-cover-label">{opt.label}</span>
                    <span className="sv-cover-note">{opt.note}</span>
                    {coverStyle === opt.k && <span className="sv-cover-mark" aria-hidden="true">✓</span>}
                  </div>
                </button>
              ))}
            </fieldset>
          </>
        )}

        {section === "language" && (
          <>
            <h2>{sectionLabel(sections[4])}</h2>
            <p className="sv-sub">{pick(lbl.language.sub)}</p>
            <div className="sv-lang-grid" role="radiogroup" aria-label={sectionLabel(sections[4])}>
              {window.LG_LOCALES.map(l => (
                <button key={l.code}
                  role="radio"
                  aria-checked={locale === l.code}
                  className={"sv-lang-card " + (locale === l.code ? "active" : "")}
                  onClick={() => setLocale(l.code)}>
                  <span className="sv-lang-code">{l.label}</span>
                  <span className="sv-lang-name">{l.name}</span>
                  {/* Same mark as the provider and cover choices, so a selection
                      looks the same everywhere in this view. */}
                  {locale === l.code && <span className="sv-lang-mark" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {section === "account" && (
          <>
            <h2>{sectionLabel(sections[5])}</h2>
            <p className="sv-sub">{pick(lbl.account.sub)}</p>
            <div className="sv-acct-card">
              <div className="sv-acct-avatar">Y</div>
              <div style={{flex:1, minWidth:0}}>
                <div className="sv-acct-name">{data.user.name}</div>
                <div className="sv-acct-handle">{data.user.handle}</div>
                <div className="sv-acct-plan">{tt("user.plan")} · ANTHROPIC</div>
              </div>
            </div>
            {/* Say it once rather than leaving five buttons that do nothing when
                clicked: this build has no account backend. */}
            <p className="sv-field-hint" style={{marginTop: 18, maxWidth: 540}}>{pick(lbl.account.demo)}</p>
            <div className="sv-acct-actions">
              {["acct.profile","acct.billing","acct.apiKeys","acct.shortcuts","acct.help"].map(k => (
                <button key={k} className="sv-btn-ghost" disabled aria-disabled="true">{tt(k)}</button>
              ))}
            </div>
            <div style={{marginTop: 28}}>
              <button className="sv-btn-ghost sv-signout" disabled aria-disabled="true">{tt("acct.signOut")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.ViewSettings = ViewSettings;
