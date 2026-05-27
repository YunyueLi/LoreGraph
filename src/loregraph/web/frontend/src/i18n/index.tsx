import { createContext, useContext, useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════
// Locales
// ════════════════════════════════════════════════════════════════════

export type Locale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko" | "es" | "fr" | "de";

export const LOCALES: { code: Locale; short: string; native: string }[] = [
  { code: "en", short: "EN", native: "English" },
  { code: "zh-CN", short: "中", native: "简体中文" },
  { code: "zh-TW", short: "繁", native: "繁體中文" },
  { code: "ja", short: "日", native: "日本語" },
  { code: "ko", short: "한", native: "한국어" },
  { code: "es", short: "ES", native: "Español" },
  { code: "fr", short: "FR", native: "Français" },
  { code: "de", short: "DE", native: "Deutsch" },
];

// ════════════════════════════════════════════════════════════════════
// String table
// ════════════════════════════════════════════════════════════════════

export interface Strings {
  heroEyebrow: string;
  heroLine1: string; // text before the gold emphasis word
  heroEmphasis: string; // the handwritten gold word
  heroLine2: string; // text after the emphasis (may be empty for CJK/KO word order)
  heroSub: string;
  heroCta: string;
  heroFooter: string; // handwritten line above the demo graph

  navGraph: string;
  navGithub: string;
  langLabel: string;
  langChoose: string;
  langAuto: string;
  langClose: string;
  themeLight: string;
  themeDark: string;

  bookLabel: string;
  demoNote: string; // small "demo · <book>" hint

  howToRead: string;
  howToReadBody: string;
  clickHint: string;

  typeAgent: string;
  typeObject: string;
  typeEvent: string;
  typeConcept: string;
  hintAgent: string;
  hintObject: string;
  hintEvent: string;
  hintConcept: string;

  aliases: string;
  outgoingEdges: string;
  incomingEdges: string;
  implicitFacts: string;
  selectedEdge: string;
  chunkText: string;
  mentions: string;
  verified: string;
  close: string;

  loadingGraph: string;
  failed: string;
}

export const STRINGS: Record<Locale, Strings> = {
  en: {
    heroEyebrow: "KNOWLEDGE GRAPHS FROM CLOSED-WORLD FICTION",
    heroLine1: "every edge",
    heroEmphasis: "remembers",
    heroLine2: "where it came from.",
    heroSub:
      "Feed LoreGraph a novel and it returns a graph where every node and relation is anchored to a literal line of the text.",
    heroCta: "OPEN THE GRAPH",
    heroFooter: "evidence on every edge.",
    navGraph: "the graph",
    navGithub: "GitHub",
    langLabel: "LANGUAGE",
    langChoose: "choose",
    langAuto: "Auto",
    langClose: "ESC · CLOSE",
    themeLight: "light",
    themeDark: "dark",
    bookLabel: "Book",
    demoNote: "demo",
    howToRead: "How to read this graph",
    howToReadBody:
      "Every node is a typed entity, every edge a typed relation. Each claim is anchored to a literal span of the source text.",
    clickHint: "Click any node or edge to inspect its source.",
    typeAgent: "Agent",
    typeObject: "Object",
    typeEvent: "Event",
    typeConcept: "Concept",
    hintAgent: "characters, groups",
    hintObject: "places, things, documents",
    hintEvent: "realis triggers — what happened",
    hintConcept: "themes, predictions, motifs",
    aliases: "Aliases",
    outgoingEdges: "Outgoing edges",
    incomingEdges: "Incoming edges",
    implicitFacts: "Implicit facts · GLUCOSE",
    selectedEdge: "Selected edge",
    chunkText: "Chunk text",
    mentions: "Mentions",
    verified: "Pass-7 verified",
    close: "close",
    loadingGraph: "Loading graph…",
    failed: "Failed to load.",
  },
  "zh-CN": {
    heroEyebrow: "为封闭世界的文学构建知识图谱",
    heroLine1: "每一条边都",
    heroEmphasis: "记得",
    heroLine2: "自己从何而来。",
    heroSub:
      "给 LoreGraph 一部小说，它会还原出一张知识图谱——每个节点和每条关系都锚定在原文的字面文字上。",
    heroCta: "进入图谱",
    heroFooter: "每一条边都有出处。",
    navGraph: "图谱",
    navGithub: "GitHub",
    langLabel: "语言",
    langChoose: "选择",
    langAuto: "自动",
    langClose: "ESC · 关闭",
    themeLight: "浅色",
    themeDark: "深色",
    bookLabel: "作品",
    demoNote: "示例",
    howToRead: "如何阅读这张图谱",
    howToReadBody:
      "每个节点是一个带类型的实体，每条边是一种带类型的关系。每一条主张都锚定在原文的字面片段上。",
    clickHint: "点击任意节点或边，查看它的原文出处。",
    typeAgent: "主体",
    typeObject: "客体",
    typeEvent: "事件",
    typeConcept: "概念",
    hintAgent: "人物、群体",
    hintObject: "地点、物件、文档",
    hintEvent: "真实发生的事件",
    hintConcept: "主题、预言、母题",
    aliases: "别名",
    outgoingEdges: "出边",
    incomingEdges: "入边",
    implicitFacts: "隐式事实 · GLUCOSE",
    selectedEdge: "选中的边",
    chunkText: "原文片段",
    mentions: "提及",
    verified: "Pass-7 已验证",
    close: "关闭",
    loadingGraph: "正在加载图谱…",
    failed: "加载失败。",
  },
  "zh-TW": {
    heroEyebrow: "為封閉世界的文學建構知識圖譜",
    heroLine1: "每一條邊都",
    heroEmphasis: "記得",
    heroLine2: "自己從何而來。",
    heroSub:
      "給 LoreGraph 一部小說，它會還原出一張知識圖譜——每個節點和每條關係都錨定在原文的字面文字上。",
    heroCta: "進入圖譜",
    heroFooter: "每一條邊都有出處。",
    navGraph: "圖譜",
    navGithub: "GitHub",
    langLabel: "語言",
    langChoose: "選擇",
    langAuto: "自動",
    langClose: "ESC · 關閉",
    themeLight: "淺色",
    themeDark: "深色",
    bookLabel: "作品",
    demoNote: "範例",
    howToRead: "如何閱讀這張圖譜",
    howToReadBody:
      "每個節點是一個帶類型的實體，每條邊是一種帶類型的關係。每一條主張都錨定在原文的字面片段上。",
    clickHint: "點擊任意節點或邊，查看它的原文出處。",
    typeAgent: "主體",
    typeObject: "客體",
    typeEvent: "事件",
    typeConcept: "概念",
    hintAgent: "人物、群體",
    hintObject: "地點、物件、文件",
    hintEvent: "真實發生的事件",
    hintConcept: "主題、預言、母題",
    aliases: "別名",
    outgoingEdges: "出邊",
    incomingEdges: "入邊",
    implicitFacts: "隱式事實 · GLUCOSE",
    selectedEdge: "選中的邊",
    chunkText: "原文片段",
    mentions: "提及",
    verified: "Pass-7 已驗證",
    close: "關閉",
    loadingGraph: "正在載入圖譜…",
    failed: "載入失敗。",
  },
  ja: {
    heroEyebrow: "閉じた物語世界からの知識グラフ",
    heroLine1: "すべての辺は、その出どころを",
    heroEmphasis: "覚えている",
    heroLine2: "。",
    heroSub:
      "LoreGraph に小説を与えると、すべてのノードと関係が原文の文字どおりの一行に裏づけられた知識グラフが返ってきます。",
    heroCta: "グラフを開く",
    heroFooter: "すべての辺に根拠を。",
    navGraph: "グラフ",
    navGithub: "GitHub",
    langLabel: "言語",
    langChoose: "選択",
    langAuto: "自動",
    langClose: "ESC · 閉じる",
    themeLight: "ライト",
    themeDark: "ダーク",
    bookLabel: "作品",
    demoNote: "デモ",
    howToRead: "このグラフの読み方",
    howToReadBody:
      "各ノードは型付きの実体、各辺は型付きの関係です。すべての主張は原文の文字どおりの範囲に裏づけられています。",
    clickHint: "ノードや辺をクリックすると出典を確認できます。",
    typeAgent: "主体",
    typeObject: "客体",
    typeEvent: "出来事",
    typeConcept: "概念",
    hintAgent: "人物・集団",
    hintObject: "場所・物・文書",
    hintEvent: "実際に起きた出来事",
    hintConcept: "主題・予言・モチーフ",
    aliases: "別名",
    outgoingEdges: "出力エッジ",
    incomingEdges: "入力エッジ",
    implicitFacts: "暗黙の事実 · GLUCOSE",
    selectedEdge: "選択した辺",
    chunkText: "原文",
    mentions: "言及",
    verified: "Pass-7 検証済み",
    close: "閉じる",
    loadingGraph: "グラフを読み込み中…",
    failed: "読み込みに失敗しました。",
  },
  ko: {
    heroEyebrow: "닫힌 허구 세계의 지식 그래프",
    heroLine1: "모든 엣지는 출처를",
    heroEmphasis: "기억한다",
    heroLine2: ".",
    heroSub:
      "LoreGraph에 소설을 넣으면 모든 노드와 관계가 원문의 문자 그대로의 한 줄에 근거한 지식 그래프를 돌려줍니다.",
    heroCta: "그래프 열기",
    heroFooter: "모든 엣지에 근거를.",
    navGraph: "그래프",
    navGithub: "GitHub",
    langLabel: "언어",
    langChoose: "선택",
    langAuto: "자동",
    langClose: "ESC · 닫기",
    themeLight: "라이트",
    themeDark: "다크",
    bookLabel: "작품",
    demoNote: "데모",
    howToRead: "이 그래프를 읽는 법",
    howToReadBody:
      "각 노드는 유형이 있는 개체이고, 각 엣지는 유형이 있는 관계입니다. 모든 주장은 원문의 문자 그대로의 구간에 근거합니다.",
    clickHint: "노드나 엣지를 클릭하면 출처를 볼 수 있습니다.",
    typeAgent: "행위자",
    typeObject: "객체",
    typeEvent: "사건",
    typeConcept: "개념",
    hintAgent: "인물 · 집단",
    hintObject: "장소 · 사물 · 문서",
    hintEvent: "실제로 일어난 사건",
    hintConcept: "주제 · 예언 · 모티프",
    aliases: "별칭",
    outgoingEdges: "나가는 엣지",
    incomingEdges: "들어오는 엣지",
    implicitFacts: "암시적 사실 · GLUCOSE",
    selectedEdge: "선택한 엣지",
    chunkText: "원문",
    mentions: "언급",
    verified: "Pass-7 검증됨",
    close: "닫기",
    loadingGraph: "그래프 불러오는 중…",
    failed: "불러오기에 실패했습니다.",
  },
  es: {
    heroEyebrow: "GRAFOS DE CONOCIMIENTO DE FICCIÓN CERRADA",
    heroLine1: "cada arista",
    heroEmphasis: "recuerda",
    heroLine2: "de dónde viene.",
    heroSub:
      "Dale a LoreGraph una novela y te devuelve un grafo donde cada nodo y relación está anclado a una línea literal del texto.",
    heroCta: "ABRIR EL GRAFO",
    heroFooter: "evidencia en cada arista.",
    navGraph: "el grafo",
    navGithub: "GitHub",
    langLabel: "IDIOMA",
    langChoose: "elegir",
    langAuto: "Auto",
    langClose: "ESC · CERRAR",
    themeLight: "claro",
    themeDark: "oscuro",
    bookLabel: "Obra",
    demoNote: "demo",
    howToRead: "Cómo leer este grafo",
    howToReadBody:
      "Cada nodo es una entidad tipada y cada arista una relación tipada. Cada afirmación está anclada a un fragmento literal del texto original.",
    clickHint: "Haz clic en cualquier nodo o arista para ver su fuente.",
    typeAgent: "Agente",
    typeObject: "Objeto",
    typeEvent: "Evento",
    typeConcept: "Concepto",
    hintAgent: "personajes, grupos",
    hintObject: "lugares, cosas, documentos",
    hintEvent: "hechos que ocurrieron",
    hintConcept: "temas, predicciones, motivos",
    aliases: "Alias",
    outgoingEdges: "Aristas salientes",
    incomingEdges: "Aristas entrantes",
    implicitFacts: "Hechos implícitos · GLUCOSE",
    selectedEdge: "Arista seleccionada",
    chunkText: "Texto del fragmento",
    mentions: "Menciones",
    verified: "Verificado por Pass-7",
    close: "cerrar",
    loadingGraph: "Cargando el grafo…",
    failed: "Error al cargar.",
  },
  fr: {
    heroEyebrow: "GRAPHES DE CONNAISSANCE DE FICTION CLOSE",
    heroLine1: "chaque lien",
    heroEmphasis: "se souvient",
    heroLine2: "d'où il vient.",
    heroSub:
      "Donnez un roman à LoreGraph et il vous rend un graphe où chaque nœud et chaque relation est ancré à une ligne littérale du texte.",
    heroCta: "OUVRIR LE GRAPHE",
    heroFooter: "une preuve sur chaque lien.",
    navGraph: "le graphe",
    navGithub: "GitHub",
    langLabel: "LANGUE",
    langChoose: "choisir",
    langAuto: "Auto",
    langClose: "ESC · FERMER",
    themeLight: "clair",
    themeDark: "sombre",
    bookLabel: "Œuvre",
    demoNote: "démo",
    howToRead: "Comment lire ce graphe",
    howToReadBody:
      "Chaque nœud est une entité typée, chaque lien une relation typée. Chaque affirmation est ancrée à un extrait littéral du texte source.",
    clickHint: "Cliquez sur un nœud ou un lien pour voir sa source.",
    typeAgent: "Agent",
    typeObject: "Objet",
    typeEvent: "Événement",
    typeConcept: "Concept",
    hintAgent: "personnages, groupes",
    hintObject: "lieux, objets, documents",
    hintEvent: "faits réellement survenus",
    hintConcept: "thèmes, prédictions, motifs",
    aliases: "Alias",
    outgoingEdges: "Liens sortants",
    incomingEdges: "Liens entrants",
    implicitFacts: "Faits implicites · GLUCOSE",
    selectedEdge: "Lien sélectionné",
    chunkText: "Texte du fragment",
    mentions: "Mentions",
    verified: "Vérifié par Pass-7",
    close: "fermer",
    loadingGraph: "Chargement du graphe…",
    failed: "Échec du chargement.",
  },
  de: {
    heroEyebrow: "WISSENSGRAPHEN AUS GESCHLOSSENEN FIKTIONEN",
    heroLine1: "jede Kante",
    heroEmphasis: "erinnert sich",
    heroLine2: "woher sie kam.",
    heroSub:
      "Gib LoreGraph einen Roman und du erhältst einen Graphen, in dem jeder Knoten und jede Beziehung an einer wörtlichen Zeile des Textes verankert ist.",
    heroCta: "GRAPH ÖFFNEN",
    heroFooter: "Belege an jeder Kante.",
    navGraph: "der Graph",
    navGithub: "GitHub",
    langLabel: "SPRACHE",
    langChoose: "wählen",
    langAuto: "Auto",
    langClose: "ESC · SCHLIESSEN",
    themeLight: "hell",
    themeDark: "dunkel",
    bookLabel: "Werk",
    demoNote: "Demo",
    howToRead: "So liest man diesen Graphen",
    howToReadBody:
      "Jeder Knoten ist eine typisierte Entität, jede Kante eine typisierte Beziehung. Jede Aussage ist an einem wörtlichen Ausschnitt des Quelltexts verankert.",
    clickHint: "Klicke auf einen Knoten oder eine Kante, um die Quelle zu sehen.",
    typeAgent: "Akteur",
    typeObject: "Objekt",
    typeEvent: "Ereignis",
    typeConcept: "Konzept",
    hintAgent: "Figuren, Gruppen",
    hintObject: "Orte, Dinge, Dokumente",
    hintEvent: "tatsächlich Geschehenes",
    hintConcept: "Themen, Vorhersagen, Motive",
    aliases: "Aliasse",
    outgoingEdges: "Ausgehende Kanten",
    incomingEdges: "Eingehende Kanten",
    implicitFacts: "Implizite Fakten · GLUCOSE",
    selectedEdge: "Ausgewählte Kante",
    chunkText: "Textausschnitt",
    mentions: "Erwähnungen",
    verified: "Pass-7 verifiziert",
    close: "schließen",
    loadingGraph: "Graph wird geladen…",
    failed: "Laden fehlgeschlagen.",
  },
};

// ════════════════════════════════════════════════════════════════════
// Context + hook
// ════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "loregraph.locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && STRINGS[stored]) return stored;
  const nav = (window.navigator.language || "en").toLowerCase();
  if (nav.startsWith("zh")) return nav.includes("tw") || nav.includes("hk") ? "zh-TW" : "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("de")) return "de";
  return "en";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: STRINGS[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
