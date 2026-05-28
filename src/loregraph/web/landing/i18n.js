// LoreGraph — i18n
// Supported locales: en · zh-CN · zh-TW · ja · ko · fr · es · de

window.LG_LOCALES = [
  { code: "en",    label: "EN",  name: "English",          full: "English" },
  { code: "zh-CN", label: "简",  name: "简体中文",         full: "Simplified Chinese" },
  { code: "zh-TW", label: "繁",  name: "繁體中文",         full: "Traditional Chinese" },
  { code: "ja",    label: "日",  name: "日本語",           full: "Japanese" },
  { code: "ko",    label: "한",  name: "한국어",            full: "Korean" },
  { code: "fr",    label: "FR",  name: "Français",         full: "French" },
  { code: "es",    label: "ES",  name: "Español",          full: "Spanish" },
  { code: "de",    label: "DE",  name: "Deutsch",          full: "German" },
];

window.LG_I18N = {
  // ===== Brand & tagline =====
  "brand.name":     { "en": "LoreGraph", "zh-CN": "LoreGraph", "zh-TW": "LoreGraph", "ja": "LoreGraph", "ko": "LoreGraph", "fr": "LoreGraph", "es": "LoreGraph", "de": "LoreGraph" },
  "brand.tagline":  { "en": "EVERY NODE CITES THE PAGE IT CAME FROM", "zh-CN": "让图谱替自己作证", "zh-TW": "讓圖譜替自己作證", "ja": "すべてのノードは出典を引用する", "ko": "모든 노드는 원문을 인용한다", "fr": "CHAQUE NŒUD CITE LA PAGE D'OÙ IL VIENT", "es": "CADA NODO CITA LA PÁGINA DE ORIGEN", "de": "JEDER KNOTEN ZITIERT SEINE QUELLE" },
  "brand.version":  { "en": "v0.1 · ALPHA", "zh-CN": "v0.1 · ALPHA", "zh-TW": "v0.1 · ALPHA", "ja": "v0.1 · ALPHA", "ko": "v0.1 · ALPHA", "fr": "v0.1 · ALPHA", "es": "v0.1 · ALPHA", "de": "v0.1 · ALPHA" },

  // ===== Nav =====
  "nav.section.workspace": { "en": "WORKSPACE", "zh-CN": "工作区", "zh-TW": "工作區", "ja": "ワークスペース", "ko": "워크스페이스", "fr": "ESPACE", "es": "ESPACIO", "de": "ARBEITSBEREICH" },
  "nav.section.analysis":  { "en": "ANALYSIS",  "zh-CN": "分析",   "zh-TW": "分析",   "ja": "分析",          "ko": "분석",       "fr": "ANALYSE", "es": "ANÁLISIS", "de": "ANALYSE" },
  "nav.section.system":    { "en": "SYSTEM",    "zh-CN": "系统",   "zh-TW": "系統",   "ja": "システム",      "ko": "시스템",     "fr": "SYSTÈME", "es": "SISTEMA", "de": "SYSTEM" },

  "nav.library":   { "en": "Library",        "zh-CN": "图书馆",   "zh-TW": "圖書館",   "ja": "ライブラリ",       "ko": "라이브러리",   "fr": "Bibliothèque", "es": "Biblioteca",  "de": "Bibliothek" },
  "nav.graph":     { "en": "Graph View",     "zh-CN": "图谱视图", "zh-TW": "圖譜檢視", "ja": "グラフビュー",     "ko": "그래프 뷰",     "fr": "Vue Graphe",   "es": "Vista Grafo", "de": "Graph-Ansicht" },
  "nav.reader":    { "en": "Reader",         "zh-CN": "原文阅读", "zh-TW": "原文閱讀", "ja": "本文リーダー",     "ko": "본문 리더",     "fr": "Lecteur",      "es": "Lector",      "de": "Leser" },
  "nav.entities":  { "en": "Index",          "zh-CN": "索引",     "zh-TW": "索引",     "ja": "索引",           "ko": "색인",       "fr": "Index",        "es": "Índice",      "de": "Register" },
  "nav.pipeline":  { "en": "How we read this","zh-CN": "解析过程", "zh-TW": "解析過程", "ja": "読解の過程",     "ko": "분석 과정",   "fr": "Lecture",      "es": "Proceso",     "de": "Leseweg" },
  "nav.ask":       { "en": "Ask",            "zh-CN": "问答",     "zh-TW": "問答",     "ja": "質問",            "ko": "질문",         "fr": "Interroger",   "es": "Preguntar",   "de": "Fragen" },
  "nav.timeline": { "en": "Timeline",     "zh-CN": "时间线", "zh-TW": "時間線", "ja": "年代記",       "ko": "연대기",     "fr": "Chronique",  "es": "Crónica",  "de": "Chronik" },
  "nav.technical": { "en": "Technical Doc",  "zh-CN": "技术原理", "zh-TW": "技術原理", "ja": "技術ドキュメント", "ko": "기술 문서",    "fr": "Doc. technique","es": "Doc. técnica","de": "Tech-Doku" },

  // ===== User & budget =====
  "nav.settings": { "en": "Settings", "zh-CN": "设置", "zh-TW": "設定", "ja": "設定", "ko": "설정", "fr": "Paramètres", "es": "Ajustes", "de": "Einstellungen" },
  "acct.profile": { "en": "Profile", "zh-CN": "个人资料", "zh-TW": "個人資料", "ja": "プロフィール", "ko": "프로필", "fr": "Profil", "es": "Perfil", "de": "Profil" },
  "acct.billing": { "en": "Billing & usage", "zh-CN": "账单与使用", "zh-TW": "帳單與使用", "ja": "請求と使用量", "ko": "청구 및 사용", "fr": "Facturation", "es": "Facturación", "de": "Abrechnung" },
  "acct.apiKeys": { "en": "API keys", "zh-CN": "API 密钥", "zh-TW": "API 金鑰", "ja": "API キー", "ko": "API 키", "fr": "Clés API", "es": "Claves API", "de": "API-Schlüssel" },
  "acct.shortcuts": { "en": "Keyboard shortcuts", "zh-CN": "键盘快捷键", "zh-TW": "鍵盤快捷鍵", "ja": "キーボードショートカット", "ko": "키보드 단축키", "fr": "Raccourcis clavier", "es": "Atajos de teclado", "de": "Tastenkürzel" },
  "acct.help":    { "en": "Help & docs", "zh-CN": "帮助与文档", "zh-TW": "說明與文件", "ja": "ヘルプとドキュメント", "ko": "도움말 및 문서", "fr": "Aide & docs", "es": "Ayuda y docs", "de": "Hilfe & Doku" },
  "acct.signOut": { "en": "Sign out", "zh-CN": "退出登录", "zh-TW": "登出", "ja": "サインアウト", "ko": "로그아웃", "fr": "Déconnexion", "es": "Cerrar sesión", "de": "Abmelden" },
  "user.plan":      { "en": "Researcher", "zh-CN": "研究者", "zh-TW": "研究者", "ja": "研究者", "ko": "연구자", "fr": "Chercheur", "es": "Investigador", "de": "Forscher" },
  "budget.title":   { "en": "BUDGET", "zh-CN": "预算", "zh-TW": "預算", "ja": "予算", "ko": "예산", "fr": "BUDGET", "es": "PRESUPUESTO", "de": "BUDGET" },
  "budget.used":    { "en": "USED", "zh-CN": "已用", "zh-TW": "已用", "ja": "使用", "ko": "사용", "fr": "UTILISÉ", "es": "USADO", "de": "GENUTZT" },
  "budget.cap":     { "en": "CAP",  "zh-CN": "上限", "zh-TW": "上限", "ja": "上限", "ko": "한도", "fr": "PLAFOND", "es": "TOPE", "de": "LIMIT" },

  // ===== Common =====
  "common.search":         { "en": "Search…", "zh-CN": "搜索…", "zh-TW": "搜尋…", "ja": "検索…", "ko": "검색…", "fr": "Rechercher…", "es": "Buscar…", "de": "Suchen…" },
  "common.all":            { "en": "All",       "zh-CN": "全部", "zh-TW": "全部", "ja": "すべて", "ko": "전체", "fr": "Tous", "es": "Todos", "de": "Alle" },
  "common.filter":         { "en": "Filter",    "zh-CN": "筛选", "zh-TW": "篩選", "ja": "フィルター", "ko": "필터", "fr": "Filtre", "es": "Filtro", "de": "Filter" },
  "common.export":         { "en": "Export",    "zh-CN": "导出", "zh-TW": "匯出", "ja": "エクスポート", "ko": "내보내기", "fr": "Exporter", "es": "Exportar", "de": "Export" },
  "common.import":         { "en": "Import",    "zh-CN": "导入", "zh-TW": "匯入", "ja": "インポート", "ko": "가져오기", "fr": "Importer", "es": "Importar", "de": "Import" },
  "common.settings":       { "en": "Settings",  "zh-CN": "设置", "zh-TW": "設定", "ja": "設定", "ko": "설정", "fr": "Paramètres", "es": "Ajustes", "de": "Einstellungen" },
  "common.close":          { "en": "Close",     "zh-CN": "关闭", "zh-TW": "關閉", "ja": "閉じる", "ko": "닫기", "fr": "Fermer", "es": "Cerrar", "de": "Schließen" },
  "common.send":           { "en": "Send",      "zh-CN": "发送", "zh-TW": "傳送", "ja": "送信", "ko": "보내기", "fr": "Envoyer", "es": "Enviar", "de": "Senden" },
  "common.cancel":         { "en": "Cancel",    "zh-CN": "取消", "zh-TW": "取消", "ja": "キャンセル", "ko": "취소", "fr": "Annuler", "es": "Cancelar", "de": "Abbrechen" },
  "common.viewAll":        { "en": "View all",  "zh-CN": "查看全部", "zh-TW": "檢視全部", "ja": "すべて表示", "ko": "전체 보기", "fr": "Tout voir", "es": "Ver todo", "de": "Alle anzeigen" },
  "common.book":           { "en": "Book", "zh-CN": "书目", "zh-TW": "書目", "ja": "書籍", "ko": "도서", "fr": "Livre", "es": "Libro", "de": "Buch" },
  "common.openReader":     { "en": "Open reader", "zh-CN": "打开阅读", "zh-TW": "開啟閱讀", "ja": "リーダーを開く", "ko": "리더 열기", "fr": "Ouvrir lecteur", "es": "Abrir lector", "de": "Leser öffnen" },
  "common.rerun":          { "en": "Re-run extraction", "zh-CN": "重新抽取", "zh-TW": "重新抽取", "ja": "再抽出", "ko": "재추출", "fr": "Relancer", "es": "Reejecutar", "de": "Neu starten" },
  "common.askThisBook":    { "en": "Ask about this book", "zh-CN": "向本书提问", "zh-TW": "向本書提問", "ja": "この本に質問", "ko": "이 책에 질문", "fr": "Interroger ce livre", "es": "Preguntar al libro", "de": "Buch befragen" },

  // ===== Status pills =====
  "status.verified":  { "en": "VERIFIED",  "zh-CN": "已验证", "zh-TW": "已驗證", "ja": "検証済み", "ko": "검증됨", "fr": "VÉRIFIÉ", "es": "VERIFICADO", "de": "GEPRÜFT" },
  "status.running":   { "en": "RUNNING",   "zh-CN": "运行中", "zh-TW": "執行中", "ja": "実行中",   "ko": "실행 중", "fr": "EN COURS", "es": "EN CURSO",   "de": "LÄUFT" },
  "status.ingested":  { "en": "INGESTED",  "zh-CN": "已导入", "zh-TW": "已匯入", "ja": "取り込み済", "ko": "수집됨", "fr": "INGÉRÉ",   "es": "INGERIDO",   "de": "EINGELESEN" },
  "status.failed":    { "en": "FAILED",    "zh-CN": "失败",   "zh-TW": "失敗",   "ja": "失敗",      "ko": "실패",     "fr": "ÉCHEC",    "es": "FALLIDO",    "de": "FEHLER" },
  "status.queued":    { "en": "QUEUED",    "zh-CN": "排队中", "zh-TW": "排隊中", "ja": "待機中",    "ko": "대기 중",  "fr": "EN ATTENTE","es": "EN COLA",   "de": "WARTET" },
  "status.done":      { "en": "DONE",      "zh-CN": "已完成", "zh-TW": "已完成", "ja": "完了",      "ko": "완료",     "fr": "TERMINÉ",  "es": "HECHO",      "de": "FERTIG" },

  // ===== Library =====
  "lib.title":         { "en": "My Library", "zh-CN": "我的图书馆", "zh-TW": "我的圖書館", "ja": "マイライブラリ", "ko": "내 라이브러리", "fr": "Ma Bibliothèque", "es": "Mi Biblioteca", "de": "Meine Bibliothek" },
  "lib.title.em":      { "en": "Library", "zh-CN": "图书馆", "zh-TW": "圖書館", "ja": "ライブラリ", "ko": "라이브러리", "fr": "Bibliothèque", "es": "Biblioteca", "de": "Bibliothek" },
  "lib.subtitle":      { "en": "All your closed-world texts in one shelf — graphs, evidence, and provenance carried with them.", "zh-CN": "所有封闭世界文本汇集于此 —— 图谱、证据与溯源链一同携带。", "zh-TW": "所有封閉世界文本匯集於此 —— 圖譜、證據與溯源鏈一同攜帶。", "ja": "閉鎖世界のテキストを一棚に。グラフ・証拠・出典を伴います。", "ko": "닫힌 세계의 텍스트를 한 곳에 — 그래프, 증거, 출처를 함께.", "fr": "Tous vos textes en monde clos sur une seule étagère — graphes, preuves, provenance.", "es": "Todos tus textos en una estantería — grafos, evidencia y procedencia incluidos.", "de": "Alle Texte in einem Regal — mit Graphen, Belegen und Herkunft." },
  "lib.stat.books":    { "en": "BOOKS",     "zh-CN": "书目",     "zh-TW": "書目",     "ja": "書籍",     "ko": "도서",     "fr": "LIVRES",     "es": "LIBROS",     "de": "BÜCHER" },
  "lib.stat.entities": { "en": "ENTITIES",  "zh-CN": "实体",     "zh-TW": "實體",     "ja": "実体",     "ko": "엔티티",   "fr": "ENTITÉS",    "es": "ENTIDADES",  "de": "ENTITÄTEN" },
  "lib.stat.edges":    { "en": "EDGES",     "zh-CN": "边",       "zh-TW": "邊",       "ja": "エッジ",   "ko": "엣지",     "fr": "ARÊTES",     "es": "ARISTAS",    "de": "KANTEN" },
  "lib.stat.cost":     { "en": "TOTAL COST","zh-CN": "总成本",   "zh-TW": "總成本",   "ja": "総コスト", "ko": "총 비용",  "fr": "COÛT TOTAL", "es": "COSTE TOTAL","de": "GESAMTKOSTEN" },
  "lib.filter.all":      { "en": "All",       "zh-CN": "全部",   "zh-TW": "全部",   "ja": "すべて",   "ko": "전체",     "fr": "Tous",      "es": "Todos",    "de": "Alle" },
  "lib.filter.verified": { "en": "Verified",  "zh-CN": "已验证", "zh-TW": "已驗證", "ja": "検証済",   "ko": "검증됨",   "fr": "Vérifiés",  "es": "Verificados","de": "Geprüft" },
  "lib.filter.running":  { "en": "Running",   "zh-CN": "运行中", "zh-TW": "執行中", "ja": "実行中",   "ko": "실행 중",  "fr": "En cours",  "es": "En curso", "de": "Läuft" },
  "lib.filter.ingested": { "en": "Ingested",  "zh-CN": "已导入", "zh-TW": "已匯入", "ja": "取り込み済","ko": "수집됨",  "fr": "Ingérés",   "es": "Ingeridos","de": "Eingelesen" },
  "lib.filter.failed":   { "en": "Failed",    "zh-CN": "失败",   "zh-TW": "失敗",   "ja": "失敗",     "ko": "실패",     "fr": "Échec",     "es": "Fallidos", "de": "Fehler" },
  "lib.card.entities":   { "en": "entities",  "zh-CN": "实体",   "zh-TW": "實體",   "ja": "実体",     "ko": "엔티티",  "fr": "entités",    "es": "entidades", "de": "Entitäten" },
  "lib.card.edges":      { "en": "edges",     "zh-CN": "关系",   "zh-TW": "關係",   "ja": "エッジ",   "ko": "엣지",    "fr": "arêtes",     "es": "aristas",   "de": "Kanten" },
  "lib.card.glucose":    { "en": "glucose",   "zh-CN": "隐式",   "zh-TW": "隱式",   "ja": "暗黙",     "ko": "암묵",    "fr": "implicites", "es": "implícitos","de": "Implizit" },
  "lib.card.characters": { "en": "characters","zh-CN": "角色",   "zh-TW": "角色",   "ja": "登場人物", "ko": "인물",    "fr": "personnages","es": "personajes","de": "Figuren" },
  "lib.card.relations":  { "en": "relations", "zh-CN": "关系",   "zh-TW": "關係",   "ja": "関係",     "ko": "관계",    "fr": "relations",  "es": "relaciones","de": "Beziehungen" },
  "lib.card.words":      { "en": "words",     "zh-CN": "字数",   "zh-TW": "字數",   "ja": "文字数",   "ko": "글자 수", "fr": "mots",       "es": "palabras",  "de": "Wörter" },
  "work.type.novel":      { "en": "novel",      "zh-CN": "小说",    "zh-TW": "小說",    "ja": "小説",       "ko": "소설",      "fr": "roman",       "es": "novela",      "de": "Roman" },
  "work.type.play":       { "en": "play",       "zh-CN": "戏剧",    "zh-TW": "戲劇",    "ja": "戯曲",       "ko": "희곡",      "fr": "pièce",       "es": "obra de teatro","de": "Bühnenstück" },
  "work.type.musical":    { "en": "musical",    "zh-CN": "音乐剧",  "zh-TW": "音樂劇",  "ja": "ミュージカル","ko": "뮤지컬",    "fr": "comédie musicale","es": "musical",  "de": "Musical" },
  "work.type.opera":      { "en": "opera",      "zh-CN": "歌剧",    "zh-TW": "歌劇",    "ja": "オペラ",     "ko": "오페라",    "fr": "opéra",       "es": "ópera",       "de": "Oper" },
  "work.type.screenplay": { "en": "screenplay", "zh-CN": "电影剧本","zh-TW": "電影劇本","ja": "脚本",       "ko": "각본",      "fr": "scénario",    "es": "guion",       "de": "Drehbuch" },
  "lib.view.grid":        { "en": "Grid",       "zh-CN": "网格",    "zh-TW": "網格",    "ja": "グリッド",   "ko": "그리드",    "fr": "Grille",      "es": "Cuadrícula",  "de": "Raster" },
  "lib.view.shelf":       { "en": "Bookshelf",  "zh-CN": "书架",    "zh-TW": "書架",    "ja": "本棚",       "ko": "책장",      "fr": "Étagère",     "es": "Estantería",  "de": "Bücherregal" },
  "lib.card.match":    { "en": "match",    "zh-CN": "匹配率",  "zh-TW": "匹配率",  "ja": "一致率",   "ko": "일치율",   "fr": "corresp.",  "es": "coincid.", "de": "Treffer" },
  "lib.card.cost":     { "en": "cost",     "zh-CN": "成本",    "zh-TW": "成本",    "ja": "コスト",   "ko": "비용",     "fr": "coût",      "es": "coste",    "de": "Kosten" },
  "lib.card.lastRun":  { "en": "Last run", "zh-CN": "上次运行","zh-TW": "上次執行","ja": "前回実行", "ko": "마지막 실행","fr": "Dern. exéc.","es": "Última ejec.","de": "Letzter Lauf" },
  "lib.card.progress": { "en": "Pass {n} of 7 · {p}%", "zh-CN": "第 {n} / 7 阶段 · {p}%", "zh-TW": "第 {n} / 7 階段 · {p}%", "ja": "パス {n} / 7 · {p}%", "ko": "{n} / 7 단계 · {p}%", "fr": "Passe {n} / 7 · {p}%", "es": "Pase {n} / 7 · {p}%", "de": "Phase {n} / 7 · {p}%" },
  "lib.card.never":    { "en": "Not yet extracted", "zh-CN": "尚未抽取", "zh-TW": "尚未抽取", "ja": "未抽出", "ko": "추출 전", "fr": "Pas encore extrait", "es": "Sin extraer", "de": "Noch nicht extrahiert" },
  "lib.card.failedAt": { "en": "Failed at", "zh-CN": "失败于", "zh-TW": "失敗於", "ja": "失敗", "ko": "실패 지점", "fr": "Échoué à", "es": "Falló en", "de": "Fehler bei" },
  "lib.import.plus":   { "en": "+", "zh-CN": "+", "zh-TW": "+", "ja": "+", "ko": "+", "fr": "+", "es": "+", "de": "+" },
  "lib.import.text":   { "en": "Add a new text", "zh-CN": "导入新书", "zh-TW": "匯入新書", "ja": "新しいテキストを追加", "ko": "새 텍스트 추가", "fr": "Ajouter un texte", "es": "Añadir texto", "de": "Text hinzufügen" },
  "lib.import.formats":{ "en": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "zh-CN": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "zh-TW": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "ja": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "ko": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "fr": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "es": "TXT · EPUB · PDF · DOCX · FOUNTAIN", "de": "TXT · EPUB · PDF · DOCX · FOUNTAIN" },

  // ===== Graph view =====
  "gv.filters":        { "en": "FILTERS",      "zh-CN": "筛选",    "zh-TW": "篩選",    "ja": "フィルター",    "ko": "필터",        "fr": "FILTRES",   "es": "FILTROS",   "de": "FILTER" },
  "gv.nodeTypes":      { "en": "NODE TYPES",   "zh-CN": "节点类型","zh-TW": "節點類型","ja": "ノードタイプ", "ko": "노드 유형",   "fr": "TYPES DE NŒUD","es": "TIPOS DE NODO","de": "KNOTENTYPEN" },
  "gv.edgeTypes":      { "en": "EDGE TYPES",   "zh-CN": "关系类型","zh-TW": "關係類型","ja": "エッジタイプ", "ko": "엣지 유형",   "fr": "TYPES D'ARÊTE","es": "TIPOS DE ARISTA","de": "KANTENTYPEN" },
  "gv.confidence":     { "en": "CONFIDENCE ≥","zh-CN": "置信度 ≥","zh-TW": "置信度 ≥","ja": "信頼度 ≥",     "ko": "신뢰도 ≥",    "fr": "CONFIANCE ≥","es": "CONFIANZA ≥","de": "KONFIDENZ ≥" },
  "gv.chapter":        { "en": "CHAPTER",      "zh-CN": "章节",    "zh-TW": "章節",    "ja": "章",            "ko": "장",          "fr": "CHAPITRE",   "es": "CAPÍTULO",  "de": "KAPITEL" },
  "gv.allChapters":    { "en": "All chapters", "zh-CN": "所有章节","zh-TW": "所有章節","ja": "全章",          "ko": "전체 장",     "fr": "Tous chap.","es": "Todos cap.","de": "Alle Kap." },
  "gv.legend":         { "en": "LEGEND",       "zh-CN": "图例",    "zh-TW": "圖例",    "ja": "凡例",         "ko": "범례",        "fr": "LÉGENDE",    "es": "LEYENDA",   "de": "LEGENDE" },
  "gv.panel.outgoing": { "en": "Speaks of",      "zh-CN": "主动关系",   "zh-TW": "主動關係",   "ja": "発信する関係",    "ko": "발신 관계",     "fr": "Évoque",         "es": "Habla de",       "de": "Bezieht sich auf" },
  "gv.panel.incoming": { "en": "Spoken of by",   "zh-CN": "被动关系",   "zh-TW": "被動關係",   "ja": "言及される関係",  "ko": "피언급 관계",   "fr": "Évoqué par",     "es": "Mencionado por", "de": "Wird bezogen von" },
  "gv.panel.glucose":  { "en": "Beneath the surface", "zh-CN": "言下之意", "zh-TW": "言下之意", "ja": "行間を読む",    "ko": "행간 읽기",    "fr": "Entre les lignes","es": "Entre líneas",   "de": "Zwischen den Zeilen" },
  "gv.panel.mentions": { "en": "Mentions",     "zh-CN": "提及",    "zh-TW": "提及",    "ja": "言及",         "ko": "언급",        "fr": "Mentions",   "es": "Menciones", "de": "Erwähnungen" },
  "gv.panel.aliases":  { "en": "ALIASES",      "zh-CN": "别名",    "zh-TW": "別名",    "ja": "別名",         "ko": "별칭",        "fr": "ALIAS",      "es": "ALIAS",     "de": "ALIASE" },
  "gv.panel.mentionCount":  { "en": "MENTIONS",   "zh-CN": "提及",    "zh-TW": "提及",    "ja": "言及",         "ko": "언급",        "fr": "MENTIONS",   "es": "MENCIONES", "de": "ERWÄHNUNGEN" },
  "gv.panel.chapters": { "en": "CHAPTERS",     "zh-CN": "章节",    "zh-TW": "章節",    "ja": "章",            "ko": "장",          "fr": "CHAPITRES",  "es": "CAPÍTULOS", "de": "KAPITEL" },
  "gv.panel.confidence":{ "en": "CONFIDENCE",  "zh-CN": "置信度",  "zh-TW": "置信度",  "ja": "信頼度",       "ko": "신뢰도",      "fr": "CONFIANCE",  "es": "CONFIANZA", "de": "KONFIDENZ" },
  "gv.status.nodes":   { "en": "nodes",        "zh-CN": "节点",    "zh-TW": "節點",    "ja": "ノード",       "ko": "노드",        "fr": "nœuds",      "es": "nodos",     "de": "Knoten" },
  "gv.status.edges":   { "en": "edges",        "zh-CN": "边",      "zh-TW": "邊",      "ja": "エッジ",       "ko": "엣지",        "fr": "arêtes",     "es": "aristas",   "de": "Kanten" },
  "gv.status.selected":{ "en": "selected",     "zh-CN": "已选中",  "zh-TW": "已選中",  "ja": "選択",         "ko": "선택됨",      "fr": "sélectionné","es": "selecc.",   "de": "ausgewählt" },
  "gv.click":          { "en": "Click a node to inspect", "zh-CN": "点击节点查看证据", "zh-TW": "點擊節點查看證據", "ja": "ノードをクリックして確認", "ko": "노드를 클릭하여 확인", "fr": "Cliquez sur un nœud", "es": "Haz clic en un nodo", "de": "Knoten anklicken" },
  "gv.verifiedBy":     { "en": "Cited",   "zh-CN": "已对照原文", "zh-TW": "已對照原文", "ja": "原文照合済", "ko": "원문 대조됨", "fr": "Cité",   "es": "Citado",  "de": "Belegt" },
  "gv.conf":           { "en": "confidence", "zh-CN": "可信度",  "zh-TW": "可信度",   "ja": "確度",       "ko": "신뢰도",     "fr": "fiabilité","es": "fiabilidad","de": "Sicherheit" },

  // ===== Node / Edge types =====
  "type.agent":   { "en": "Agent",     "zh-CN": "行动者", "zh-TW": "行動者", "ja": "エージェント", "ko": "행위자", "fr": "Agent",   "es": "Agente",   "de": "Akteur" },
  "type.object":  { "en": "Object",    "zh-CN": "物件",   "zh-TW": "物件",   "ja": "オブジェクト", "ko": "객체",    "fr": "Objet",   "es": "Objeto",   "de": "Objekt" },
  "type.event":   { "en": "Event",     "zh-CN": "事件",   "zh-TW": "事件",   "ja": "イベント",     "ko": "이벤트", "fr": "Événement","es": "Evento",   "de": "Ereignis" },
  "type.concept": { "en": "Concept",   "zh-CN": "概念",   "zh-TW": "概念",   "ja": "コンセプト",   "ko": "개념",    "fr": "Concept", "es": "Concepto", "de": "Konzept" },

  // ===== Reader =====
  "rd.toc":            { "en": "TABLE OF CONTENTS", "zh-CN": "目录", "zh-TW": "目錄", "ja": "目次", "ko": "목차", "fr": "TABLE DES MATIÈRES", "es": "ÍNDICE", "de": "INHALT" },
  "rd.chapter":        { "en": "Chapter {n}",  "zh-CN": "第 {n} 章", "zh-TW": "第 {n} 章", "ja": "第 {n} 章", "ko": "{n}장", "fr": "Chapitre {n}", "es": "Capítulo {n}", "de": "Kapitel {n}" },
  "rd.chapter.short":  { "en": "ch",   "zh-CN": "章",   "zh-TW": "章",   "ja": "章",   "ko": "장",   "fr": "ch",  "es": "cap", "de": "K" },
  "rd.thisChunk":      { "en": "THIS CHUNK", "zh-CN": "本切片", "zh-TW": "本切片", "ja": "このチャンク", "ko": "현재 청크", "fr": "CE FRAGMENT", "es": "ESTE FRAGMENTO", "de": "DIESER ABSCHNITT" },
  "rd.chunkEntities":  { "en": "Entities found here", "zh-CN": "本切片中的实体", "zh-TW": "本切片中的實體", "ja": "このチャンクの実体", "ko": "이 청크의 엔티티", "fr": "Entités ici", "es": "Entidades aquí", "de": "Hier gefundene Entitäten" },
  "rd.tokens":         { "en": "tokens", "zh-CN": "tokens", "zh-TW": "tokens", "ja": "tokens", "ko": "tokens", "fr": "tokens", "es": "tokens", "de": "Tokens" },
  "rd.legend":         { "en": "READING LEGEND", "zh-CN": "高亮说明", "zh-TW": "高亮說明", "ja": "凡例", "ko": "범례", "fr": "LÉGENDE", "es": "LEYENDA", "de": "LEGENDE" },
  "rd.entHere":        { "en": "entities", "zh-CN": "实体", "zh-TW": "實體", "ja": "実体", "ko": "엔티티", "fr": "entités", "es": "entidades", "de": "Entitäten" },

  // ===== Entities view =====
  "ev.search":         { "en": "Search entities…", "zh-CN": "搜索实体…", "zh-TW": "搜尋實體…", "ja": "実体を検索…", "ko": "엔티티 검색…", "fr": "Rechercher des entités…", "es": "Buscar entidades…", "de": "Entitäten suchen…" },
  "ev.detail.outgoing":{ "en": "Speaks of",    "zh-CN": "主动关系", "zh-TW": "主動關係", "ja": "発信する関係","ko": "발신 관계", "fr": "Évoque",       "es": "Habla de",       "de": "Bezieht sich auf" },
  "ev.detail.incoming":{ "en": "Spoken of by", "zh-CN": "被动关系", "zh-TW": "被動關係", "ja": "言及される関係","ko": "피언급 관계", "fr": "Évoqué par",  "es": "Mencionado por", "de": "Wird bezogen von" },
  "ev.detail.glucose": { "en": "Beneath the surface", "zh-CN": "言下之意", "zh-TW": "言下之意", "ja": "行間を読む",  "ko": "행간 읽기",   "fr": "Entre les lignes", "es": "Entre líneas",   "de": "Zwischen den Zeilen" },
  "ev.detail.mentions":{ "en": "Where mentioned",    "zh-CN": "出现章节",  "zh-TW": "出現章節",  "ja": "登場する章",  "ko": "등장하는 장", "fr": "Où mentionné",  "es": "Dónde aparece",  "de": "Wo erwähnt" },
  "ev.summary":        { "en": "SUMMARY",     "zh-CN": "概述",   "zh-TW": "概述",   "ja": "概要",      "ko": "요약",     "fr": "RÉSUMÉ",    "es": "RESUMEN",   "de": "ÜBERBLICK" },

  // ===== Pipeline =====
  "pv.title":          { "en": "Extraction Pipeline", "zh-CN": "抽取流水线", "zh-TW": "抽取流水線", "ja": "抽出パイプライン", "ko": "추출 파이프라인", "fr": "Pipeline d'extraction", "es": "Pipeline de extracción", "de": "Extraktions-Pipeline" },
  "pv.title.em":       { "en": "Pipeline",          "zh-CN": "流水线",     "zh-TW": "流水線",     "ja": "パイプライン",     "ko": "파이프라인",    "fr": "Pipeline",     "es": "Pipeline",       "de": "Pipeline" },
  "pv.startedAt":      { "en": "Started at",       "zh-CN": "开始于",     "zh-TW": "開始於",     "ja": "開始",            "ko": "시작",         "fr": "Démarré à",   "es": "Iniciado a",     "de": "Gestartet um" },
  "pv.finishedAt":     { "en": "Finished at",      "zh-CN": "结束于",     "zh-TW": "結束於",     "ja": "終了",            "ko": "종료",         "fr": "Terminé à",   "es": "Finalizado a",   "de": "Beendet um" },
  "pv.totalCost":      { "en": "TOTAL COST",       "zh-CN": "总成本",     "zh-TW": "總成本",     "ja": "総コスト",         "ko": "총 비용",      "fr": "COÛT TOTAL",  "es": "COSTE TOTAL",    "de": "GESAMTKOSTEN" },
  "pv.totalTokens":    { "en": "TOTAL TOKENS",     "zh-CN": "总 tokens",  "zh-TW": "總 tokens",  "ja": "総トークン",       "ko": "총 토큰",      "fr": "TOTAL TOKENS","es": "TOTAL TOKENS",   "de": "GESAMT-TOKENS" },
  "pv.cacheHit":       { "en": "CACHE HIT",        "zh-CN": "缓存命中",   "zh-TW": "快取命中",   "ja": "キャッシュ率",     "ko": "캐시 적중",    "fr": "CACHE",       "es": "ACIERTOS CACHE", "de": "CACHE-TREFFER" },
  "pv.duration":       { "en": "DURATION",         "zh-CN": "总时长",     "zh-TW": "總時長",     "ja": "所要時間",         "ko": "총 시간",      "fr": "DURÉE",       "es": "DURACIÓN",       "de": "DAUER" },
  "pv.matchRate":      { "en": "MATCH RATE",       "zh-CN": "字面匹配率", "zh-TW": "字面匹配率", "ja": "一致率",           "ko": "일치율",       "fr": "TAUX MATCH",  "es": "TASA COINC.",    "de": "TREFFER-RATE" },
  "pv.tokensIn":       { "en": "INPUT",            "zh-CN": "输入",       "zh-TW": "輸入",       "ja": "入力",             "ko": "입력",         "fr": "ENTRÉE",      "es": "ENTRADA",        "de": "EINGABE" },
  "pv.tokensOut":      { "en": "OUTPUT",           "zh-CN": "输出",       "zh-TW": "輸出",       "ja": "出力",             "ko": "출력",         "fr": "SORTIE",      "es": "SALIDA",         "de": "AUSGABE" },
  "pv.cached":         { "en": "CACHED",           "zh-CN": "缓存",       "zh-TW": "快取",       "ja": "キャッシュ",       "ko": "캐시",         "fr": "CACHÉ",       "es": "EN CACHÉ",       "de": "GECACHT" },
  "pv.fresh":          { "en": "FRESH",            "zh-CN": "新算",       "zh-TW": "新算",       "ja": "新規",             "ko": "신규",         "fr": "NEUF",        "es": "NUEVO",          "de": "FRISCH" },
  "pv.cost":           { "en": "COST",             "zh-CN": "成本",       "zh-TW": "成本",       "ja": "コスト",           "ko": "비용",         "fr": "COÛT",        "es": "COSTE",          "de": "KOSTEN" },
  "pv.gleaning":       { "en": "GLEANING",         "zh-CN": "gleaning",   "zh-TW": "gleaning",   "ja": "gleaning",         "ko": "gleaning",     "fr": "GLEANING",    "es": "GLEANING",       "de": "GLEANING" },
  "pv.logs":           { "en": "LIVE LOGS",        "zh-CN": "实时日志",   "zh-TW": "即時日誌",   "ja": "ライブログ",       "ko": "실시간 로그",  "fr": "JOURNAUX",    "es": "REGISTROS",      "de": "LIVE-LOGS" },
  "pv.costBreakdown":  { "en": "COST BREAKDOWN",   "zh-CN": "成本分解",   "zh-TW": "成本分解",   "ja": "コスト内訳",       "ko": "비용 분해",    "fr": "DÉTAIL COÛT", "es": "DESGLOSE COSTE", "de": "KOSTEN-AUFTEILUNG" },
  "pv.subtotal":       { "en": "Subtotal",         "zh-CN": "小计",       "zh-TW": "小計",       "ja": "小計",             "ko": "소계",         "fr": "Sous-total",  "es": "Subtotal",       "de": "Zwischensumme" },

  // ===== Ask =====
  "ask.history":       { "en": "HISTORY",         "zh-CN": "对话历史", "zh-TW": "對話歷史", "ja": "履歴",         "ko": "기록",       "fr": "HISTORIQUE", "es": "HISTORIAL", "de": "VERLAUF" },
  "ask.new":           { "en": "New conversation","zh-CN": "新建对话","zh-TW": "新建對話","ja": "新しい会話",   "ko": "새 대화",    "fr": "Nouvelle conv.","es": "Nueva conv.","de": "Neue Konversation" },
  "ask.placeholder":   { "en": "Ask a question about this book…", "zh-CN": "向本书提一个问题…", "zh-TW": "向本書提一個問題…", "ja": "この本について質問する…", "ko": "이 책에 대해 질문…", "fr": "Posez une question sur ce livre…", "es": "Pregunta algo sobre el libro…", "de": "Eine Frage zum Buch stellen…" },
  "ask.send":          { "en": "ASK",             "zh-CN": "提问",     "zh-TW": "提問",     "ja": "送信",          "ko": "전송",        "fr": "DEMANDER",    "es": "PREGUNTAR",  "de": "FRAGEN" },
  "ask.hint":          { "en": "Press {k} to send · answers cite literal evidence spans", "zh-CN": "{k} 发送 · 回答必引原文字面片段", "zh-TW": "{k} 傳送 · 回答必引原文字面片段", "ja": "{k} で送信 · 回答は原文を引用します", "ko": "{k} 전송 · 답변은 원문을 인용합니다", "fr": "{k} pour envoyer · réponses citées", "es": "{k} para enviar · respuestas citadas", "de": "{k} zum Senden · Antworten mit Zitat" },
  "ask.caveat":        { "en": "Caveat", "zh-CN": "说明", "zh-TW": "說明", "ja": "注", "ko": "주의", "fr": "Note", "es": "Aviso", "de": "Hinweis" },

  // ===== Technical =====
  "tech.overlay":      { "en": "Technical reference · same content as README", "zh-CN": "技术参考 · 与 README 同源", "zh-TW": "技術參考 · 與 README 同源", "ja": "技術参考 · README と同一", "ko": "기술 참고 · README와 동일", "fr": "Référence technique · contenu README", "es": "Referencia técnica · contenido README", "de": "Technische Referenz · README-Inhalt" },
  "tech.openFull":     { "en": "Open full page ↗", "zh-CN": "全页打开 ↗", "zh-TW": "全頁開啟 ↗", "ja": "全画面で開く ↗", "ko": "전체 페이지 열기 ↗", "fr": "Ouvrir page entière ↗", "es": "Abrir página completa ↗", "de": "Ganze Seite ↗" },

  // ===== Edge relations (friendly labels) =====
  "rel.STRUCTURAL": { "en": "belongs to",    "zh-CN": "从属于",  "zh-TW": "從屬於",  "ja": "属する",     "ko": "속함",       "fr": "appartient à", "es": "pertenece a",  "de": "gehört zu" },
  "rel.INTERACTS":  { "en": "interacts",     "zh-CN": "互动",      "zh-TW": "互動",      "ja": "交わる",     "ko": "교류",       "fr": "interagit",   "es": "interactúa",   "de": "interagiert" },
  "rel.ASSERTS":    { "en": "asserts",       "zh-CN": "断言",      "zh-TW": "斷言",      "ja": "断言する",   "ko": "단언",       "fr": "affirme",     "es": "afirma",       "de": "behauptet" },
  "rel.INFLUENCES": { "en": "influences",    "zh-CN": "影响",      "zh-TW": "影響",      "ja": "影響する",   "ko": "영향",       "fr": "influence",   "es": "influye",      "de": "beeinflusst" },
  "rel.PREDICTS":   { "en": "foreshadows",   "zh-CN": "预示",      "zh-TW": "預示",      "ja": "伏線となる", "ko": "예고",       "fr": "présage",     "es": "presagia",     "de": "deutet voraus" },
  "rel.SYMBOLIZES": { "en": "symbolizes",    "zh-CN": "象征",      "zh-TW": "象徵",      "ja": "象徴する",   "ko": "상징",       "fr": "symbolise",   "es": "simboliza",    "de": "symbolisiert" },

  // ===== Graph controls (tooltips) =====
  "gv.zoomIn":   { "en": "Zoom in",      "zh-CN": "放大",     "zh-TW": "放大",     "ja": "拡大",        "ko": "확대",        "fr": "Agrandir",  "es": "Ampliar",   "de": "Vergrößern" },
  "gv.zoomOut":  { "en": "Zoom out",     "zh-CN": "缩小",     "zh-TW": "縮小",     "ja": "縮小",        "ko": "축소",        "fr": "Réduire",   "es": "Reducir",   "de": "Verkleinern" },
  "gv.fit":      { "en": "Fit to view",  "zh-CN": "适应画布", "zh-TW": "適應畫布", "ja": "画面に合わせる","ko": "화면에 맞춤","fr": "Ajuster",   "es": "Ajustar",   "de": "Anpassen" },
  "gv.fullscreenOn":  { "en": "Enter fullscreen", "zh-CN": "全屏显示", "zh-TW": "全螢幕", "ja": "全画面", "ko": "전체화면", "fr": "Plein écran", "es": "Pantalla completa", "de": "Vollbild" },
  "gv.fullscreenOff": { "en": "Exit fullscreen",  "zh-CN": "退出全屏", "zh-TW": "退出全螢幕", "ja": "全画面を退出", "ko": "전체화면 종료", "fr": "Quitter plein écran", "es": "Salir de pantalla completa", "de": "Vollbild verlassen" },
  "gv.view":        { "en": "VIEW",      "zh-CN": "视图",      "zh-TW": "視圖",      "ja": "ビュー",     "ko": "보기",        "fr": "VUE",        "es": "VISTA",      "de": "ANSICHT" },
  "gv.expandFilters":   { "en": "Expand filters",   "zh-CN": "展开筛选", "zh-TW": "展開篩選", "ja": "フィルターを展開", "ko": "필터 펼치기", "fr": "Ouvrir filtres",    "es": "Abrir filtros",    "de": "Filter öffnen" },
  "gv.collapseFilters": { "en": "Collapse filters", "zh-CN": "收起筛选", "zh-TW": "收起篩選", "ja": "フィルターを閉じる", "ko": "필터 접기", "fr": "Replier filtres",   "es": "Cerrar filtros",   "de": "Filter schließen" },
  "gv.expandDetails":   { "en": "Expand details",   "zh-CN": "展开详情", "zh-TW": "展開詳情", "ja": "詳細を展開", "ko": "세부 펼치기", "fr": "Ouvrir détails",    "es": "Abrir detalles",    "de": "Details öffnen" },
  "gv.collapseDetails": { "en": "Collapse details", "zh-CN": "收起详情", "zh-TW": "收起詳情", "ja": "詳細を閉じる", "ko": "세부 접기", "fr": "Replier détails",   "es": "Cerrar detalles",   "de": "Details schließen" },
  "sb.expand":   { "en": "Expand",   "zh-CN": "展开侧栏", "zh-TW": "展開側欄", "ja": "サイドバーを展開", "ko": "사이드바 펼치기", "fr": "Ouvrir la barre",  "es": "Abrir barra",   "de": "Seitenleiste öffnen" },
  "sb.collapse": { "en": "Collapse", "zh-CN": "收起侧栏", "zh-TW": "收起側欄", "ja": "サイドバーを閉じる", "ko": "사이드바 접기", "fr": "Replier la barre", "es": "Cerrar barra",  "de": "Seitenleiste schließen" },

  // ===== Timeline section labels =====
  "tl.title":    { "en": "The shape of the story", "zh-CN": "故事的形状", "zh-TW": "故事的形狀", "ja": "物語の形", "ko": "이야기의 형태", "fr": "La forme du récit", "es": "La forma de la historia", "de": "Die Gestalt der Erzählung" },
  "tl.sub":      { "en": "Every event anchored to its chapter — click to read its evidence.", "zh-CN": "每一个事件，按章节定位 — 点击查看原文引证。", "zh-TW": "每一個事件，按章節定位 — 點擊查看原文引證。", "ja": "各イベントを章に対応させ、原文引用を表示。", "ko": "각 사건을 장에 맞춰 배치하고 원문 인용을 함께 보입니다.", "fr": "Chaque événement ancré à son chapitre — cliquez pour le citer.", "es": "Cada evento anclado a su capítulo — clic para la cita.", "de": "Jedes Ereignis an sein Kapitel gebunden — klicken für das Zitat." },
  "tl.all":          { "en": "All", "zh-CN": "全部", "zh-TW": "全部", "ja": "すべて", "ko": "전체", "fr": "Tous", "es": "Todos", "de": "Alle" },
  "tl.participants": { "en": "Participants", "zh-CN": "参与人物", "zh-TW": "參與人物", "ja": "参加者", "ko": "참여 인물", "fr": "Participants", "es": "Participantes", "de": "Beteiligte" },
  "tl.evidence":     { "en": "Evidence", "zh-CN": "原文证据", "zh-TW": "原文證據", "ja": "原文証拠", "ko": "원문 증거", "fr": "Preuves", "es": "Evidencia", "de": "Belege" },
  "tl.hint":         { "en": "Scroll to navigate · shift + scroll for native", "zh-CN": "滚轮平移 · Shift + 滚轮沿原攝", "zh-TW": "滾輪平移 · Shift + 滾輪原生", "ja": "スクロールで移動 · Shift + スクロールでデフォルト", "ko": "스크롤로 이동 · Shift + 스크롤 기본", "fr": "Faites défiler pour naviguer", "es": "Desplaza para navegar", "de": "Scrollen zum Navigieren" },

  // ===== Ask suggestions =====
  "ask.suggested":   { "en": "Suggested follow-ups", "zh-CN": "建议追问", "zh-TW": "建議追問", "ja": "おすすめの追加質問", "ko": "추천 후속 질문", "fr": "Suggestions de suivi", "es": "Preguntas sugeridas", "de": "Folgefragen" },

  // ===== Pipeline =====
  "pv.behindScenes": { "en": "Behind the scenes", "zh-CN": "技术细节", "zh-TW": "技術細節", "ja": "技術的詳細", "ko": "기술 세부", "fr": "Détails techniques", "es": "Detalles técnicos", "de": "Technische Details" },
  "pv.cacheSavings": { "en": "CACHE SAVINGS", "zh-CN": "缓存节省", "zh-TW": "快取節省", "ja": "キャッシュ節約", "ko": "캐시 절약", "fr": "ÉCONOMIES CACHE", "es": "AHORRO CACHÉ", "de": "CACHE-EINSPARUNG" },
  "pv.cacheText":    { "en": "saved by re-using the system prompt across chapters.", "zh-CN": "通过跨章节复用系统提示节省。", "zh-TW": "透過跨章節複用系統提示節省。", "ja": "章をまたいだプロンプト再利用で節約。", "ko": "장 간 프롬프트 재사용으로 절약.", "fr": "économisés en réutilisant l'invite système entre chapitres.", "es": "ahorrados reutilizando el prompt entre capítulos.", "de": "gespart durch Prompt-Wiederverwendung über Kapitel hinweg." },

  // ===== Reader =====
  "rd.suggested":    { "en": "Suggested follow-ups", "zh-CN": "建议追问", "zh-TW": "建議追問", "ja": "おすすめの追加質問", "ko": "추천 후속 질문", "fr": "Suggestions de suivi", "es": "Preguntas sugeridas", "de": "Folgefragen" },
  "common.mentions": { "en": "mentions", "zh-CN": "提及", "zh-TW": "提及", "ja": "言及", "ko": "언급", "fr": "mentions", "es": "menciones", "de": "Erwähnungen" },
  "common.chapters": { "en": "chapters", "zh-CN": "章节", "zh-TW": "章節", "ja": "章", "ko": "장", "fr": "chapitres", "es": "capítulos", "de": "Kapitel" },
  "common.outgoing": { "en": "outgoing", "zh-CN": "出说", "zh-TW": "出說", "ja": "外向", "ko": "발신", "fr": "sortantes", "es": "salientes", "de": "ausgehend" },
  "common.incoming": { "en": "incoming", "zh-CN": "被说", "zh-TW": "被說", "ja": "内向", "ko": "수신", "fr": "entrantes", "es": "entrantes", "de": "eingehend" },
  "common.glucose":  { "en": "glucose",  "zh-CN": "言下", "zh-TW": "言下", "ja": "行間", "ko": "행간", "fr": "implicites", "es": "implícitos", "de": "implizit" },

  // ===== Empty states =====
  "empty.noOutgoing": { "en": "No outgoing claims", "zh-CN": "没有主动关系", "zh-TW": "沒有主動關係", "ja": "発信関係なし", "ko": "발신 관계 없음", "fr": "Aucune relation sortante", "es": "Sin relaciones salientes", "de": "Keine ausgehenden Beziehungen" },
  "empty.noIncoming": { "en": "No incoming claims", "zh-CN": "没有被动关系", "zh-TW": "沒有被動關係", "ja": "受信関係なし", "ko": "수신 관계 없음", "fr": "Aucune relation entrante", "es": "Sin relaciones entrantes", "de": "Keine eingehenden Beziehungen" },
  "empty.noGlucose":  { "en": "No implicit facts", "zh-CN": "暂无言下之意", "zh-TW": "暫無言下之意", "ja": "行間なし", "ko": "행간 정보 없음", "fr": "Aucune lecture implicite", "es": "Sin lecturas implícitas", "de": "Keine impliziten Fakten" },
  "empty.noEntity":   { "en": "No entity selected", "zh-CN": "未选中实体", "zh-TW": "未選中實體", "ja": "未選択", "ko": "선택 안 됨", "fr": "Aucune entité sélectionnée", "es": "Sin entidad seleccionada", "de": "Keine Entität ausgewählt" },
  "empty.noEntities": { "en": "No entities match", "zh-CN": "没有匹配的实体", "zh-TW": "沒有符合的實體", "ja": "一致するエンティティなし", "ko": "일치하는 엔티티 없음", "fr": "Aucune entité correspondante", "es": "Sin entidades coincidentes", "de": "Keine passenden Entitäten" },
  "time.minutes":      { "en": "m",  "zh-CN": "分", "zh-TW": "分", "ja": "分", "ko": "분", "fr": "min", "es": "min", "de": "Min" },
  "time.hours":        { "en": "h",  "zh-CN": "时", "zh-TW": "時", "ja": "時", "ko": "시", "fr": "h", "es": "h", "de": "h" },
};

// ===== Per-locale entity glosses (book-specific) =====
// `zh` field on entities is the default Simplified Chinese summary.
// Below: alternate-language summaries for the main P&P entities.
// Falls back to source-language name + zh gloss when not provided.

window.LG_ENTITY_LOCALE = {
  // Elizabeth Bennet
  "e01": {
    "en":    { name: "Elizabeth Bennet", gloss: "The second of the Bennet daughters — witty, independent, the novel's narrative center; moves from prejudice to self-knowledge." },
    "zh-CN": { name: "伊丽莎白·班纳特",  gloss: "班纳特家第二女，机智、独立、有判断力。全书焦点视角；从对 Darcy 的偏见走向自省与爱。" },
    "zh-TW": { name: "伊麗莎白·班內特",  gloss: "班內特家第二女，機智、獨立、有判斷力。全書焦點視角；從對 Darcy 的偏見走向自省與愛。" },
    "ja":    { name: "エリザベス・ベネット", gloss: "ベネット家の次女。機知に富み、独立心が強く、物語の中心。ダーシーへの偏見から自己認識へと変化する。" },
    "ko":    { name: "엘리자베스 베넷", gloss: "베넷가의 둘째 딸 — 재치 있고 독립적이며 소설의 중심 시점. 다아시에 대한 편견에서 자기 인식으로 나아간다." },
    "fr":    { name: "Elizabeth Bennet", gloss: "Deuxième fille Bennet — vive, indépendante, centre narratif. Passe du préjugé à la connaissance de soi." },
    "es":    { name: "Elizabeth Bennet", gloss: "Segunda de las hijas Bennet: aguda, independiente, centro narrativo. Pasa del prejuicio al autoconocimiento." },
    "de":    { name: "Elizabeth Bennet", gloss: "Zweite Tochter der Bennets — geistreich, unabhängig, erzählerisches Zentrum. Vom Vorurteil zur Selbsterkenntnis." },
  },
  "e02": {
    "en":    { name: "Mr. Darcy", gloss: "Master of Pemberley, £10,000 a year. First read as proud and aloof; reshaped after the letter and Pemberley." },
    "zh-CN": { name: "达西先生",   gloss: "Pemberley 庄园主，年收入万英镑。初见时被叙述者眼中视为傲慢；letter 之后形象彻底翻转。" },
    "zh-TW": { name: "達西先生",   gloss: "Pemberley 莊園主，年收入萬英鎊。初見時被敘述者眼中視為傲慢；letter 之後形象徹底翻轉。" },
    "ja":    { name: "ダーシー氏", gloss: "ペンバリーの主、年収一万ポンド。当初は傲慢に映るが、手紙とペンバリー以降、像が一変する。" },
    "ko":    { name: "다아시 씨", gloss: "펨벌리의 주인, 연수입 1만 파운드. 처음에는 거만하게 보이지만, 편지와 펨벌리 이후 인상이 완전히 바뀐다." },
    "fr":    { name: "M. Darcy",  gloss: "Maître de Pemberley, 10 000 £ par an. D'abord perçu comme orgueilleux ; refondé après la lettre et Pemberley." },
    "es":    { name: "Sr. Darcy", gloss: "Dueño de Pemberley, 10.000 £ al año. Visto al principio como soberbio; transformado tras la carta y Pemberley." },
    "de":    { name: "Mr. Darcy", gloss: "Herr von Pemberley, 10 000 £ jährlich. Zunächst hochmütig wirkend; nach Brief und Pemberley neu geformt." },
  },
  "e03": {
    "en":    { name: "Jane Bennet", gloss: "Eldest Bennet, gentle and reserved; her romance with Bingley is the novel's secondary plot." },
    "zh-CN": { name: "简·班纳特",   gloss: "班纳特家长女，温柔、不轻易表达。与 Bingley 的关系是主副线之一。" },
    "zh-TW": { name: "簡·班內特",   gloss: "班內特家長女，溫柔、不輕易表達。與 Bingley 的關係是主副線之一。" },
    "ja":    { name: "ジェーン・ベネット", gloss: "ベネット家の長女。穏やかで内省的。ビングリーとの関係は副プロット。" },
    "ko":    { name: "제인 베넷", gloss: "베넷가의 장녀. 부드럽고 절제된 성격. 빙리와의 관계가 부 플롯이다." },
    "fr":    { name: "Jane Bennet", gloss: "Aînée Bennet, douce et réservée ; son histoire avec Bingley est l'intrigue secondaire." },
    "es":    { name: "Jane Bennet", gloss: "Mayor de las Bennet, dulce y reservada; su historia con Bingley es la trama secundaria." },
    "de":    { name: "Jane Bennet", gloss: "Älteste Bennet, sanft und zurückhaltend; ihre Geschichte mit Bingley ist Nebenhandlung." },
  },
  "e04": {
    "en":    { name: "Mr. Bingley", gloss: "Darcy's friend, who rents Netherfield. Affable and easily swayed by his friend's judgment." },
    "zh-CN": { name: "宾利先生",     gloss: "Darcy 之友，租下 Netherfield Park。性情温厚、易受朋友左右。" },
    "zh-TW": { name: "賓利先生",     gloss: "Darcy 之友，租下 Netherfield Park。性情溫厚、易受朋友左右。" },
    "ja":    { name: "ビングリー氏", gloss: "ダーシーの友人。ネザーフィールドを借りる。温厚で友人の判断に流されやすい。" },
    "ko":    { name: "빙리 씨", gloss: "다아시의 친구. 네더필드를 임대. 다정하지만 친구의 판단에 휘둘리기 쉽다." },
    "fr":    { name: "M. Bingley", gloss: "Ami de Darcy, qui loue Netherfield. Aimable et facilement influencé." },
    "es":    { name: "Sr. Bingley", gloss: "Amigo de Darcy, alquila Netherfield. Afable y fácilmente influenciable." },
    "de":    { name: "Mr. Bingley", gloss: "Darcys Freund, der Netherfield mietet. Freundlich, leicht beeinflussbar." },
  },
  "e07": {
    "en":    { name: "Lydia Bennet", gloss: "Youngest Bennet, fifteen, vain and reckless. Her elopement with Wickham is the novel's structural crisis." },
    "zh-CN": { name: "莉迪亚·班纳特", gloss: "班纳特家最幼女，十五岁；浮浅、冒失。与 Wickham 的私奔事件是全书结构枢纽。" },
    "zh-TW": { name: "莉迪亞·班內特", gloss: "班內特家最幼女，十五歲；浮淺、冒失。與 Wickham 的私奔事件是全書結構樞紐。" },
    "ja":    { name: "リディア・ベネット", gloss: "ベネット家末娘、十五歳。軽薄で無分別。ウィッカムとの駆け落ちが構造的危機を生む。" },
    "ko":    { name: "리디아 베넷", gloss: "베넷가 막내, 열다섯. 경박하고 무분별. 위컴과의 사랑의 도피는 구조적 위기." },
    "fr":    { name: "Lydia Bennet", gloss: "Cadette Bennet, quinze ans, frivole et imprudente. Sa fugue avec Wickham est la crise structurale." },
    "es":    { name: "Lydia Bennet", gloss: "Menor de las Bennet, quince años, vana e imprudente. Su fuga con Wickham es la crisis estructural." },
    "de":    { name: "Lydia Bennet", gloss: "Jüngste Bennet, fünfzehn, eitel und leichtsinnig. Ihre Flucht mit Wickham ist die strukturelle Krise." },
  },
  "e08": {
    "en":    { name: "Mary Bennet", gloss: "Middle Bennet daughter; the bookworm, fond of moral platitudes, with almost no plot role." },
    "zh-CN": { name: "玛丽·班纳特", gloss: "班纳特家中间女，书呆子；偏好朗读箴言，几无 plot 作用。" },
    "zh-TW": { name: "瑪麗·班內特", gloss: "班內特家中間女，書呆子；偏好朗讀箴言，幾無 plot 作用。" },
    "ja":    { name: "メアリー・ベネット", gloss: "ベネット家の中間娘。本ばかりで道徳的格言を好むが、プロットへの関与はほぼない。" },
    "ko":    { name: "메어리 베넷", gloss: "베넷가 가운데 딸. 책벌레이며 잠언을 좋아하지만 플롯 역할은 거의 없다." },
    "fr":    { name: "Mary Bennet", gloss: "Fille médiane Bennet ; rat de bibliothèque aux maximes, presque sans rôle." },
    "es":    { name: "Mary Bennet", gloss: "Hija mediana Bennet; ratón de biblioteca dado a las máximas, casi sin papel." },
    "de":    { name: "Mary Bennet", gloss: "Mittlere Bennet-Tochter; Leseratte mit Vorliebe für Sentenzen, fast ohne Plotfunktion." },
  },
  "e09": {
    "en":    { name: "Kitty Bennet", gloss: "Fourth Bennet daughter; trails Lydia and grows up only after Lydia leaves." },
    "zh-CN": { name: "凯瑟琳·班纳特", gloss: "班纳特家第四女，依附于莉迪亚；莉迪亚走后逐渐成长。" },
    "zh-TW": { name: "凱瑟琳·班內特", gloss: "班內特家第四女，依附於莉迪亞；莉迪亞走後逐漸成長。" },
    "ja":    { name: "キティ・ベネット", gloss: "ベネット家の四女。リディアにつき従い、姉が去った後に成長する。" },
    "ko":    { name: "키티 베넷", gloss: "베넷가 넷째 딸. 리디아를 따르다가 그가 떠난 뒤 조금씩 자란다." },
    "fr":    { name: "Kitty Bennet", gloss: "Quatrième fille Bennet ; suit Lydia et mûrit seulement après son départ." },
    "es":    { name: "Kitty Bennet", gloss: "Cuarta hija Bennet; sigue a Lydia y madura tras su partida." },
    "de":    { name: "Kitty Bennet", gloss: "Vierte Bennet-Tochter; folgt Lydia und reift erst nach deren Abgang." },
  },
  "e14": {
    "en":    { name: "Caroline Bingley", gloss: "Bingley's sister; tries to marry Darcy and undermines Jane. The novel's social antagonist." },
    "zh-CN": { name: "卡罗琳·宾利", gloss: "宾利的妹妹，企图嫁给达西并阻挠简；反派 archetype。" },
    "zh-TW": { name: "卡羅琳·賓利", gloss: "賓利的妹妹，企圖嫁給達西並阻撓簡；反派 archetype。" },
    "ja":    { name: "キャロライン・ビングリー", gloss: "ビングリーの妹。ダーシーとの結婚を機め、ジェーンを妨害しようとする。" },
    "ko":    { name: "캐롤라인 빙리", gloss: "빙리의 여동생. 다아시와의 결혼을 노리며 제인을 방해한다." },
    "fr":    { name: "Caroline Bingley", gloss: "Sœur de Bingley ; cherche à épouser Darcy et nuit à Jane. Antagoniste mondaine." },
    "es":    { name: "Caroline Bingley", gloss: "Hermana de Bingley; busca casarse con Darcy y socava a Jane." },
    "de":    { name: "Caroline Bingley", gloss: "Bingleys Schwester; will Darcy heiraten und untergräbt Jane." },
  },
  "e15": {
    "en":    { name: "Georgiana Darcy", gloss: "Darcy's sixteen-year-old sister, shy. Wickham once tried to elope with her." },
    "zh-CN": { name: "乔治安娜·达西", gloss: "达西的妹妹，十六岁；性情害羞。韦克翰曾企图诱拐她（信件揭示）。" },
    "zh-TW": { name: "喬治安娜·達西", gloss: "達西的妹妹，十六歲；性情害羞。韋克翰曾企圖誘拐她（信件揭示）。" },
    "ja":    { name: "ジョージアナ・ダーシー", gloss: "ダーシーの妹、十六歳で内気。以前ウィッカムが駆け落ちを企んだ（手紙で明かされる）。" },
    "ko":    { name: "조지아나 다아시", gloss: "다아시의 여동생, 열여섯 살. 수줍어하며 위컴이 잠시 사랑의 도피를 시도한 적이 있다." },
    "fr":    { name: "Georgiana Darcy", gloss: "Sœur de Darcy, seize ans, timide. Wickham tenta jadis de l'enlever." },
    "es":    { name: "Georgiana Darcy", gloss: "Hermana de Darcy, dieciséis años, tímida. Wickham intentó raptarla." },
    "de":    { name: "Georgiana Darcy", gloss: "Darcys sechzehnjährige Schwester, schüchtern. Wickham versuchte einst sie zu entführen." },
  },
  "e16": {
    "en":    { name: "Mr. Gardiner", gloss: "Mrs. Bennet's brother, a London tradesman; the trip he leads brings Elizabeth back to Pemberley." },
    "zh-CN": { name: "嘉丁纳先生", gloss: "班纳特太太的弟弟，伦敦商人；与妻子带伊丽莎白游历，间接促成潘伯里重逢。" },
    "zh-TW": { name: "嘉丁納先生", gloss: "班內特太太的弟弟，倫敦商人；與妻子帶伊麗莎白遊歷，間接促成潘伯里重逢。" },
    "ja":    { name: "ガーディナー氏", gloss: "ベネット夫人の弟、ロンドンの商人。エリザベスを連れて旅し、ペンバリーでの再会につながる。" },
    "ko":    { name: "가디너 씨", gloss: "베넷 부인의 남동생으로 런던 상인. 아내와 함께 엘리자베스를 여행시켜 펨벌리에서의 재회를 이끈다." },
    "fr":    { name: "M. Gardiner", gloss: "Frère de Mme Bennet, négociant londonien ; emmène Elizabeth en voyage jusqu'à Pemberley." },
    "es":    { name: "Sr. Gardiner", gloss: "Hermano de la Sra. Bennet, comerciante de Londres; lleva a Elizabeth a Pemberley." },
    "de":    { name: "Mr. Gardiner", gloss: "Mrs. Bennets Bruder, Londoner Kaufmann; nimmt Elizabeth mit auf eine Reise bis Pemberley." },
  },
  "e17": {
    "en":    { name: "Mrs. Gardiner", gloss: "Elizabeth's aunt and moral guide; heroine of the Pemberley trip; later reveals Darcy's role in saving Lydia." },
    "zh-CN": { name: "嘉丁纳太太", gloss: "伊丽莎白的姨母与精神导师；潘伯里之行的女主角；后期书信揭示达西暗中救场。" },
    "zh-TW": { name: "嘉丁納太太", gloss: "伊麗莎白的姨母與精神導師；潘伯里之行的女主角；後期書信揭示達西暗中救場。" },
    "ja":    { name: "ガーディナー夫人", gloss: "エリザベスの叔母で精神的師。ペンバリー旅行の主人公。後にダーシーの隠れた働きを明かす。" },
    "ko":    { name: "가디너 부인", gloss: "엘리자베스의 이모이자 정신적 스승. 펨벌리 여행의 주인공이며 다아시의 숨은 역할을 편지로 알린다." },
    "fr":    { name: "Mme Gardiner", gloss: "Tante et mentor moral d'Elizabeth ; héroïne du voyage à Pemberley ; révèle plus tard le rôle de Darcy." },
    "es":    { name: "Sra. Gardiner", gloss: "Tía y guía moral de Elizabeth; heroína del viaje a Pemberley; revela el papel de Darcy." },
    "de":    { name: "Mrs. Gardiner", gloss: "Elizabeths Tante und moralische Wegweiserin; Heldin der Pemberley-Reise; enthüllt später Darcys Rolle." },
  },
  "e18": {
    "en":    { name: "Colonel Fitzwilliam", gloss: "Darcy's cousin; lets slip at Rosings that Darcy parted Jane and Bingley — triggering Elizabeth's refusal." },
    "zh-CN": { name: "费茨威廉上校", gloss: "达西的表兄；在罗辛斯偶然透露达西拆散简与宾利的事，触发伊丽莎白拒婚。" },
    "zh-TW": { name: "費茨威廉上校", gloss: "達西的表兄；在羅辛斯偶然透露達西拆散簡與賓利的事，觸發伊麗莎白拒婚。" },
    "ja":    { name: "フィツウィリアム大佐", gloss: "ダーシーの従兄。ロージングスでダーシーがジェーンとビングリーを引き離したことを口を滑らせ、エリザベスの拒否を誘発する。" },
    "ko":    { name: "피츠윌리엄 대령", gloss: "다아시의 사촌. 로징스에서 다아시가 제인과 빙리를 떼어놓은 사실을 흘려 엘리자베스의 거절을 촉발한다." },
    "fr":    { name: "Colonel Fitzwilliam", gloss: "Cousin de Darcy ; laisse échapper à Rosings que Darcy a séparé Jane et Bingley." },
    "es":    { name: "Coronel Fitzwilliam", gloss: "Primo de Darcy; revela en Rosings que Darcy separó a Jane y Bingley." },
    "de":    { name: "Colonel Fitzwilliam", gloss: "Darcys Cousin; verrät in Rosings, dass Darcy Jane und Bingley trennte." },
  },
  "e10": {
    "en":    { name: "Mr. Wickham", gloss: "Militia officer whose charm hides gambling debts and predation. Tried to abduct Georgiana before pursuing Lydia." },
    "zh-CN": { name: "韦克翰先生", gloss: "民兵团军官，魅力外表掩盖赌债与丑闻。诱拐 Lydia 是其多次企图之一。" },
    "zh-TW": { name: "韋克翰先生", gloss: "民兵團軍官，魅力外表掩蓋賭債與醜聞。誘拐 Lydia 是其多次企圖之一。" },
    "ja":    { name: "ウィッカム氏", gloss: "民兵将校。魅力の裏に賭博と捕食。ジョージアナ誘拐未遂を経てリディアに迫る。" },
    "ko":    { name: "위컴 씨", gloss: "민병대 장교. 매력 뒤에 도박빚과 약탈. 조지아나 납치 미수 후 리디아에게 접근." },
    "fr":    { name: "M. Wickham", gloss: "Officier de milice. Le charme masque dettes et prédation. Avait tenté d'enlever Georgiana avant Lydia." },
    "es":    { name: "Sr. Wickham", gloss: "Oficial de la milicia. Su encanto esconde deudas y depredación. Intentó raptar a Georgiana antes que a Lydia." },
    "de":    { name: "Mr. Wickham", gloss: "Milizoffizier. Charme verbirgt Spielschulden und Übergriffigkeit. Versuchte zuvor Georgiana zu entführen." },
  },
  "e11": {
    "en":    { name: "Mr. Collins", gloss: "Mr. Bennet's distant cousin, the entailed heir of Longbourn. Clergyman; obsequious to Lady Catherine." },
    "zh-CN": { name: "柯林斯先生", gloss: "Mr. Bennet 的远房表弟，Longbourn 限定继承人；牧师；屈从于 Lady Catherine。" },
    "zh-TW": { name: "柯林斯先生", gloss: "Mr. Bennet 的遠房表弟，Longbourn 限定繼承人；牧師；屈從於 Lady Catherine。" },
    "ja":    { name: "コリンズ氏", gloss: "ベネット氏の遠縁。ロングボーンの限定相続人。聖職者。レディ・キャサリンに屈従する。" },
    "ko":    { name: "콜린스 씨", gloss: "베넷 씨의 먼 사촌, 롱본의 한정 상속인. 성직자, 캐서린 부인에게 굴종." },
    "fr":    { name: "M. Collins", gloss: "Cousin éloigné de M. Bennet, héritier substitué de Longbourn. Pasteur, servile envers Lady Catherine." },
    "es":    { name: "Sr. Collins", gloss: "Primo lejano del Sr. Bennet, heredero por vínculo. Clérigo, servil con Lady Catherine." },
    "de":    { name: "Mr. Collins", gloss: "Entfernter Cousin von Mr. Bennet, Fideikommiss-Erbe von Longbourn. Pfarrer, unterwürfig gegenüber Lady Catherine." },
  },
  "e12": {
    "en":    { name: "Lady Catherine de Bourgh", gloss: "Darcy's aunt, mistress of Rosings Park. Authoritarian; expects Darcy to marry her daughter." },
    "zh-CN": { name: "凯瑟琳·德·包尔夫人", gloss: "Darcy 的姨母，Rosings Park 庄园主；专横，期望 Darcy 与女儿联姻。" },
    "zh-TW": { name: "凱瑟琳·德·包爾夫人", gloss: "Darcy 的姨母，Rosings Park 莊園主；專橫，期望 Darcy 與女兒聯姻。" },
    "ja":    { name: "キャサリン・ド・バーグ夫人", gloss: "ダーシーの叔母、ロージングス・パークの主。専制的で、娘との結婚を望む。" },
    "ko":    { name: "캐서린 드 버그 부인", gloss: "다아시의 이모, 로징스 파크의 안주인. 권위적이며 자기 딸과의 결혼을 기대한다." },
    "fr":    { name: "Lady Catherine de Bourgh", gloss: "Tante de Darcy, maîtresse de Rosings. Autoritaire, espère le marier à sa fille." },
    "es":    { name: "Lady Catherine de Bourgh", gloss: "Tía de Darcy, señora de Rosings. Autoritaria; espera que Darcy se case con su hija." },
    "de":    { name: "Lady Catherine de Bourgh", gloss: "Darcys Tante, Herrin von Rosings. Autoritär; will Darcy mit ihrer Tochter verheiraten." },
  },
  "e13": {
    "en":    { name: "Charlotte Lucas", gloss: "Elizabeth's friend, twenty-seven and unmarried. Accepts Collins for pragmatic reasons — a counter-model to Elizabeth." },
    "zh-CN": { name: "夏洛特·卢卡斯", gloss: "Elizabeth 挚友；27 岁未嫁，务实接受 Collins 的求婚。婚姻观与 Elizabeth 形成对照。" },
    "zh-TW": { name: "夏洛特·盧卡斯", gloss: "Elizabeth 摯友；27 歲未嫁，務實接受 Collins 的求婚。婚姻觀與 Elizabeth 形成對照。" },
    "ja":    { name: "シャーロット・ルーカス", gloss: "エリザベスの親友。二十七歳、未婚。実利的にコリンズの求婚を受ける。エリザベスの婚姻観への対照。" },
    "ko":    { name: "샬럿 루카스", gloss: "엘리자베스의 친구. 스물일곱, 미혼. 실용적으로 콜린스의 청혼을 받아들임 — 엘리자베스의 대조항." },
    "fr":    { name: "Charlotte Lucas", gloss: "Amie d'Elizabeth, vingt-sept ans, célibataire. Accepte Collins par pragmatisme — contre-modèle d'Elizabeth." },
    "es":    { name: "Charlotte Lucas", gloss: "Amiga de Elizabeth, veintisiete años, soltera. Acepta a Collins por pragmatismo — contramodelo." },
    "de":    { name: "Charlotte Lucas", gloss: "Elizabeths Freundin, siebenundzwanzig, unverheiratet. Nimmt Collins aus Pragmatismus — Gegenmodell." },
  },
  "e05": {
    "en":    { name: "Mr. Bennet", gloss: "Head of the Bennet family — ironic, withdrawn observer; briefly active after Lydia's flight." },
    "zh-CN": { name: "班纳特先生", gloss: "班纳特家家主，反讽、消极的旁观者；在 Lydia 私奔后短暂行动。" },
    "zh-TW": { name: "班內特先生", gloss: "班內特家家主，反諷、消極的旁觀者；在 Lydia 私奔後短暫行動。" },
    "ja":    { name: "ベネット氏", gloss: "ベネット家の家長。皮肉屋で受動的な観察者。リディアの逃亡後にのみ短く動く。" },
    "ko":    { name: "베넷 씨",   gloss: "베넷가의 가장. 반어적이고 소극적인 관찰자. 리디아의 도주 후에만 잠시 움직인다." },
    "fr":    { name: "M. Bennet", gloss: "Chef de la famille Bennet — observateur ironique, retiré. Brièvement actif après la fugue de Lydia." },
    "es":    { name: "Sr. Bennet", gloss: "Cabeza de los Bennet — observador irónico, retraído. Brevemente activo tras la fuga de Lydia." },
    "de":    { name: "Mr. Bennet", gloss: "Oberhaupt der Bennets — ironischer, zurückgezogener Beobachter. Nur kurz aktiv nach Lydias Flucht." },
  },
  "e06": {
    "en":    { name: "Mrs. Bennet", gloss: "Her life's mission is to marry off five daughters. Nervous, exaggerated — the comic engine of plot." },
    "zh-CN": { name: "班纳特太太",  gloss: "毕生事业是把五个女儿嫁出去。神经、夸张、推动 plot 的喜剧引擎。" },
    "zh-TW": { name: "班內特太太",  gloss: "畢生事業是把五個女兒嫁出去。神經、誇張、推動 plot 的喜劇引擎。" },
    "ja":    { name: "ベネット夫人", gloss: "生涯の使命は五人の娘の結婚。神経質で大げさ、プロットを動かす喜劇的エンジン。" },
    "ko":    { name: "베넷 부인", gloss: "다섯 딸을 시집보내는 것이 평생의 과업. 신경질적이고 과장된, 플롯의 희극적 엔진." },
    "fr":    { name: "Mme Bennet", gloss: "Sa mission : marier ses cinq filles. Nerveuse, exagérée — le moteur comique du roman." },
    "es":    { name: "Sra. Bennet", gloss: "Su misión: casar a sus cinco hijas. Nerviosa, exagerada — motor cómico de la trama." },
    "de":    { name: "Mrs. Bennet", gloss: "Lebensaufgabe: fünf Töchter verheiraten. Nervös, übertrieben — komischer Motor der Handlung." },
  },
  // Objects
  "o01": {
    "en":    { name: "Pemberley", gloss: "Darcy's Derbyshire estate. The site where Elizabeth re-meets him and re-reads his character through architecture and order." },
    "zh-CN": { name: "潘伯里庄园", gloss: "Darcy 的德比郡庄园。第三十几章 Elizabeth 意外造访，是她对 Darcy 重新认识的物理场所。" },
    "zh-TW": { name: "潘伯里莊園", gloss: "Darcy 的德比郡莊園。第三十幾章 Elizabeth 意外造訪，是她對 Darcy 重新認識的物理場所。" },
    "ja":    { name: "ペンバリー", gloss: "ダーシーのダービーシャーの邸宅。エリザベスが偶然訪れ、建築の秩序を通して彼を読み直す場。" },
    "ko":    { name: "펨벌리", gloss: "다아시의 더비셔 영지. 엘리자베스가 우연히 방문하여 건축의 질서로 그를 다시 읽는 장소." },
    "fr":    { name: "Pemberley", gloss: "Domaine de Darcy dans le Derbyshire. Lieu où Elizabeth le redécouvre via l'architecture et l'ordre." },
    "es":    { name: "Pemberley", gloss: "Hacienda de Darcy en Derbyshire. Donde Elizabeth lo redescubre a través de la arquitectura y el orden." },
    "de":    { name: "Pemberley", gloss: "Darcys Anwesen in Derbyshire. Ort, an dem Elizabeth ihn durch Architektur und Ordnung neu liest." },
  },
  "o02": {
    "en":    { name: "Longbourn", gloss: "Bennet family seat in Hertfordshire, entailed away from the daughters to the nearest male relative (Collins)." },
    "zh-CN": { name: "朗博恩", gloss: "班纳特家族在哈福德郡的居所，限定继承给最近的男性亲属（Collins）。" },
    "zh-TW": { name: "朗博恩", gloss: "班內特家族在哈福德郡的居所，限定繼承給最近的男性親屬（Collins）。" },
    "ja":    { name: "ロングボーン", gloss: "ベネット家のハートフォードシャーの邸宅。娘たちには相続できず、最も近い男性親族（コリンズ）に限定継承される。" },
    "ko":    { name: "롱본", gloss: "베넷 가문의 하트퍼드셔 저택. 딸들에게 갈 수 없고 가장 가까운 남자 친척(콜린스)에게 한정 상속된다." },
    "fr":    { name: "Longbourn", gloss: "Siège des Bennet dans le Hertfordshire, substitué aux filles au profit du parent mâle le plus proche (Collins)." },
    "es":    { name: "Longbourn", gloss: "Sede Bennet en Hertfordshire, vinculada al pariente varón más cercano (Collins), no a las hijas." },
    "de":    { name: "Longbourn", gloss: "Bennet-Sitz in Hertfordshire, fideikommissarisch dem nächsten männlichen Verwandten (Collins) zugewiesen." },
  },
  "o05": {
    "en":    { name: "Darcy's letter", gloss: "Long letter Darcy hands Elizabeth the day after his rejected proposal, clearing Wickham and explaining his role with Jane/Bingley. The novel's structural hinge." },
    "zh-CN": { name: "达西的信", gloss: "Darcy 在被拒后第二日交付的长信，澄清 Wickham 真相与 Jane / Bingley 分离的原因。全书结构枢轴。" },
    "zh-TW": { name: "達西的信", gloss: "Darcy 在被拒後第二日交付的長信，澄清 Wickham 真相與 Jane / Bingley 分離的原因。全書結構樞軸。" },
    "ja":    { name: "ダーシーの手紙", gloss: "求婚拒絶の翌日にエリザベスに渡される長文の手紙。ウィッカムの実像と、ジェーン／ビングリー分離の経緯を明かす。物語の構造的蝶番。" },
    "ko":    { name: "다아시의 편지", gloss: "청혼 거절 다음 날 엘리자베스에게 전한 긴 편지. 위컴의 진실과 제인/빙리 분리의 이유를 밝힌다. 소설 구조의 경첩." },
    "fr":    { name: "La lettre de Darcy", gloss: "Longue lettre remise le lendemain du refus. Elle expose la vérité sur Wickham et l'affaire Jane/Bingley. Pivot structural du roman." },
    "es":    { name: "La carta de Darcy", gloss: "Larga carta entregada al día siguiente del rechazo. Aclara la verdad sobre Wickham y el caso Jane/Bingley. Eje estructural." },
    "de":    { name: "Darcys Brief", gloss: "Langer Brief am Tag nach der abgewiesenen Werbung. Klärt Wickham auf und erläutert die Trennung von Jane/Bingley. Strukturelles Scharnier." },
  },
  // Concepts
  "c01": {
    "en":    { name: "pride", gloss: "One of the novel's twin themes. Darcy's class pride is exposed and rewritten across the arc." },
    "zh-CN": { name: "傲慢", gloss: "本书双题之一。Darcy 的阶级傲慢逐步显形与改写。" },
    "zh-TW": { name: "傲慢", gloss: "本書雙題之一。Darcy 的階級傲慢逐步顯形與改寫。" },
    "ja":    { name: "傲慢", gloss: "本書のふたつのテーマの一つ。ダーシーの階級的傲慢が、物語の弧の中で露呈し書き直される。" },
    "ko":    { name: "오만", gloss: "소설 양대 주제의 하나. 다아시의 계급적 오만이 서사 호 안에서 드러나고 다시 쓰여진다." },
    "fr":    { name: "orgueil", gloss: "L'un des deux thèmes-titres. L'orgueil de classe de Darcy se révèle et se transforme au fil du récit." },
    "es":    { name: "orgullo", gloss: "Uno de los dos temas titulares. El orgullo de clase de Darcy se revela y se reescribe en el arco narrativo." },
    "de":    { name: "Stolz", gloss: "Eines der beiden Titelmotive. Darcys Klassenstolz wird im Verlauf entlarvt und umgeschrieben." },
  },
  "c02": {
    "en":    { name: "prejudice", gloss: "Elizabeth's acknowledged prejudice — \"I, who have prided myself on my discernment!\"" },
    "zh-CN": { name: "偏见", gloss: "Elizabeth 自承的偏见，「How despicably have I acted! I, who have prided myself on my discernment!」" },
    "zh-TW": { name: "偏見", gloss: "Elizabeth 自承的偏見，「How despicably have I acted! I, who have prided myself on my discernment!」" },
    "ja":    { name: "偏見", gloss: "エリザベスが自認する偏見。「私は自分の判断力を誇ってきたのに、なんと卑しく振る舞ったことか！」" },
    "ko":    { name: "편견", gloss: "엘리자베스가 인정한 편견. \"내가 분별력을 자랑해 왔건만, 얼마나 비루하게 굴었던가!\"" },
    "fr":    { name: "préjugé", gloss: "Préjugé reconnu d'Elizabeth — « Moi, qui me piquais de discernement ! »" },
    "es":    { name: "prejuicio", gloss: "Prejuicio reconocido de Elizabeth — «¡Yo, que me jactaba de mi discernimiento!»" },
    "de":    { name: "Vorurteil", gloss: "Elizabeths eingestandenes Vorurteil — »Ich, die ich auf meine Urteilskraft stolz war!«" },
  },
  "c03": {
    "en":    { name: "marriage", gloss: "The novel's true world-setting — four contrasting marriage models (Charlotte / Lydia / Jane / Elizabeth) are tested in parallel." },
    "zh-CN": { name: "婚姻", gloss: "本书唯一真正的「世界设定」—— 不同婚姻模型（Charlotte / Lydia / Jane / Elizabeth）相互对照。" },
    "zh-TW": { name: "婚姻", gloss: "本書唯一真正的「世界設定」—— 不同婚姻模型（Charlotte / Lydia / Jane / Elizabeth）相互對照。" },
    "ja":    { name: "結婚", gloss: "本作の真の「世界設定」。シャーロット／リディア／ジェーン／エリザベスという四つの結婚モデルが並行的に検証される。" },
    "ko":    { name: "결혼", gloss: "이 소설의 진짜 \"세계 설정\". 샬럿/리디아/제인/엘리자베스의 네 가지 결혼 모델이 병렬로 검증된다." },
    "fr":    { name: "mariage", gloss: "Vrai « décor » du roman — quatre modèles de mariage (Charlotte/Lydia/Jane/Elizabeth) testés en parallèle." },
    "es":    { name: "matrimonio", gloss: "El verdadero «mundo» de la novela: cuatro modelos de matrimonio (Charlotte/Lydia/Jane/Elizabeth) puestos a prueba en paralelo." },
    "de":    { name: "Ehe", gloss: "Eigentliches »Setting« des Romans — vier kontrastierende Ehemodelle (Charlotte/Lydia/Jane/Elizabeth) werden parallel geprüft." },
  },

  /* ============== P&P newly added entities — 8-lang ============== */
  "e25": {
    "en":    { name: "Mrs. Reynolds",   gloss: "Pemberley's old housekeeper. Has known Darcy since he was four; her testimony to the Gardiners reframes Elizabeth's view of him." },
    "zh-CN": { name: "雷诺兹太太",       gloss: "Pemberley 老管家，自小看着 Darcy 长大；她对游客的盛赞，是 Elizabeth 重读 Darcy 的关键信源。" },
    "zh-TW": { name: "雷諾茲太太",       gloss: "Pemberley 老管家，自小看著 Darcy 長大；她對遊客的盛讚，是 Elizabeth 重讀 Darcy 的關鍵信源。" },
    "ja":    { name: "レノルズ夫人",     gloss: "ペンバリーの古参女中頭。ダーシー四歳の頃から知っており、その証言がエリザベスの見方を覆す。" },
    "ko":    { name: "레이놀즈 부인",    gloss: "펨벌리의 노년 가정부. 다아시를 네 살부터 알아온 인물; 그녀의 증언이 엘리자베스의 시선을 바꾼다." },
    "fr":    { name: "Mme Reynolds",     gloss: "Vieille intendante de Pemberley, connaît Darcy depuis ses quatre ans ; son témoignage refonde l'opinion d'Elizabeth." },
    "es":    { name: "Sra. Reynolds",    gloss: "Vieja ama de llaves de Pemberley; conoce a Darcy desde sus cuatro años; su testimonio rehace la opinión de Elizabeth." },
    "de":    { name: "Mrs. Reynolds",    gloss: "Alte Haushälterin von Pemberley; kennt Darcy seit er vier war — ihr Zeugnis kippt Elizabeths Urteil." },
  },
  "e21": {
    "en":    { name: "Sir William Lucas", gloss: "Master of Lucas Lodge, former mayor of Meryton, newly knighted. Charlotte's father; rigid ceremoniousness." },
    "zh-CN": { name: "威廉·卢卡斯爵士",   gloss: "Lucas Lodge 主人，前 Meryton 镇长，新晋骑士。Charlotte 之父，礼仪刻板。" },
    "zh-TW": { name: "威廉·盧卡斯爵士",   gloss: "Lucas Lodge 主人，前 Meryton 鎮長，新晉騎士。Charlotte 之父，禮儀刻板。" },
    "ja":    { name: "ウィリアム・ルーカス卿", gloss: "ルーカス・ロッジの主人。元メリトンの市長で叙勲を受けたばかり。シャーロットの父で、儀礼を重んじる。" },
    "ko":    { name: "윌리엄 루카스 경",  gloss: "루카스 로지의 주인. 메리튼의 전 시장이며 새로 작위를 받았다. 샬럿의 아버지로 격식을 중시한다." },
    "fr":    { name: "Sir William Lucas", gloss: "Maître de Lucas Lodge, ancien maire de Meryton fraîchement anobli. Père de Charlotte, raideur cérémonieuse." },
    "es":    { name: "Sir William Lucas", gloss: "Dueño de Lucas Lodge, ex-alcalde de Meryton recién nombrado caballero. Padre de Charlotte, ceremonioso." },
    "de":    { name: "Sir William Lucas", gloss: "Herr von Lucas Lodge, ehemaliger Bürgermeister von Meryton, frisch geadelt. Charlottes Vater, sehr förmlich." },
  },
  "o07": {
    "en":    { name: "Meryton",      gloss: "Market town in Hertfordshire; militia quarters. The Bennet sisters' daily social arena." },
    "zh-CN": { name: "梅里顿",        gloss: "Hertfordshire 的市集小镇，民兵团驻地；Bennet 姐妹的日常社交舞台。" },
    "zh-TW": { name: "梅里頓",        gloss: "Hertfordshire 的市集小鎮，民兵團駐地；Bennet 姐妹的日常社交舞台。" },
    "ja":    { name: "メリトン",      gloss: "ハートフォードシャーの市場町。民兵連隊の駐屯地で、ベネット姉妹の日常的な社交舞台。" },
    "ko":    { name: "메리튼",        gloss: "허트퍼드셔의 시장 마을. 민병대의 주둔지이며 베넷 자매들의 일상 사교장." },
    "fr":    { name: "Meryton",      gloss: "Bourg de marché du Hertfordshire ; cantonnement de la milice. Théâtre social quotidien des sœurs Bennet." },
    "es":    { name: "Meryton",      gloss: "Pueblo mercantil de Hertfordshire; acuartelamiento de la milicia. Escenario social diario de las hermanas Bennet." },
    "de":    { name: "Meryton",      gloss: "Marktstadt in Hertfordshire, Garnison der Miliz. Tägliches gesellschaftliches Bühnenbild der Bennet-Schwestern." },
  },
  "v09": {
    "en":    { name: "the Netherfield ball", gloss: "Chapter 18. Mrs. Bennet loudly boasts of Jane's imminent marriage; Darcy overhears — and resolves to remove Bingley from Hertfordshire." },
    "zh-CN": { name: "尼日斐花园舞会",   gloss: "第 18 章。Mrs. Bennet 当众炫耀 Jane 即将嫁给 Bingley，被旁桌的 Darcy 听见 —— 直接导致 Darcy 劝 Bingley 离开 Hertfordshire。" },
    "zh-TW": { name: "尼日斐花園舞會",   gloss: "第 18 章。Mrs. Bennet 當眾炫耀 Jane 即將嫁給 Bingley，被旁桌的 Darcy 聽見 —— 直接導致 Darcy 勸 Bingley 離開 Hertfordshire。" },
    "ja":    { name: "ネザーフィールドの舞踏会", gloss: "第18章。ベネット夫人がジェーンの近い結婚を声高に吹聴し、隣席のダーシーがそれを聞く——彼がビングリーをハートフォードシャーから連れ出す決断の引き金。" },
    "ko":    { name: "네더필드 무도회", gloss: "18장. 베넷 부인이 제인의 임박한 결혼을 큰 소리로 자랑하고, 옆자리의 다아시가 그것을 엿듣는다 — 빙리를 하트퍼드셔에서 빼내는 결정의 직접적 계기." },
    "fr":    { name: "Le bal de Netherfield", gloss: "Chapitre 18. Mme Bennet vante haut et fort le prochain mariage de Jane ; Darcy l'entend — d'où sa résolution d'éloigner Bingley du Hertfordshire." },
    "es":    { name: "El baile de Netherfield", gloss: "Capítulo 18. La Sra. Bennet alardea en voz alta del inminente matrimonio de Jane; Darcy la oye y decide apartar a Bingley de Hertfordshire." },
    "de":    { name: "Der Ball in Netherfield", gloss: "Kapitel 18. Mrs. Bennet prahlt laut mit Janes bevorstehender Ehe; Darcy hört es mit und beschließt, Bingley aus Hertfordshire zu entfernen." },
  },

  /* ============== 百年孤独 — 8-lang for key entities ============== */
  "sa01": {
    "en":    { name: "José Arcadio Buendía",         gloss: "Founder of Macondo. Obsessed with magnets, ice, and alchemy; ends his days tied to a chestnut tree, speaking Latin to himself." },
    "zh-CN": { name: "何塞·阿尔卡蒂奥·布恩迪亚",       gloss: "马孔多创建者；先是炼金术、磁铁与冰的痴迷者，最终被绑于栗子树下度过晚年。家族「头脑超前→孤绝→疯狂」原型的起点。" },
    "zh-TW": { name: "何塞·阿爾卡蒂奧·布恩迪亞",       gloss: "馬孔多創建者；先是煉金術、磁鐵與冰的痴迷者，最終被綁於栗子樹下度過晚年。家族「頭腦超前→孤絕→瘋狂」原型的起點。" },
    "ja":    { name: "ホセ・アルカディオ・ブエンディア", gloss: "マコンドの創建者。磁石・氷・錬金術に取り憑かれ、晩年は栗の木に縛られ、ラテン語を独語して死ぬ。「先駆けゆえの孤独」の原型。" },
    "ko":    { name: "호세 아르카디오 부엔디아",       gloss: "마콘도의 창건자. 자석·얼음·연금술에 빠져 만년에는 밤나무에 묶인 채 라틴어를 중얼거리며 죽는다. \"앞서간 자의 고독\"의 원형." },
    "fr":    { name: "José Arcadio Buendía",         gloss: "Fondateur de Macondo. Obsédé par les aimants, la glace et l'alchimie ; il finit attaché à un châtaignier, parlant latin." },
    "es":    { name: "José Arcadio Buendía",         gloss: "Fundador de Macondo. Obsesionado con imanes, hielo y alquimia; acaba sus días atado a un castaño, hablando solo en latín." },
    "de":    { name: "José Arcadio Buendía",         gloss: "Gründer von Macondo. Besessen von Magneten, Eis und Alchemie; endet an einen Kastanienbaum gefesselt, Latein murmelnd." },
  },
  "sa02": {
    "en":    { name: "Úrsula Iguarán",  gloss: "The matriarch. Outlives five generations; sustains daily order through madness, war, and ruin. Goes blind but pretends not to, navigating by memory and smell." },
    "zh-CN": { name: "乌尔苏拉·伊瓜兰", gloss: "家族基石,活过五代;在丈夫疯狂、儿子缺席、村镇沉沦后仍维系日常秩序。失明后转而靠记忆与气味识人,象征家族「不可见的连续性」。" },
    "zh-TW": { name: "烏爾蘇拉·伊瓜蘭", gloss: "家族基石,活過五代;在丈夫瘋狂、兒子缺席、村鎮沉淪後仍維繫日常秩序。失明後轉而靠記憶與氣味識人,象徵家族「不可見的連續性」。" },
    "ja":    { name: "ウルスラ・イグアラン", gloss: "一族の柱。五世代を生き抜き、夫の狂気、息子たちの不在、町の没落のあいだも日々の秩序を保ち続ける。失明後も気配と記憶で生活を続ける。" },
    "ko":    { name: "우르술라 이과란", gloss: "가문의 기둥. 다섯 세대를 살아남으며 남편의 광기, 아들들의 부재, 마을의 몰락 속에서도 일상의 질서를 지킨다. 실명한 후에도 기억과 냄새로 살아간다." },
    "fr":    { name: "Úrsula Iguarán",  gloss: "La matriarche. Survit à cinq générations ; tient l'ordre quotidien à travers folie, guerres et ruine. Aveugle, elle feint de voir et se guide par mémoire et odeur." },
    "es":    { name: "Úrsula Iguarán",  gloss: "La matriarca. Sobrevive a cinco generaciones; mantiene el orden cotidiano entre locura, guerra y ruina. Ciega, finge no estarlo y se guía por memoria y olfato." },
    "de":    { name: "Úrsula Iguarán",  gloss: "Die Matriarchin. Überlebt fünf Generationen; hält die Alltagsordnung durch Wahn, Krieg und Untergang. Erblindet, gibt sich aber sehend und orientiert sich an Geruch und Erinnerung." },
  },
  "sa04": {
    "en":    { name: "Colonel Aureliano Buendía", gloss: "Silversmith turned Liberal revolutionary; leads 32 uprisings, loses every one, retires to forge tiny gold fishes that he melts and recasts forever." },
    "zh-CN": { name: "奥雷里亚诺·布恩迪亚上校",     gloss: "次子;银匠 → 自由派革命领袖 → 三十二次起义皆败北 → 退回工坊熔造小金鱼,熔掉再造,造好又熔。家族「行动者的孤独」化身。" },
    "zh-TW": { name: "奧雷里亞諾·布恩迪亞上校",     gloss: "次子;銀匠 → 自由派革命領袖 → 三十二次起義皆敗北 → 退回工坊熔造小金魚,熔掉再造,造好又熔。家族「行動者的孤獨」化身。" },
    "ja":    { name: "アウレリャノ・ブエンディア大佐", gloss: "次男。銀細工師から自由派革命の指導者となり、三十二度の蜂起すべてに敗れ、晩年は黄金の小魚を作っては溶かし、また作る——「行動者の孤独」の化身。" },
    "ko":    { name: "아우렐리아노 부엔디아 대령", gloss: "차남. 은세공인에서 자유당 혁명 지도자로, 서른두 번의 봉기에 모두 패한 뒤 작업장에서 작은 황금 물고기를 만들고 녹이기를 끝없이 반복한다 — \"행동하는 자의 고독\"의 원형." },
    "fr":    { name: "Le colonel Aureliano Buendía", gloss: "Orfèvre devenu chef de la révolution libérale ; trente-deux soulèvements, tous perdus. Il finit au foyer, fondant et refondant de petits poissons d'or." },
    "es":    { name: "Coronel Aureliano Buendía", gloss: "De platero a líder revolucionario liberal; pierde sus 32 levantamientos y se retira a su taller a hacer pescaditos de oro que funde una y otra vez." },
    "de":    { name: "Oberst Aureliano Buendía", gloss: "Vom Silberschmied zum liberalen Revolutionsführer; verliert alle 32 Aufstände, zieht sich in die Werkstatt zurück und gießt endlose goldene Fischlein, die er einschmilzt und neu gießt." },
  },
  "sa19": {
    "en":    { name: "Melquíades",      gloss: "The wandering gypsy sage who brings magnets, ice, and alchemy to Macondo — and writes the parchments that pre-record the family's century of fate." },
    "zh-CN": { name: "梅尔基亚德斯",     gloss: "吉卜赛贤者,给马孔多带来磁铁、冰、炼金术与羊皮卷;他写下家族百年命运的密文,等待第六代后人破译。" },
    "zh-TW": { name: "梅爾基亞德斯",     gloss: "吉卜賽賢者,給馬孔多帶來磁鐵、冰、煉金術與羊皮卷;他寫下家族百年命運的密文,等待第六代後人破譯。" },
    "ja":    { name: "メルキアデス",     gloss: "ジプシーの賢者。磁石、氷、錬金術をマコンドにもたらし、一族の百年の運命を暗号で羊皮紙に書き残す——第六代の子孫に解読される日を待って。" },
    "ko":    { name: "멜키아데스",      gloss: "떠돌이 집시 현자. 마콘도에 자석, 얼음, 연금술을 가져오며 가문의 100년 운명을 미리 양피지에 암호로 적어둔다 — 6대 후손이 해독할 날을 기다리며." },
    "fr":    { name: "Melquíades",      gloss: "Le sage gitan qui apporte à Macondo aimants, glace et alchimie — et qui écrit les parchemins préfigurant un siècle entier de la famille." },
    "es":    { name: "Melquíades",      gloss: "El sabio gitano que trae a Macondo imanes, hielo y alquimia — y escribe los pergaminos que prefiguran un siglo entero de la familia." },
    "de":    { name: "Melquíades",      gloss: "Der wandernde Zigeuner-Weise; bringt Magnete, Eis und Alchemie nach Macondo — und schreibt die Pergamente, die ein ganzes Jahrhundert der Familie vorwegnehmen." },
  },
  "sa05": {
    "en":    { name: "Amaranta",        gloss: "Úrsula's daughter. Rejects every suitor; sews her own shroud and announces her death date in advance. The repressed solitude archetype." },
    "zh-CN": { name: "阿玛兰塔",         gloss: "Úrsula 的女儿;与 Rebeca 共争 Pietro Crespi,反复拒绝求婚者,终生未婚;自缝寿衣、自定死期。压抑的孤独原型。" },
    "zh-TW": { name: "阿瑪蘭塔",         gloss: "Úrsula 的女兒;與 Rebeca 共爭 Pietro Crespi,反覆拒絕求婚者,終生未婚;自縫壽衣、自定死期。壓抑的孤獨原型。" },
    "ja":    { name: "アマランタ",       gloss: "ウルスラの娘。求婚をすべて拒み、生涯独身。自ら経帷子を縫い、死ぬ日を予告する——抑圧の孤独の原型。" },
    "ko":    { name: "아마란타",         gloss: "우르술라의 딸. 모든 청혼을 거절하고 평생 결혼하지 않으며, 자기 수의를 손수 짓고 죽을 날을 미리 알린다 — 억압된 고독의 원형." },
    "fr":    { name: "Amaranta",        gloss: "Fille d'Úrsula. Refuse tous ses prétendants, coud elle-même son linceul et annonce sa date de mort. Archétype de la solitude réprimée." },
    "es":    { name: "Amaranta",        gloss: "Hija de Úrsula. Rechaza a todos sus pretendientes; cose su propia mortaja y anuncia con anticipación el día de su muerte. Arquetipo de la soledad reprimida." },
    "de":    { name: "Amaranta",        gloss: "Úrsulas Tochter. Weist jeden Freier ab; näht ihr eigenes Totenhemd und kündigt ihren Sterbetag im Voraus an — Urbild verdrängter Einsamkeit." },
  },
  "sa20": {
    "en":    { name: "Pilar Ternera",   gloss: "Tarot-reader; lover of both first-generation Buendía brothers; mother of Arcadio and Aureliano José. Lives to 140+, watching every sin and remorse pass through the family." },
    "zh-CN": { name: "皮拉尔·特尔内拉",   gloss: "塔罗占卜师、生命与情欲的旁观者;与第一代两兄弟皆生子;活到一百四十多岁,看着家族的所有罪与悔。" },
    "zh-TW": { name: "皮拉爾·特爾內拉",   gloss: "塔羅占卜師、生命與情慾的旁觀者;與第一代兩兄弟皆生子;活到一百四十多歲,看著家族的所有罪與悔。" },
    "ja":    { name: "ピラル・テルネラ",  gloss: "タロット占い師。第一世代の兄弟両方と子をなし、百四十歳を超えて生き、一族の罪と悔いをすべて見送る。" },
    "ko":    { name: "필라르 테르네라", gloss: "타로 점술가. 1세대 두 형제 모두와의 사이에서 자녀를 두며 140세를 넘기도록 살아 가문의 모든 죄와 후회를 지켜본다." },
    "fr":    { name: "Pilar Ternera",   gloss: "Cartomancienne ; amante des deux frères de la première génération ; mère d'Arcadio et d'Aureliano José. Vit plus de cent quarante ans et voit passer tous les péchés et remords de la famille." },
    "es":    { name: "Pilar Ternera",   gloss: "Echadora de cartas; amante de los dos hermanos de la primera generación; madre de Arcadio y de Aureliano José. Vive más de 140 años, viéndolo todo." },
    "de":    { name: "Pilar Ternera",   gloss: "Kartenlegerin; Geliebte beider Brüder der ersten Generation; Mutter von Arcadio und Aureliano José. Wird über 140 Jahre alt und sieht jede Sünde und Reue der Familie." },
  },
  "sa12": {
    "en":    { name: "Fernanda del Carpio", gloss: "Devout highland aristocrat who marries Aureliano Segundo and imposes old-world order on Macondo — pushing what remains of the family into its deepest solitude." },
    "zh-CN": { name: "费尔南达·德尔卡皮奥", gloss: "高地贵族出身的虔诚妻子;与 Aureliano Segundo 结婚后将旧贵族秩序强加于马孔多;最终把家族残余推入彻底的孤绝。" },
    "zh-TW": { name: "費爾南達·德爾卡皮奧", gloss: "高地貴族出身的虔誠妻子;與 Aureliano Segundo 結婚後將舊貴族秩序強加於馬孔多;最終把家族殘餘推入徹底的孤絕。" },
    "ja":    { name: "フェルナンダ・デル・カルピオ", gloss: "高地の貴族出身の敬虔な妻。アウレリャノ第二と結婚し、旧来の秩序をマコンドに持ち込み、家族をさらに深い孤独へと追いやる。" },
    "ko":    { name: "페르난다 델 카르피오", gloss: "고지의 귀족 출신 독실한 아내. 아우렐리아노 세군도와 결혼해 옛 질서를 마콘도에 강요하며 가문을 더 깊은 고독으로 몰아넣는다." },
    "fr":    { name: "Fernanda del Carpio", gloss: "Aristocrate dévote des hauts plateaux ; épouse d'Aureliano Segundo, elle impose à Macondo l'ordre ancien et pousse ce qui reste de la famille dans la solitude la plus profonde." },
    "es":    { name: "Fernanda del Carpio", gloss: "Aristócrata devota del altiplano; se casa con Aureliano Segundo e impone a Macondo el orden antiguo, hundiendo lo que queda de la familia en la soledad más honda." },
    "de":    { name: "Fernanda del Carpio", gloss: "Fromme Hochland-Adlige; heiratet Aureliano Segundo und zwingt Macondo die alte Ordnung auf — was vom Geschlecht bleibt, fällt damit in die tiefste Einsamkeit." },
  },
  "sa16": {
    "en":    { name: "Aureliano Babilonia", gloss: "Meme's hidden son. Spends his life deciphering Melquíades's parchments — until in the final solitude after Amaranta Úrsula's death he reads the last line as Macondo is erased." },
    "zh-CN": { name: "奥雷里亚诺·巴比伦",   gloss: "Meme 与 Mauricio 私生子;被 Fernanda 隐瞒身世藏匿;终生破译 Melquíades 羊皮卷;与姨母 Amaranta Úrsula 相恋并生下家族最后一子。" },
    "zh-TW": { name: "奧雷里亞諾·巴比倫",   gloss: "Meme 與 Mauricio 私生子;被 Fernanda 隱瞞身世藏匿;終生破譯 Melquíades 羊皮卷;與姨母 Amaranta Úrsula 相戀並生下家族最後一子。" },
    "ja":    { name: "アウレリャノ・バビロニア", gloss: "メメとマウリシオの隠された息子。生涯をメルキアデスの羊皮紙の解読に捧げ、アマランタ・ウルスラの死後の極限の孤独で最後の一行を読み終える——その瞬間にマコンドは消える。" },
    "ko":    { name: "아우렐리아노 바빌로니아", gloss: "메메와 마우리시오의 숨겨진 아들. 평생 멜키아데스의 양피지를 해독하다가, 아마란타 우르술라의 죽음 뒤의 극한 고독 속에서 마지막 줄을 읽는다 — 그 순간 마콘도가 사라진다." },
    "fr":    { name: "Aureliano Babilonia",  gloss: "Fils caché de Meme. Passe sa vie à déchiffrer les parchemins de Melquíades — jusqu'au jour où, dans la solitude qui suit la mort d'Amaranta Úrsula, il lit la dernière ligne tandis que Macondo s'efface." },
    "es":    { name: "Aureliano Babilonia",  gloss: "Hijo oculto de Meme. Dedica su vida a descifrar los pergaminos de Melquíades; en la soledad última, tras la muerte de Amaranta Úrsula, lee la última línea mientras Macondo se borra del mundo." },
    "de":    { name: "Aureliano Babilonia",  gloss: "Memes verschwiegener Sohn. Verbringt sein Leben damit, Melquíades' Pergamente zu entziffern — bis er in der endgültigen Einsamkeit nach Amaranta Úrsulas Tod die letzte Zeile liest, während Macondo vom Wind ausgelöscht wird." },
  },
  "so01": {
    "en":    { name: "Macondo",      gloss: "The village founded by José Arcadio Buendía at the edge of the jungle; mirror-city utopia turned banana-company town turned ghost of itself, finally erased by a single decreed wind." },
    "zh-CN": { name: "马孔多",        gloss: "丛林深处由 José Arcadio Buendía 建立的村庄;从乌托邦的镜城走向铁路、香蕉公司、屠杀、雨灾、风沙吞没的终局。" },
    "zh-TW": { name: "馬孔多",        gloss: "叢林深處由 José Arcadio Buendía 建立的村莊;從烏托邦的鏡城走向鐵路、香蕉公司、屠殺、雨災、風沙吞沒的終局。" },
    "ja":    { name: "マコンド",      gloss: "ホセ・アルカディオ・ブエンディアが密林の縁に築いた村。鏡の街のユートピアから、鉄道、バナナ会社、虐殺、雨災を経て、一陣の風で地図から消える。" },
    "ko":    { name: "마콘도",        gloss: "호세 아르카디오 부엔디아가 정글 가장자리에 세운 마을. 거울의 유토피아에서 철도·바나나 회사·학살·홍수를 거쳐, 미리 정해진 바람 한 번에 지도에서 지워진다." },
    "fr":    { name: "Macondo",      gloss: "Village fondé par José Arcadio Buendía à la lisière de la jungle ; cité-miroir, puis ville bananière, puis ruine, enfin effacée par un vent annoncé d'avance." },
    "es":    { name: "Macondo",      gloss: "Pueblo fundado por José Arcadio Buendía al borde de la selva. De ciudad-espejo utópica a pueblo bananero a sombra de sí mismo; al final, un viento previsto lo borra del mapa." },
    "de":    { name: "Macondo",      gloss: "Von José Arcadio Buendía am Rand des Urwalds gegründetes Dorf. Aus der spiegelnden Utopie wird eine Bananen-Company-Stadt, dann Ruine, schließlich vom angekündigten Wind ausgelöscht." },
  },
  "so04": {
    "en":    { name: "Melquíades's parchments", gloss: "Manuscripts written a hundred years in advance, encoding the family's entire history. Aureliano Babilonia reads the last line in the same instant Macondo is erased." },
    "zh-CN": { name: "梅尔基亚德斯的羊皮卷", gloss: "提前一百年写好的家族命运密文;Aureliano Babilonia 终于读出最后一行的同一刻,马孔多被风沙抹去。" },
    "zh-TW": { name: "梅爾基亞德斯的羊皮卷", gloss: "提前一百年寫好的家族命運密文;Aureliano Babilonia 終於讀出最後一行的同一刻,馬孔多被風沙抹去。" },
    "ja":    { name: "メルキアデスの羊皮紙", gloss: "一族の運命を百年先に書き残した暗号文書。アウレリャノ・バビロニアが最後の一行を読んだ瞬間、マコンドは砂に消える。" },
    "ko":    { name: "멜키아데스의 양피지",  gloss: "가문의 운명을 백 년 앞서 적어둔 암호 문서. 아우렐리아노 바빌로니아가 마지막 줄을 읽는 순간 마콘도가 모래바람에 사라진다." },
    "fr":    { name: "Les parchemins de Melquíades", gloss: "Manuscrits écrits cent ans à l'avance ; ils encodent toute l'histoire de la famille. Aureliano Babilonia lit la dernière ligne à l'instant même où Macondo est effacé." },
    "es":    { name: "Los pergaminos de Melquíades", gloss: "Manuscritos escritos con cien años de antelación; encierran cifrada toda la historia de la familia. Aureliano Babilonia lee la última línea en el instante en que Macondo se borra." },
    "de":    { name: "Die Pergamente des Melquíades", gloss: "Hundert Jahre im Voraus geschriebene Manuskripte mit der gesamten Familiengeschichte in Geheimschrift. Aureliano Babilonia liest die letzte Zeile in dem Moment, in dem Macondo verschwindet." },
  },
  "sv05": {
    "en":    { name: "The banana workers' massacre", gloss: "Three thousand strikers are mowed down in the station square and carried off by trainloads to the sea. The next day the whole town is told 'nothing happened here.'" },
    "zh-CN": { name: "香蕉工人大屠杀",   gloss: "三千多名罢工工人在车站广场被机枪扫射;尸体由火车运入大海。次日全马孔多被官方告知「什么也没发生」。" },
    "zh-TW": { name: "香蕉工人大屠殺",   gloss: "三千多名罷工工人在車站廣場被機槍掃射;屍體由火車運入大海。次日全馬孔多被官方告知「什麼也沒發生」。" },
    "ja":    { name: "バナナ労働者の虐殺", gloss: "駅前広場で三千余名のストライキ参加者が機関銃で薙ぎ倒され、列車で海まで運ばれる。翌日マコンド中に「ここでは何も起きていない」と告げられる。" },
    "ko":    { name: "바나나 노동자 학살", gloss: "역 광장에서 파업자 3천여 명이 기관총에 쓰러지고 시신은 열차로 바다까지 실려 간다. 다음 날 온 마콘도가 \"이곳에선 아무 일도 일어나지 않았다\"는 말을 듣는다." },
    "fr":    { name: "Le massacre des bananeraies", gloss: "Trois mille grévistes fauchés à la mitrailleuse sur la place de la gare et emportés à la mer par convois entiers. Le lendemain, on dit à la ville qu'« il ne s'est rien passé ici »." },
    "es":    { name: "La masacre de los trabajadores del banano", gloss: "Más de tres mil huelguistas son ametrallados en la plaza de la estación y enviados al mar en vagones. Al día siguiente, a todo Macondo se le dice que «aquí no pasó nada»." },
    "de":    { name: "Das Massaker an den Bananenarbeitern", gloss: "Über dreitausend Streikende werden auf dem Bahnhofsvorplatz niedergemäht und in Zügen ans Meer geschafft. Am nächsten Morgen heißt es in ganz Macondo: »Hier ist nichts passiert.«" },
  },
  "sc01": {
    "en":    { name: "solitude",    gloss: "The book's organizing experience: each Buendía has their own form of solitude — the founder's, the colonel's, Amaranta's, Úrsula's — and every one of them dies inside an interior that cannot be shared." },
    "zh-CN": { name: "孤独",         gloss: "全书核心:每一代 Buendía 各有不同的孤独形态,最终都在同一种「无法被分享的内在」中走向死亡或沉默。" },
    "zh-TW": { name: "孤獨",         gloss: "全書核心:每一代 Buendía 各有不同的孤獨形態,最終都在同一種「無法被分享的內在」中走向死亡或沉默。" },
    "ja":    { name: "孤独",         gloss: "作品の根本的経験。世代ごとに違う孤独——創設者の、大佐の、アマランタの、ウルスラの——があり、誰もが他人と分かちあえぬ内側で死ぬ。" },
    "ko":    { name: "고독",         gloss: "이 소설의 중심 경험. 부엔디아 가문 각자에게 고유한 고독이 있으며 — 창건자의, 대령의, 아마란타의, 우르술라의 — 누구도 누구와도 나눌 수 없는 안쪽에서 죽음을 맞는다." },
    "fr":    { name: "solitude",    gloss: "L'expérience centrale du livre : chaque Buendía a sa propre solitude — celle du fondateur, du colonel, d'Amaranta, d'Úrsula — et tous meurent dans un intérieur qui ne peut être partagé." },
    "es":    { name: "soledad",     gloss: "La experiencia que organiza el libro: cada Buendía tiene una soledad distinta — la del fundador, la del coronel, la de Amaranta, la de Úrsula — y todos mueren dentro de un interior que no puede compartirse." },
    "de":    { name: "Einsamkeit",  gloss: "Das organisierende Erlebnis des Buchs: Jeder Buendía hat seine eigene Einsamkeit — die des Gründers, des Obersten, Amarantas, Úrsulas — und jeder stirbt in einem Inneren, das nicht zu teilen ist." },
  },
};

// ===== Pipeline stages (friendly names) =====
window.LG_STAGES = [
  { n: 1, key: "segment",   en: "Segment chapters",         "zh-CN": "切分章节",       "zh-TW": "切分章節",       "ja": "章を分割",            "ko": "장 분할",         "fr": "Segmenter chapitres",  "es": "Segmentar capítulos",  "de": "Kapitel teilen",
    sub: { en: "Splits the book into reading-sized windows so the AI can hold one passage at a time.", "zh-CN": "把全书切成可读窗口，便于 AI 逐段分析。", "zh-TW": "把全書切成可讀窗口，便於 AI 逐段分析。", "ja": "本を読める単位に分割し、一節ずつ扱えるようにします。", "ko": "책을 읽을 만한 단위로 나누어 한 번에 한 단락씩 처리합니다.", "fr": "Découpe le livre en fenêtres lisibles, une à la fois.", "es": "Divide el libro en ventanas legibles, una a la vez.", "de": "Zerlegt das Buch in lesbare Abschnitte." } },
  { n: 2, key: "identify",  en: "Identify cast & things",   "zh-CN": "识别角色与场景", "zh-TW": "識別角色與場景", "ja": "登場と場面の識別",     "ko": "등장 인물·사물 식별","fr": "Identifier personnages & lieux", "es": "Identificar personajes y cosas", "de": "Personen und Dinge erkennen",
    sub: { en: "Spots every name, object, event, and concept — with a quote next to each so nothing is hallucinated.", "zh-CN": "找出每一个人名、物件、事件与概念，并附上原文引用。", "zh-TW": "找出每一個人名、物件、事件與概念，並附上原文引用。", "ja": "登場するすべての名・物・事件・概念を、原文引用とともに抽出。", "ko": "모든 이름·사물·사건·개념을 원문 인용과 함께 추출.", "fr": "Détecte chaque nom, objet, événement, concept — avec citation.", "es": "Detecta cada nombre, objeto, evento y concepto — con cita.", "de": "Findet jeden Namen, jedes Objekt, Ereignis, Konzept – mit Zitat." } },
  { n: 3, key: "merge",     en: "Merge aliases",            "zh-CN": "归并别名",       "zh-TW": "歸併別名",       "ja": "別名の統合",          "ko": "별칭 통합",       "fr": "Fusionner les alias",  "es": "Unificar alias",       "de": "Aliase zusammenführen",
    sub: { en: "Realizes \"Lizzy\", \"Eliza\" and \"Miss Bennet\" all refer to the same person.", "zh-CN": "认出「Lizzy」「Eliza」「Miss Bennet」其实是同一人。", "zh-TW": "認出「Lizzy」「Eliza」「Miss Bennet」其實是同一人。", "ja": "「Lizzy」「Eliza」「Miss Bennet」が同一人物だと認識します。", "ko": "「Lizzy」「Eliza」「Miss Bennet」이 같은 인물임을 알아냅니다.", "fr": "Reconnaît que « Lizzy », « Eliza » et « Miss Bennet » désignent la même personne.", "es": "Reconoce que «Lizzy», «Eliza» y «Miss Bennet» son la misma persona.", "de": "Erkennt, dass „Lizzy“, „Eliza“ und „Miss Bennet“ dieselbe Person sind." } },
  { n: 4, key: "resolve",   en: "Resolve she/he/they",      "zh-CN": "代词归位",       "zh-TW": "代詞歸位",       "ja": "代名詞の解決",        "ko": "대명사 해결",     "fr": "Résoudre les pronoms", "es": "Resolver pronombres",  "de": "Pronomen auflösen",
    sub: { en: "Pins each \"she\" and \"he\" back to a real character.", "zh-CN": "把每个「她」「他」对应回真实角色。", "zh-TW": "把每個「她」「他」對應回真實角色。", "ja": "「彼女」「彼」が誰を指すかを特定します。", "ko": "각 \"그녀\" \"그\"가 누구를 가리키는지 확정합니다.", "fr": "Rattache chaque « elle » et « il » à un personnage réel.", "es": "Ata cada «ella» y «él» a un personaje real.", "de": "Bindet jedes „sie/er“ an eine konkrete Figur." } },
  { n: 5, key: "relate",    en: "Map relationships",        "zh-CN": "建立关系图",     "zh-TW": "建立關係圖",     "ja": "関係性の構築",        "ko": "관계 구성",       "fr": "Cartographier les liens","es": "Mapear las relaciones","de": "Beziehungen kartieren",
    sub: { en: "Draws the actual edges: who interacts with whom, what symbolizes what, what predicts what.", "zh-CN": "画出真正的关系：谁与谁互动、什么象征什么、什么预示什么。", "zh-TW": "畫出真正的關係：誰與誰互動、什麼象徵什麼、什麼預示什麼。", "ja": "実際の関係を描く：誰が誰と交わり、何が何を象徴し、何が何を予示するか。", "ko": "실제 관계를 그립니다: 누가 누구와 교류하고, 무엇이 무엇을 상징하며 예고하는가.", "fr": "Trace les vrais liens : qui interagit, ce qui symbolise, ce qui annonce.", "es": "Dibuja los vínculos reales: quién interactúa, qué simboliza, qué predice.", "de": "Zeichnet die echten Verbindungen: wer mit wem, was symbolisiert, was vorausdeutet." } },
  { n: 6, key: "imply",     en: "Read between the lines",   "zh-CN": "推断言下之意",   "zh-TW": "推斷言下之意",   "ja": "行間を読む",          "ko": "행간 읽기",       "fr": "Lire entre les lignes","es": "Leer entre líneas",    "de": "Zwischen den Zeilen lesen",
    sub: { en: "Infers the unspoken: how a character feels, what they possess, where they end up — with footnotes.", "zh-CN": "推断未言明的：角色的情绪、所属、最终位置 —— 都附脚注。", "zh-TW": "推斷未言明的：角色的情緒、所屬、最終位置 —— 都附腳註。", "ja": "明示されないもの——感情・所有・最終地——を脚注付きで推論します。", "ko": "명시되지 않은 것 — 감정·소유·도달지 — 을 각주와 함께 추론합니다.", "fr": "Déduit le non-dit : émotion, possession, destination — avec notes.", "es": "Infiere lo no dicho: emoción, posesión, destino — con notas.", "de": "Erschließt das Ungesagte — Gefühl, Besitz, Verbleib — mit Fußnoten." } },
  { n: 7, key: "verify",    en: "Cross-check with source",  "zh-CN": "原文核验",       "zh-TW": "原文核驗",       "ja": "原文との突き合わせ", "ko": "원문 대조",       "fr": "Recouper avec la source","es": "Cotejar con la fuente","de": "Mit dem Original abgleichen",
    sub: { en: "Every claim must trace back to a literal line in the book. If it doesn't, it's thrown out.", "zh-CN": "每条主张都必须能在书里找到原文。找不到的丢掉。", "zh-TW": "每條主張都必須能在書裡找到原文。找不到的丟掉。", "ja": "すべての主張は本文中の一文に紐づく必要があり、紐づかなければ捨てます。", "ko": "모든 주장은 본문 한 줄에 묶여야 하며, 묶이지 않으면 폐기.", "fr": "Toute affirmation doit pointer vers une ligne réelle ; sinon elle est rejetée.", "es": "Toda afirmación debe apuntar a una línea real; si no, se descarta.", "de": "Jede Aussage muss auf eine echte Zeile zeigen; sonst raus." } },
];

// ===== Friendly chunk-id =====
// converts "ch36_p04" → "Chapter 36 · ¶4" / "第 36 章 · 第 4 段" / etc.
window.friendlyChunkId = function(chunkId, locale) {
  if (!chunkId) return "";
  const m = /^ch(\d+)_p(\d+)$/i.exec(chunkId);
  if (!m) return chunkId;
  const ch = parseInt(m[1], 10), pa = parseInt(m[2], 10);
  const L = locale || window.__lg_locale || "zh-CN";
  switch (L) {
    case "en":    return `Chapter ${ch} · ¶${pa}`;
    case "zh-CN": return `第 ${ch} 章 · 第 ${pa} 段`;
    case "zh-TW": return `第 ${ch} 章 · 第 ${pa} 段`;
    case "ja":    return `第${ch}章 · 第${pa}段`;
    case "ko":    return `${ch}장 · ${pa}단`;
    case "fr":    return `Chapitre ${ch} · §${pa}`;
    case "es":    return `Capítulo ${ch} · §${pa}`;
    case "de":    return `Kapitel ${ch} · Abs. ${pa}`;
    default:      return chunkId;
  }
};

// ===== Friendly confidence label =====
window.friendlyConf = function(c, locale) {
  const L = locale || window.__lg_locale || "zh-CN";
  // turn 0.97 into a percent; high/med/low aren't needed since percent is clear
  return `${Math.round(c * 100)}%`;
};

// helper installed globally
window.t = function(key, locale, params) {
  const lang = locale || window.__lg_locale || "zh-CN";
  const entry = window.LG_I18N[key];
  if (!entry) return key;
  let str = entry[lang] || entry["en"] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      str = str.replace(`{${k}}`, params[k]);
    });
  }
  return str;
};

window.entityLocale = function(entityId, locale) {
  const map = window.LG_ENTITY_LOCALE[entityId];
  if (!map) return null;
  return map[locale] || map["en"] || null;
};
