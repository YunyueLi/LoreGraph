// LoreGraph — Settings view
// Full-page view (not a modal). Section nav on the left, content on the right.
// All infrastructure / preferences / account live here as a single, ordered hierarchy.

function ViewSettings({ ctx }) {
  const { tt, data, locale, setLocale, settingsSection, setSettingsSection } = ctx;
  const { useState } = React;

  const sections = [
    { k: "provider",   en: "LLM Provider",  "zh-CN": "模型提供方", "zh-TW": "模型提供方", ja: "モデル提供元",  ko: "모델 제공자",   fr: "Fournisseur LLM",      es: "Proveedor LLM",      de: "LLM-Anbieter" },
    { k: "budget",     en: "Budget & Cost",  "zh-CN": "预算与成本", "zh-TW": "預算與成本", ja: "予算とコスト",  ko: "예산 및 비용", fr: "Budget & coût",        es: "Presupuesto",        de: "Budget" },
    { k: "cache",      en: "Cache",          "zh-CN": "缓存",       "zh-TW": "快取",       ja: "キャッシュ",    ko: "캐시",         fr: "Cache",                es: "Caché",              de: "Cache" },
    { k: "appearance", en: "Appearance",     "zh-CN": "外观",       "zh-TW": "外觀",       ja: "外観",          ko: "외관",         fr: "Apparence",            es: "Apariencia",         de: "Erscheinungsbild" },
    { k: "language",   en: "Language",       "zh-CN": "语言",       "zh-TW": "語言",       ja: "言語",          ko: "언어",         fr: "Langue",               es: "Idioma",             de: "Sprache" },
    { k: "account",    en: "Account",        "zh-CN": "账号",       "zh-TW": "帳號",       ja: "アカウント",    ko: "계정",         fr: "Compte",               es: "Cuenta",             de: "Konto" },
  ];

  const providers = [
    { id: "anthropic", name: "Anthropic", models: ["claude-sonnet-4.5", "claude-opus-4", "claude-haiku-4.5"], note: { en: "Best caching · default", "zh-CN": "缓存最佳 · 默认", "zh-TW": "快取最佳 · 預設", ja: "最良のキャッシュ · 既定", ko: "최고 캐시 · 기본", fr: "Meilleur cache · défaut", es: "Mejor caché · pred.", de: "Bestes Caching · Standard" } },
    { id: "openai",    name: "OpenAI",    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"], note: { en: "OpenAI compatible", "zh-CN": "OpenAI 兼容", "zh-TW": "OpenAI 相容", ja: "OpenAI 互換", ko: "OpenAI 호환", fr: "Compatible OpenAI", es: "Compatible OpenAI", de: "OpenAI-kompatibel" } },
    { id: "deepseek",  name: "DeepSeek",  models: ["deepseek-chat", "deepseek-reasoner"], note: { en: "3–10× cheaper input", "zh-CN": "输入便宜 3–10 倍", "zh-TW": "輸入便宜 3–10 倍", ja: "入力 3–10 倍安価", ko: "입력 3–10배 저렴", fr: "Entrée 3–10× moins cher", es: "Entrada 3–10× más barato", de: "Eingabe 3–10× günstiger" } },
    { id: "qwen",      name: "通义千问 Qwen", models: ["qwen-max", "qwen-plus"], note: { en: "Alibaba", "zh-CN": "阿里巴巴", "zh-TW": "阿里巴巴", ja: "アリババ", ko: "알리바바", fr: "Alibaba", es: "Alibaba", de: "Alibaba" } },
    { id: "gemini",    name: "Google Gemini", models: ["gemini-2.0-flash", "gemini-2.5-pro"], note: { en: "Google", "zh-CN": "Google", "zh-TW": "Google", ja: "Google", ko: "Google", fr: "Google", es: "Google", de: "Google" } },
    { id: "ollama",    name: "Ollama", models: ["llama3.2", "qwen2.5"], note: { en: "Self-hosted · free", "zh-CN": "本地部署 · 免费", "zh-TW": "本機部署 · 免費", ja: "ローカル · 無料", ko: "로컬 · 무료", fr: "Local · gratuit", es: "Local · gratis", de: "Lokal · kostenlos" } },
  ];

  const [activeProvider, setActiveProvider] = useState("anthropic");
  const [activeModel, setActiveModel] = useState("claude-sonnet-4.5");
  const [apiKey, setApiKey] = useState("");
  const [budgetCap, setBudgetCap] = useState(data.user.budgetCap);
  const [coverStyle, setCoverStyle] = useState(() => localStorage.getItem("lg_cover_style") || "photo");
  React.useEffect(() => { localStorage.setItem("lg_cover_style", coverStyle); }, [coverStyle]);

  const sectionLabel = (s) => s[locale] || s.en;
  const pickNote = (n) => n[locale] || n.en;

  const L = locale;
  const lbl = {
    provider: {
      sub: { en: "All calls route through a single egress so you can swap LLMs without changing code.", "zh-CN": "所有调用走单一出口；更换 LLM 不必改代码。", "zh-TW": "所有呼叫走單一出口；更換 LLM 不必改程式碼。", ja: "すべての呼び出しは単一の出口を通り、コードを変えずに LLM を切替えられます。", ko: "모든 호출이 단일 출구를 통과해 코드 없이 LLM을 교체할 수 있습니다.", fr: "Toutes les requêtes passent par une sortie unique — changez de LLM sans toucher au code.", es: "Todas las llamadas pasan por una salida única — cambia el LLM sin tocar el código.", de: "Alle Aufrufe gehen über einen einzigen Ausgang — LLM-Wechsel ohne Code." },
      model: { en: "Model",  "zh-CN": "模型",  "zh-TW": "模型",  ja: "モデル", ko: "모델", fr: "Modèle", es: "Modelo", de: "Modell" },
      apiKey: { en: "API key", "zh-CN": "API 密钥", "zh-TW": "API 金鑰", ja: "API キー", ko: "API 키", fr: "Clé API", es: "Clave API", de: "API-Schlüssel" },
    },
    budget: {
      sub: { en: "Hard monthly cap. Pipeline pauses when reached.", "zh-CN": "硬性月度上限，达到后流水线暂停。", "zh-TW": "硬性月度上限，達到後流水線暫停。", ja: "月次ハード上限。到達でパイプラインを停止。", ko: "월간 하드 한도. 도달 시 파이프라인 일시정지.", fr: "Plafond mensuel strict ; pipeline en pause au seuil.", es: "Tope mensual estricto; pipeline en pausa al alcanzarlo.", de: "Hartes Monatslimit. Pipeline pausiert beim Erreichen." },
      used: { en: "Spent this month", "zh-CN": "本月已花费", "zh-TW": "本月已花費", ja: "今月の使用", ko: "이번 달 지출", fr: "Dépensé ce mois", es: "Gastado este mes", de: "Diesen Monat ausgegeben" },
      bookCost: { en: "Per-book cost", "zh-CN": "各书目成本", "zh-TW": "各書目成本", ja: "書籍別コスト", ko: "도서별 비용", fr: "Coût par livre", es: "Coste por libro", de: "Kosten pro Buch" },
    },
    cache: {
      sub: { en: "Anthropic prompt caching is automatic. OpenAI cached_tokens accumulate when exposed.", "zh-CN": "Anthropic 自动应用提示缓存；OpenAI cached_tokens 在暴露时累积。", "zh-TW": "Anthropic 自動套用提示快取；OpenAI cached_tokens 在暴露時累積。", ja: "Anthropic はプロンプトキャッシュを自動。OpenAI の cached_tokens は公開時に累積。", ko: "Anthropic는 프롬프트 캐시를 자동 적용. OpenAI cached_tokens는 노출 시 누적.", fr: "Cache Anthropic automatique. cached_tokens d'OpenAI cumulés si exposés.", es: "Caché Anthropic automático. cached_tokens de OpenAI acumulados al exponerse.", de: "Anthropic-Cache automatisch. OpenAI cached_tokens akkumuliert, wenn verfügbar." },
      hit:   { en: "Cache hit rate", "zh-CN": "缓存命中率", "zh-TW": "快取命中率", ja: "キャッシュ命中率", ko: "캐시 적중률", fr: "Taux de cache", es: "Tasa de caché", de: "Trefferquote" },
      saved: { en: "Saved this month", "zh-CN": "本月节省", "zh-TW": "本月節省", ja: "今月の節約", ko: "이번 달 절약", fr: "Économisé ce mois", es: "Ahorrado este mes", de: "Diesen Monat gespart" },
    },
    appearance: {
      sub: { en: "Cover style and theme preferences.", "zh-CN": "封面风格与主题偏好。", "zh-TW": "封面風格與主題偏好。", ja: "表紙スタイルとテーマの設定。", ko: "표지 스타일과 테마 설정.", fr: "Style de couverture et thème.", es: "Estilo de portada y tema.", de: "Cover-Stil und Theme." },
      cover: { en: "Library cover style", "zh-CN": "图书馆封面风格", "zh-TW": "圖書館封面風格", ja: "ライブラリ表紙スタイル", ko: "라이브러리 표지 스타일", fr: "Style de couverture", es: "Estilo de cubierta", de: "Cover-Stil" },
      original: { en: "Original", "zh-CN": "原版", "zh-TW": "原版", ja: "原版", ko: "원본", fr: "Original", es: "Original", de: "Original" },
      illustrated: { en: "Illustrated", "zh-CN": "插画", "zh-TW": "插畫", ja: "イラスト", ko: "일러스트", fr: "Illustré", es: "Ilustrado", de: "Illustriert" },
    },
    language: {
      sub: { en: "All UI strings and entity descriptions follow this setting.", "zh-CN": "所有界面文字与实体描述随此设置切换。", "zh-TW": "所有介面文字與實體描述隨此設定切換。", ja: "UI とエンティティ説明はこの設定に従います。", ko: "UI 및 엔티티 설명이 이 설정을 따릅니다.", fr: "Tous les textes UI et descriptions suivent ce réglage.", es: "Toda la UI y descripciones siguen este ajuste.", de: "Alle UI- und Entitätstexte folgen dieser Einstellung." },
    },
    account: {
      sub: { en: "Profile, plan, and session.", "zh-CN": "个人资料、订阅与会话。", "zh-TW": "個人資料、訂閱與工作階段。", ja: "プロフィール、プラン、セッション。", ko: "프로필, 플랜, 세션.", fr: "Profil, plan, session.", es: "Perfil, plan y sesión.", de: "Profil, Plan und Sitzung." },
    },
  };
  const pick = (obj) => obj[L] || obj.en;

  const section = settingsSection || "provider";

  return (
    <div className="sv">
      <aside className="sv-nav">
        <div className="sv-nav-title">{tt("nav.settings")}</div>
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
            <div className="sv-provider-grid">
              {providers.map(p => (
                <button key={p.id}
                  className={"sv-provider-card " + (activeProvider === p.id ? "active" : "")}
                  onClick={() => { setActiveProvider(p.id); setActiveModel(p.models[0]); }}>
                  <div className="sv-provider-name">{p.name}</div>
                  <div className="sv-provider-note">{pickNote(p.note)}</div>
                </button>
              ))}
            </div>
            <div className="sv-field">
              <label>{pick(lbl.provider.model)}</label>
              <select value={activeModel} onChange={e => setActiveModel(e.target.value)}>
                {providers.find(p => p.id === activeProvider)?.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="sv-field">
              <label>{pick(lbl.provider.apiKey)}</label>
              <input type="password" placeholder="sk-…"
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
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
              <label>{sectionLabel(sections[1])}</label>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontFamily:"'Spectral', serif", fontStyle:"italic"}}>$</span>
                <input type="number" value={budgetCap} onChange={e => setBudgetCap(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <h3 className="sv-h3">{pick(lbl.budget.bookCost)}</h3>
            <div className="sv-cost-table">
              {data.books.filter(b => b.cost > 0).map(b => (
                <div key={b.id} className="sv-cost-row">
                  <span className="sv-cost-name">{window.bookTitle(b, locale)}</span>
                  <span className="sv-cost-provider">{b.provider}</span>
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
          </>
        )}

        {section === "appearance" && (
          <>
            <h2>{sectionLabel(sections[3])}</h2>
            <p className="sv-sub">{pick(lbl.appearance.sub)}</p>
            <div className="sv-field">
              <label>{pick(lbl.appearance.cover)}</label>
              <div className="sv-segmented">
                <button className={coverStyle === "photo" ? "active" : ""}
                  onClick={() => setCoverStyle("photo")}>
                  {pick(lbl.appearance.original)}
                </button>
                <button className={coverStyle === "illustrated" ? "active" : ""}
                  onClick={() => setCoverStyle("illustrated")}>
                  {pick(lbl.appearance.illustrated)}
                </button>
              </div>
            </div>
          </>
        )}

        {section === "language" && (
          <>
            <h2>{sectionLabel(sections[4])}</h2>
            <p className="sv-sub">{pick(lbl.language.sub)}</p>
            <div className="sv-lang-grid">
              {window.LG_LOCALES.map(l => (
                <button key={l.code}
                  className={"sv-lang-card " + (locale === l.code ? "active" : "")}
                  onClick={() => setLocale(l.code)}>
                  <span className="sv-lang-code">{l.label}</span>
                  <span className="sv-lang-name">{l.name}</span>
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
            <div className="sv-acct-actions">
              <button className="sv-btn-ghost">{tt("acct.profile")}</button>
              <button className="sv-btn-ghost">{tt("acct.billing")}</button>
              <button className="sv-btn-ghost">{tt("acct.apiKeys")}</button>
              <button className="sv-btn-ghost">{tt("acct.shortcuts")}</button>
              <button className="sv-btn-ghost">{tt("acct.help")}</button>
            </div>
            <div style={{marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(184,149,74,0.15)"}}>
              <button className="sv-btn-ghost sv-signout">{tt("acct.signOut")}</button>
            </div>
          </>
        )}

        {section === "technical" && (
          <div style={{flex:1, display:"flex", flexDirection:"column", minHeight: 0, margin: "-44px -56px -80px"}}>
            <div style={{padding:"32px 40px 16px", borderBottom:"1px solid rgba(184,149,74,0.15)", display:"flex", alignItems:"center", gap:16}}>
              <h2 style={{margin:0}}>{sectionLabel(sections[6])}</h2>
              <a href="Technical.html" target="_blank" rel="noopener"
                 style={{fontFamily:"'JetBrains Mono', monospace", fontSize:10.5, letterSpacing:".14em", color:"var(--gold-deep)", textDecoration:"none", marginLeft:"auto", opacity:0.8}}>
                {locale === "en" ? "open full page" : locale === "zh-CN" ? "新标签打开" : locale === "zh-TW" ? "新分頁開啟" : locale === "ja" ? "新しいページで開く" : locale === "ko" ? "새 탭에서 열기" : "open full page"} ↗
              </a>
            </div>
            <iframe src="Technical.html" style={{flex:1, border:"none", width:"100%"}} title="Technical Reference" />
          </div>
        )}
      </div>
    </div>
  );
}

window.ViewSettings = ViewSettings;
