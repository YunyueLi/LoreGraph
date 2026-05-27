// Per-language demo books. Each locale gets a public-domain classic in
// its own language; clicking through the graph shows real quotations
// from the source text (evidence_span), mirroring Pass-7's literal-span
// invariant.
//
// These fixtures are ILLUSTRATIVE — small hand-built graphs, not real
// pipeline output. Quotations are drawn from the public-domain source
// works (which is why they can ship here at all).

import type {
  BookSummary,
  ChunkDetail,
  Edge,
  EntityDetail,
  EntityType,
  GlucoseDim,
  GlucoseFact,
  GlucoseTime,
  GraphResponse,
  InferenceDepth,
  RelationType,
} from "../types";
import type { Locale } from "../i18n";

interface EntitySpec {
  key: string;
  type: EntityType;
  name: string;
  aliases: string[];
  mentions: number;
}
interface EdgeSpec {
  src: string;
  dst: string;
  rel: RelationType;
  ev: string;
  conf: number;
  depth: InferenceDepth;
  chunk: number;
}
interface FactSpec {
  entity: string;
  chunk: number;
  dim: GlucoseDim;
  time: GlucoseTime;
  stmt: string;
  ev: string;
  depth: InferenceDepth;
  conf: number;
}
interface ChunkSpec {
  id: number;
  atom: string;
  ch: number;
  seq: number;
  text: string;
}
interface BookSpec {
  title: string;
  author: string;
  entities: EntitySpec[];
  edges: EdgeSpec[];
  facts: FactSpec[];
  chunks: ChunkSpec[];
}

export interface BookFixture {
  book: BookSummary;
  graph: GraphResponse;
  entityDetail: (dbId: number) => EntityDetail;
  chunkDetail: (chunkId: number) => ChunkDetail;
}

function buildBook(spec: BookSpec): BookFixture {
  const book: BookSummary = { id: 1, title: spec.title, author: spec.author, language: "" };
  const dbOf: Record<string, number> = {};
  spec.entities.forEach((e, i) => (dbOf[e.key] = i + 1));
  const nodeOf: Record<number, string> = {};
  spec.entities.forEach((e) => (nodeOf[dbOf[e.key]] = e.key));

  const edges: Edge[] = spec.edges.map((e, i) => ({
    id: i + 1,
    book_id: 1,
    src_entity_id: dbOf[e.src],
    dst_entity_id: dbOf[e.dst],
    relation: e.rel,
    chunk_id: e.chunk,
    evidence_span: e.ev,
    confidence: e.conf,
    inference_depth: e.depth,
    attributes: {},
    created_at: "2026-05-27T00:00:00Z",
  }));

  const facts: GlucoseFact[] = spec.facts.map((f, i) => ({
    id: i + 1,
    book_id: 1,
    entity_id: dbOf[f.entity],
    chunk_id: f.chunk,
    dimension: f.dim,
    time_aspect: f.time,
    statement: f.stmt,
    evidence_span: f.ev,
    inference_depth: f.depth,
    confidence: f.conf,
  }));

  const graph: GraphResponse = {
    book,
    nodes: spec.entities.map((e) => ({
      id: e.key,
      db_id: dbOf[e.key],
      label: e.name,
      type: e.type,
      aliases: e.aliases,
      mention_count: e.mentions,
    })),
    edges: edges.map((e) => ({
      id: `edge_${e.id}`,
      db_id: e.id,
      source: nodeOf[e.src_entity_id],
      target: nodeOf[e.dst_entity_id],
      relation: e.relation,
      evidence_span: e.evidence_span,
      confidence: e.confidence,
      inference_depth: e.inference_depth,
      chunk_id: e.chunk_id,
    })),
  };

  const entityByDb: Record<number, EntitySpec> = {};
  spec.entities.forEach((e) => (entityByDb[dbOf[e.key]] = e));

  const entityDetail = (dbId: number): EntityDetail => {
    const meta = entityByDb[dbId] ?? spec.entities[0];
    const id = dbOf[meta.key];
    return {
      entity: {
        id,
        book_id: 1,
        canonical_id: meta.key,
        type: meta.type,
        canonical_name: meta.name,
        aliases: meta.aliases,
        note_md: "",
        attributes: {},
        embedding: null,
      },
      mention_count: meta.mentions,
      outgoing_edges: edges.filter((e) => e.src_entity_id === id),
      incoming_edges: edges.filter((e) => e.dst_entity_id === id),
      glucose_facts: facts.filter((f) => f.entity_id === id),
    };
  };

  const chunkById: Record<number, ChunkSpec> = {};
  spec.chunks.forEach((c) => (chunkById[c.id] = c));

  const chunkDetail = (chunkId: number): ChunkDetail => {
    const c = chunkById[chunkId] ?? spec.chunks[0];
    return {
      chunk: {
        id: c.id,
        book_id: 1,
        atom_id: c.atom,
        chapter: c.ch,
        seq: c.seq,
        text: c.text,
        token_count: Math.round(c.text.length / 3),
        char_offset_start: 0,
        char_offset_end: c.text.length,
        embedding: null,
      },
      mentions: [],
      edges_in_chunk: edges.filter((e) => e.chunk_id === c.id),
      glucose_facts_in_chunk: facts.filter((f) => f.chunk_id === c.id),
    };
  };

  return { book, graph, entityDetail, chunkDetail };
}

// ════════════════════════════════════════════════════════════════════
// EN · Pride and Prejudice — Jane Austen (1813)
// ════════════════════════════════════════════════════════════════════
const EN = buildBook({
  title: "Pride and Prejudice",
  author: "Jane Austen",
  entities: [
    { key: "eliza", type: "Agent", name: "Elizabeth Bennet", aliases: ["Elizabeth", "Lizzy"], mentions: 142 },
    { key: "darcy", type: "Agent", name: "Mr. Darcy", aliases: ["Darcy", "Fitzwilliam Darcy"], mentions: 118 },
    { key: "bingley", type: "Agent", name: "Mr. Bingley", aliases: ["Bingley"], mentions: 57 },
    { key: "pemberley", type: "Object", name: "Pemberley", aliases: ["Pemberley House"], mentions: 18 },
    { key: "proposal", type: "Event", name: "The Hunsford Proposal", aliases: ["his proposal"], mentions: 6 },
    { key: "prejudice", type: "Concept", name: "Prejudice", aliases: ["first impressions"], mentions: 11 },
  ],
  edges: [
    { src: "darcy", dst: "eliza", rel: "INTERACTS", ev: "You must allow me to tell you how ardently I admire and love you.", conf: 0.96, depth: "explicit", chunk: 3 },
    { src: "eliza", dst: "darcy", rel: "ASSERTS", ev: "you were the last man in the world whom I could ever be prevailed on to marry.", conf: 0.95, depth: "explicit", chunk: 3 },
    { src: "bingley", dst: "eliza", rel: "PREDICTS", ev: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", conf: 0.72, depth: "one_step", chunk: 1 },
    { src: "darcy", dst: "pemberley", rel: "STRUCTURAL", ev: "He is the best landlord, and the best master, that ever lived.", conf: 0.88, depth: "explicit", chunk: 2 },
    { src: "proposal", dst: "eliza", rel: "INFLUENCES", ev: "She grew absolutely ashamed of herself.", conf: 0.83, depth: "one_step", chunk: 3 },
    { src: "eliza", dst: "prejudice", rel: "ASSERTS", ev: "Till this moment I never knew myself.", conf: 0.8, depth: "one_step", chunk: 3 },
  ],
  facts: [
    { entity: "darcy", chunk: 2, dim: "attribute", time: "before", stmt: "Darcy is perceived as proud and aloof", ev: "he was discovered to be proud, to be above his company, and above being pleased", depth: "explicit", conf: 0.9 },
    { entity: "eliza", chunk: 3, dim: "emotion", time: "after", stmt: "Elizabeth is mortified by her own misjudgment", ev: "How despicably I have acted!", depth: "one_step", conf: 0.86 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p000", ch: 1, seq: 0, text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife." },
    { id: 2, atom: "ch43_p008", ch: 43, seq: 8, text: "“He is the best landlord, and the best master,” said Mrs. Reynolds, “that ever lived.” Elizabeth almost stared at her. “Can this be Mr. Darcy?” thought she." },
    { id: 3, atom: "ch34_p001", ch: 34, seq: 1, text: "In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you. … “How despicably I have acted!” she cried. “Till this moment I never knew myself.” She grew absolutely ashamed of herself." },
  ],
});

// ════════════════════════════════════════════════════════════════════
// zh-CN · 红楼梦 — 曹雪芹
// ════════════════════════════════════════════════════════════════════
const ZH_CN = buildBook({
  title: "红楼梦",
  author: "曹雪芹",
  entities: [
    { key: "baoyu", type: "Agent", name: "贾宝玉", aliases: ["宝玉", "怡红公子"], mentions: 168 },
    { key: "daiyu", type: "Agent", name: "林黛玉", aliases: ["黛玉", "颦儿"], mentions: 134 },
    { key: "baochai", type: "Agent", name: "薛宝钗", aliases: ["宝钗"], mentions: 96 },
    { key: "yu", type: "Object", name: "通灵宝玉", aliases: ["那块玉"], mentions: 41 },
    { key: "zanghua", type: "Event", name: "黛玉葬花", aliases: ["葬花"], mentions: 5 },
    { key: "qianmeng", type: "Concept", name: "木石前盟", aliases: ["还泪", "金玉良缘"], mentions: 9 },
  ],
  edges: [
    { src: "baoyu", dst: "daiyu", rel: "INTERACTS", ev: "这个妹妹我曾见过的。", conf: 0.94, depth: "explicit", chunk: 2 },
    { src: "daiyu", dst: "qianmeng", rel: "ASSERTS", ev: "我所有的眼泪还他，也偿还得过他了。", conf: 0.9, depth: "one_step", chunk: 2 },
    { src: "yu", dst: "baochai", rel: "PREDICTS", ev: "莫失莫忘，仙寿恒昌。", conf: 0.78, depth: "one_step", chunk: 3 },
    { src: "baoyu", dst: "yu", rel: "STRUCTURAL", ev: "一落胎胞，嘴里便衔下一块五彩晶莹的玉来。", conf: 0.92, depth: "explicit", chunk: 1 },
    { src: "zanghua", dst: "daiyu", rel: "INFLUENCES", ev: "花谢花飞花满天，红消香断有谁怜？", conf: 0.85, depth: "one_step", chunk: 2 },
    { src: "baoyu", dst: "baochai", rel: "ASSERTS", ev: "纵然是齐眉举案，到底意难平。", conf: 0.8, depth: "multi_step", chunk: 3 },
  ],
  facts: [
    { entity: "daiyu", chunk: 2, dim: "emotion", time: "before", stmt: "黛玉以葬花自伤身世飘零", ev: "侬今葬花人笑痴，他年葬侬知是谁？", depth: "one_step", conf: 0.87 },
    { entity: "baoyu", chunk: 1, dim: "attribute", time: "before", stmt: "宝玉衔玉而生，命运与玉相系", ev: "原来就是无材补天、幻形入世的那块顽石。", depth: "multi_step", conf: 0.82 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p003", ch: 1, seq: 3, text: "满纸荒唐言，一把辛酸泪！都云作者痴，谁解其中味？……那僧托于掌上，原来就是无材补天、幻形入世的那块顽石。一落胎胞，嘴里便衔下一块五彩晶莹的玉来。" },
    { id: 2, atom: "ch27_p011", ch: 27, seq: 11, text: "花谢花飞花满天，红消香断有谁怜？……尔今死去侬收葬，未卜侬身何日丧？侬今葬花人笑痴，他年葬侬知是谁？" },
    { id: 3, atom: "ch05_p009", ch: 5, seq: 9, text: "都道是金玉良缘，俺只念木石前盟。空对着，山中高士晶莹雪；终不忘，世外仙姝寂寞林。叹人间，美中不足今方信：纵然是齐眉举案，到底意难平。" },
  ],
});

// ════════════════════════════════════════════════════════════════════
// zh-TW · 三國演義 — 羅貫中
// ════════════════════════════════════════════════════════════════════
const ZH_TW = buildBook({
  title: "三國演義",
  author: "羅貫中",
  entities: [
    { key: "liubei", type: "Agent", name: "劉備", aliases: ["玄德", "劉玄德"], mentions: 152 },
    { key: "guanyu", type: "Agent", name: "關羽", aliases: ["雲長", "關公"], mentions: 121 },
    { key: "zhuge", type: "Agent", name: "諸葛亮", aliases: ["孔明", "臥龍"], mentions: 138 },
    { key: "jingzhou", type: "Object", name: "荊州", aliases: [], mentions: 47 },
    { key: "taoyuan", type: "Event", name: "桃園結義", aliases: ["結義"], mentions: 6 },
    { key: "sanfen", type: "Concept", name: "天下三分", aliases: ["隆中對"], mentions: 12 },
  ],
  edges: [
    { src: "liubei", dst: "guanyu", rel: "STRUCTURAL", ev: "不求同年同月同日生，只願同年同月同日死。", conf: 0.93, depth: "explicit", chunk: 1 },
    { src: "liubei", dst: "zhuge", rel: "INTERACTS", ev: "三顧臣於草廬之中，諮臣以當世之事。", conf: 0.91, depth: "explicit", chunk: 2 },
    { src: "zhuge", dst: "sanfen", rel: "PREDICTS", ev: "若跨有荊、益，保其巖阻……則霸業可成，漢室可興矣。", conf: 0.86, depth: "one_step", chunk: 2 },
    { src: "guanyu", dst: "jingzhou", rel: "STRUCTURAL", ev: "雲長公平生傲上而不忍下，欺強而不凌弱。", conf: 0.8, depth: "multi_step", chunk: 3 },
    { src: "taoyuan", dst: "liubei", rel: "INFLUENCES", ev: "念劉備、關羽、張飛，雖然異姓，既結為兄弟。", conf: 0.84, depth: "explicit", chunk: 1 },
    { src: "zhuge", dst: "liubei", rel: "ASSERTS", ev: "鞠躬盡瘁，死而後已。", conf: 0.82, depth: "explicit", chunk: 2 },
  ],
  facts: [
    { entity: "zhuge", chunk: 2, dim: "cause", time: "after", stmt: "孔明感念三顧之恩而出山輔佐", ev: "由是感激，遂許先帝以驅馳。", depth: "one_step", conf: 0.88 },
    { entity: "guanyu", chunk: 3, dim: "attribute", time: "before", stmt: "關羽剛而自矜，埋下失荊州之患", ev: "雲長剛而自矜，故致禍耳。", depth: "multi_step", conf: 0.8 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p002", ch: 1, seq: 2, text: "話說天下大勢，分久必合，合久必分。……念劉備、關羽、張飛，雖然異姓，既結為兄弟，則同心協力，救困扶危。不求同年同月同日生，只願同年同月同日死。" },
    { id: 2, atom: "ch38_p014", ch: 38, seq: 14, text: "臣本布衣，躬耕於南陽……先帝不以臣卑鄙，猥自枉屈，三顧臣於草廬之中，諮臣以當世之事，由是感激，遂許先帝以驅馳。鞠躬盡瘁，死而後已。" },
    { id: 3, atom: "ch73_p005", ch: 73, seq: 5, text: "雲長公平生傲上而不忍下，欺強而不凌弱。……孔明歎曰：雲長剛而自矜，故致禍耳。" },
  ],
});

// ════════════════════════════════════════════════════════════════════
// ja · 吾輩は猫である — 夏目漱石 (1905)
// ════════════════════════════════════════════════════════════════════
const JA = buildBook({
  title: "吾輩は猫である",
  author: "夏目漱石",
  entities: [
    { key: "neko", type: "Agent", name: "吾輩", aliases: ["猫"], mentions: 211 },
    { key: "kushami", type: "Agent", name: "苦沙弥先生", aliases: ["主人"], mentions: 98 },
    { key: "meitei", type: "Agent", name: "迷亭", aliases: [], mentions: 54 },
    { key: "shosai", type: "Object", name: "書斎", aliases: [], mentions: 22 },
    { key: "saigo", type: "Event", name: "猫の最期", aliases: ["水甕"], mentions: 4 },
    { key: "namae", type: "Concept", name: "名前のない猫", aliases: ["無名"], mentions: 7 },
  ],
  edges: [
    { src: "neko", dst: "namae", rel: "ASSERTS", ev: "吾輩は猫である。名前はまだ無い。", conf: 0.97, depth: "explicit", chunk: 1 },
    { src: "neko", dst: "kushami", rel: "STRUCTURAL", ev: "吾輩はここで始めて人間というものを見た。", conf: 0.88, depth: "one_step", chunk: 1 },
    { src: "meitei", dst: "kushami", rel: "INTERACTS", ev: "迷亭はいつものように飄然と主人の書斎へ入って来た。", conf: 0.82, depth: "explicit", chunk: 2 },
    { src: "kushami", dst: "shosai", rel: "STRUCTURAL", ev: "主人は滅多に書斎から出て来ない。", conf: 0.85, depth: "explicit", chunk: 2 },
    { src: "saigo", dst: "neko", rel: "INFLUENCES", ev: "南無阿弥陀仏南無阿弥陀仏。ありがたいありがたい。", conf: 0.8, depth: "one_step", chunk: 3 },
    { src: "namae", dst: "saigo", rel: "PREDICTS", ev: "太平の逸民である吾輩も、そろそろこの世とお別れになる。", conf: 0.74, depth: "multi_step", chunk: 3 },
  ],
  facts: [
    { entity: "neko", chunk: 1, dim: "attribute", time: "before", stmt: "猫は名を持たぬまま人間世界を観察する", ev: "どこで生れたかとんと見当がつかぬ。", depth: "explicit", conf: 0.9 },
    { entity: "neko", chunk: 3, dim: "emotion", time: "after", stmt: "猫は死に際して安らぎを覚える", ev: "ありがたいありがたい。", depth: "one_step", conf: 0.83 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p000", ch: 1, seq: 0, text: "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。" },
    { id: 2, atom: "ch03_p007", ch: 3, seq: 7, text: "主人は滅多に書斎から出て来ない。……迷亭はいつものように飄然と主人の書斎へ入って来た。" },
    { id: 3, atom: "ch11_p020", ch: 11, seq: 20, text: "太平の逸民である吾輩も、そろそろこの世とお別れになる。……南無阿弥陀仏南無阿弥陀仏。ありがたいありがたい。" },
  ],
});

// ════════════════════════════════════════════════════════════════════
// ko · 춘향전 (春香傳) — 작자 미상 · illustrative quotations
// ════════════════════════════════════════════════════════════════════
const KO = buildBook({
  title: "춘향전",
  author: "작자 미상",
  entities: [
    { key: "chunhyang", type: "Agent", name: "성춘향", aliases: ["춘향"], mentions: 124 },
    { key: "mongryong", type: "Agent", name: "이몽룡", aliases: ["이 도령", "어사또"], mentions: 110 },
    { key: "byeon", type: "Agent", name: "변학도", aliases: ["사또"], mentions: 38 },
    { key: "gwanghallu", type: "Object", name: "광한루", aliases: [], mentions: 9 },
    { key: "chuldo", type: "Event", name: "어사출도", aliases: [], mentions: 5 },
    { key: "ilpyeon", type: "Concept", name: "일편단심", aliases: ["절개"], mentions: 13 },
  ],
  edges: [
    { src: "mongryong", dst: "chunhyang", rel: "INTERACTS", ev: "광한루에서 그네 뛰는 춘향을 본 이 도령이 한눈에 반하였다.", conf: 0.9, depth: "explicit", chunk: 1 },
    { src: "chunhyang", dst: "ilpyeon", rel: "ASSERTS", ev: "충신은 두 임금을 섬기지 아니하고, 열녀는 두 지아비를 섬기지 아니합니다.", conf: 0.88, depth: "one_step", chunk: 2 },
    { src: "byeon", dst: "chunhyang", rel: "INFLUENCES", ev: "사또가 수청을 들라 다그치니 춘향이 죽기로 거절하였다.", conf: 0.84, depth: "explicit", chunk: 2 },
    { src: "mongryong", dst: "chuldo", rel: "STRUCTURAL", ev: "암행어사 출도야!", conf: 0.86, depth: "explicit", chunk: 3 },
    { src: "chuldo", dst: "byeon", rel: "INFLUENCES", ev: "금준미주는 천인의 피요, 옥반가효는 만성의 고라.", conf: 0.83, depth: "one_step", chunk: 3 },
    { src: "ilpyeon", dst: "chunhyang", rel: "PREDICTS", ev: "일편단심 굳은 절개는 끝내 보답을 받으리라.", conf: 0.72, depth: "multi_step", chunk: 2 },
  ],
  facts: [
    { entity: "chunhyang", chunk: 2, dim: "attribute", time: "before", stmt: "춘향은 죽음을 무릅쓰고 절개를 지킨다", ev: "열녀는 두 지아비를 섬기지 아니합니다.", depth: "one_step", conf: 0.86 },
    { entity: "byeon", chunk: 3, dim: "cause", time: "after", stmt: "변학도의 학정이 어사출도를 부른다", ev: "촉루낙시 민루락이요.", depth: "multi_step", conf: 0.78 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p001", ch: 1, seq: 1, text: "광한루에서 그네 뛰는 춘향을 본 이 도령이 한눈에 반하였다. 두 사람은 백년가약을 맺었으나, 이 도령은 아버지를 따라 한양으로 떠나게 되었다." },
    { id: 2, atom: "ch02_p006", ch: 2, seq: 6, text: "새로 부임한 사또 변학도가 수청을 들라 다그치니 춘향이 죽기로 거절하였다. “충신은 두 임금을 섬기지 아니하고, 열녀는 두 지아비를 섬기지 아니합니다.”" },
    { id: 3, atom: "ch03_p012", ch: 3, seq: 12, text: "“금준미주는 천인의 피요, 옥반가효는 만성의 고라.” 시가 끝나기 무섭게 — “암행어사 출도야!” 변학도의 잔치는 한순간에 아수라장이 되었다." },
  ],
});

// ════════════════════════════════════════════════════════════════════
// es · Don Quijote de la Mancha — Miguel de Cervantes (1605)
// ════════════════════════════════════════════════════════════════════
const ES = buildBook({
  title: "Don Quijote de la Mancha",
  author: "Miguel de Cervantes",
  entities: [
    { key: "quijote", type: "Agent", name: "Don Quijote", aliases: ["Alonso Quijano"], mentions: 188 },
    { key: "sancho", type: "Agent", name: "Sancho Panza", aliases: ["Sancho"], mentions: 142 },
    { key: "dulcinea", type: "Agent", name: "Dulcinea del Toboso", aliases: ["Dulcinea"], mentions: 33 },
    { key: "molinos", type: "Object", name: "los molinos de viento", aliases: ["gigantes"], mentions: 14 },
    { key: "aventura", type: "Event", name: "la aventura de los molinos", aliases: [], mentions: 6 },
    { key: "locura", type: "Concept", name: "la locura", aliases: ["el juicio"], mentions: 21 },
  ],
  edges: [
    { src: "quijote", dst: "sancho", rel: "STRUCTURAL", ev: "tomó por escudero a un labrador vecino suyo, hombre de bien, pero de muy poca sal en la mollera.", conf: 0.9, depth: "explicit", chunk: 1 },
    { src: "quijote", dst: "dulcinea", rel: "ASSERTS", ev: "llamóla Dulcinea del Toboso, señora de sus pensamientos.", conf: 0.88, depth: "explicit", chunk: 1 },
    { src: "quijote", dst: "molinos", rel: "INTERACTS", ev: "—Aquellos que allí ves —respondió su amo— de los brazos largos.", conf: 0.92, depth: "explicit", chunk: 2 },
    { src: "locura", dst: "quijote", rel: "INFLUENCES", ev: "del poco dormir y del mucho leer se le secó el cerebro, de manera que vino a perder el juicio.", conf: 0.89, depth: "one_step", chunk: 1 },
    { src: "aventura", dst: "sancho", rel: "INFLUENCES", ev: "—Mire vuestra merced —respondió Sancho— que aquellos no son gigantes, sino molinos de viento.", conf: 0.83, depth: "explicit", chunk: 2 },
    { src: "locura", dst: "aventura", rel: "PREDICTS", ev: "se dio a entender que le convenía hacerse caballero andante.", conf: 0.75, depth: "multi_step", chunk: 1 },
  ],
  facts: [
    { entity: "quijote", chunk: 1, dim: "cause", time: "before", stmt: "el exceso de libros de caballerías le trastorna el juicio", ev: "se le secó el cerebro, de manera que vino a perder el juicio.", depth: "one_step", conf: 0.9 },
    { entity: "quijote", chunk: 2, dim: "attribute", time: "after", stmt: "confunde la realidad con sus fantasías caballerescas", ev: "bien parece que no estás cursado en esto de las aventuras.", depth: "multi_step", conf: 0.8 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p000", ch: 1, seq: 0, text: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme… En resolución, él se enfrascó tanto en su lectura, que del poco dormir y del mucho leer se le secó el cerebro, de manera que vino a perder el juicio. Llamó a su dama Dulcinea del Toboso, señora de sus pensamientos." },
    { id: 2, atom: "ch08_p001", ch: 8, seq: 1, text: "—¿Qué gigantes? —dijo Sancho Panza. —Aquellos que allí ves —respondió su amo— de los brazos largos. —Mire vuestra merced —respondió Sancho— que aquellos no son gigantes, sino molinos de viento." },
  ],
});

// ════════════════════════════════════════════════════════════════════
// fr · Les Misérables — Victor Hugo (1862)
// ════════════════════════════════════════════════════════════════════
const FR = buildBook({
  title: "Les Misérables",
  author: "Victor Hugo",
  entities: [
    { key: "valjean", type: "Agent", name: "Jean Valjean", aliases: ["Monsieur Madeleine"], mentions: 174 },
    { key: "javert", type: "Agent", name: "Javert", aliases: [], mentions: 96 },
    { key: "cosette", type: "Agent", name: "Cosette", aliases: [], mentions: 88 },
    { key: "chandeliers", type: "Object", name: "les chandeliers d'argent", aliases: ["l'argenterie"], mentions: 12 },
    { key: "pardon", type: "Event", name: "le pardon de l'évêque", aliases: [], mentions: 5 },
    { key: "redemption", type: "Concept", name: "la rédemption", aliases: [], mentions: 17 },
  ],
  edges: [
    { src: "javert", dst: "valjean", rel: "INFLUENCES", ev: "Il sentait confusément que le prêtre l'avait gêné.", conf: 0.84, depth: "one_step", chunk: 2 },
    { src: "valjean", dst: "cosette", rel: "STRUCTURAL", ev: "Il l'aimait et il en était fier comme d'une chose à lui.", conf: 0.9, depth: "explicit", chunk: 3 },
    { src: "pardon", dst: "valjean", rel: "INFLUENCES", ev: "Jean Valjean, mon frère, vous n'appartenez plus au mal, mais au bien.", conf: 0.93, depth: "one_step", chunk: 1 },
    { src: "valjean", dst: "chandeliers", rel: "STRUCTURAL", ev: "C'est votre âme que je vous achète.", conf: 0.85, depth: "multi_step", chunk: 1 },
    { src: "valjean", dst: "redemption", rel: "ASSERTS", ev: "Il fit cette promesse: il deviendrait honnête homme.", conf: 0.82, depth: "one_step", chunk: 2 },
    { src: "pardon", dst: "redemption", rel: "PREDICTS", ev: "je retire votre âme aux pensées noires et je la donne à Dieu.", conf: 0.76, depth: "multi_step", chunk: 1 },
  ],
  facts: [
    { entity: "valjean", chunk: 1, dim: "cause", time: "after", stmt: "le geste de l'évêque déclenche sa conversion morale", ev: "C'est votre âme que je vous achète.", depth: "one_step", conf: 0.9 },
    { entity: "valjean", chunk: 3, dim: "emotion", time: "after", stmt: "Cosette devient le sens de sa vie", ev: "Il l'aimait et il en était fier.", depth: "explicit", conf: 0.85 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p012", ch: 1, seq: 12, text: "« Jean Valjean, mon frère, vous n'appartenez plus au mal, mais au bien. C'est votre âme que je vous achète; je la retire aux pensées noires et à l'esprit de perdition, et je la donne à Dieu. »" },
    { id: 2, atom: "ch07_p003", ch: 7, seq: 3, text: "Il sentait confusément que le pardon de ce prêtre était le plus grand assaut et la plus formidable attaque dont il eût jamais été ébranlé. Il fit cette promesse: il deviendrait honnête homme." },
    { id: 3, atom: "ch22_p009", ch: 22, seq: 9, text: "Depuis qu'il avait Cosette près de lui, il lui semblait qu'il était à elle. Il l'aimait et il en était fier comme d'une chose à lui." },
  ],
});

// ════════════════════════════════════════════════════════════════════
// de · Die Verwandlung — Franz Kafka (1915)
// ════════════════════════════════════════════════════════════════════
const DE = buildBook({
  title: "Die Verwandlung",
  author: "Franz Kafka",
  entities: [
    { key: "gregor", type: "Agent", name: "Gregor Samsa", aliases: ["Gregor"], mentions: 156 },
    { key: "grete", type: "Agent", name: "Grete", aliases: ["die Schwester"], mentions: 64 },
    { key: "vater", type: "Agent", name: "der Vater", aliases: ["Herr Samsa"], mentions: 52 },
    { key: "zimmer", type: "Object", name: "Gregors Zimmer", aliases: ["das Zimmer"], mentions: 38 },
    { key: "verwandlung", type: "Event", name: "die Verwandlung", aliases: [], mentions: 7 },
    { key: "ungeziefer", type: "Concept", name: "das Ungeziefer", aliases: ["Käfer"], mentions: 19 },
  ],
  edges: [
    { src: "verwandlung", dst: "gregor", rel: "INFLUENCES", ev: "fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt.", conf: 0.95, depth: "explicit", chunk: 1 },
    { src: "gregor", dst: "ungeziefer", rel: "ASSERTS", ev: "Es war kein Traum.", conf: 0.86, depth: "one_step", chunk: 1 },
    { src: "gregor", dst: "grete", rel: "INTERACTS", ev: "Nur die Schwester war Gregor doch noch nahe geblieben.", conf: 0.84, depth: "explicit", chunk: 2 },
    { src: "vater", dst: "gregor", rel: "INFLUENCES", ev: "Der Vater bombardierte ihn mit Äpfeln.", conf: 0.88, depth: "explicit", chunk: 2 },
    { src: "gregor", dst: "zimmer", rel: "STRUCTURAL", ev: "Er blieb in seinem Zimmer eingeschlossen.", conf: 0.83, depth: "explicit", chunk: 2 },
    { src: "verwandlung", dst: "gregor", rel: "PREDICTS", ev: "Und es war ihnen wie eine Bestätigung ihrer neuen Träume.", conf: 0.72, depth: "multi_step", chunk: 3 },
  ],
  facts: [
    { entity: "gregor", chunk: 1, dim: "emotion", time: "after", stmt: "Gregor bleibt trotz der Verwandlung sonderbar gefasst", ev: "Was ist mit mir geschehen?, dachte er.", depth: "one_step", conf: 0.85 },
    { entity: "grete", chunk: 3, dim: "attribute", time: "after", stmt: "die Familie blüht nach Gregors Tod auf", ev: "wie eine Bestätigung ihrer neuen Träume und guten Absichten.", depth: "multi_step", conf: 0.8 },
  ],
  chunks: [
    { id: 1, atom: "ch01_p000", ch: 1, seq: 0, text: "Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt. „Was ist mit mir geschehen?“, dachte er. Es war kein Traum." },
    { id: 2, atom: "ch02_p008", ch: 2, seq: 8, text: "Der Vater bombardierte ihn mit Äpfeln. Gregor blieb in seinem Zimmer eingeschlossen; nur die Schwester war ihm doch noch nahe geblieben." },
    { id: 3, atom: "ch03_p014", ch: 3, seq: 14, text: "Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte." },
  ],
});

// ════════════════════════════════════════════════════════════════════
// Registry
// ════════════════════════════════════════════════════════════════════

const BOOKS: Record<Locale, BookFixture> = {
  en: EN,
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  ja: JA,
  ko: KO,
  es: ES,
  fr: FR,
  de: DE,
};

export function getBookFixture(locale: Locale): BookFixture {
  return BOOKS[locale] ?? EN;
}
