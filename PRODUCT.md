# Product

## Register

brand

The public surface at `src/loregraph/web/landing/` is LoreGraph's face: a working
replica of the product used as the argument for it. Every screen is app UI in
shape (sidebar, views, panels, data) but its job is persuasion, not throughput —
a visitor decides whether this system can be trusted from what they see. Design
IS the product here. Inner workbench screens still owe real information design;
brand register means the craft bar is a showpiece bar, not that the data gets
decorated.

## Users

Readers who take fiction seriously and want structure without losing the text:
literature researchers and graduate students, translators and editors working
across a long work, writers holding a large invented world in their head, and
engineers evaluating whether an LLM extraction pipeline is honest.

They arrive skeptical. The category is full of tools that hallucinate confident
graphs from novels. The job to be done on this surface is not "browse a demo" —
it is *audit the claim*: can I see, for any node or edge, the literal sentence in
the book it came from?

## Product Purpose

LoreGraph extracts knowledge graphs from closed-world fictional texts (novels,
plays, screenplays, opera and musical libretti) through an 8-Pass LLM pipeline.
Its differentiator is evidentiary: every extracted claim carries an
`evidence_span` — a literal substring of the source chunk — and Pass-7 enforces a
≥95% literal-match rate as a hard gate.

Success on this surface is a visitor concluding two things: *this is rigorous*
and *this was made by people who care*. Failure is a visitor thinking "another
AI-generated graph demo."

## Brand Personality

Scholarly, evidentiary, quietly confident. The voice of a good critical edition:
it does not raise its own volume, it shows you the page. Three words: **archival,
exact, unhurried.**

Emotional goal: the feeling of a well-made reference book — the pleasure of
something built to be consulted for years, not a dashboard that shouts metrics.
Delight arrives through material craft (bound volumes, gold rules, real title
pages) rather than through playfulness.

## Anti-references

- **Analytics dashboards.** Hero-metric rows, KPI tiles, gauge widgets. LoreGraph
  reports evidence, not a scoreboard.
- **The "AI product" look.** Violet-to-cyan gradients, glassmorphic cards, glowing
  orbs, sparkle icons, "✨ Powered by AI" affordances.
- **Developer-console leakage.** Raw internal identifiers as display copy
  (`ATOM CH01_P000`, `ch01_p000`, `glucose`, zero-indexed `第 0 段`). Internals are
  available on demand, never the headline.
- **Costume monospace.** Wide-tracked uppercase mono labels sprayed over every
  section and every stat as a shortcut to "technical". One catalog voice, used
  sparingly, is the system; mono everywhere is scaffolding.
- **Faux-antique kitsch.** Parchment textures, torn-paper edges, wax seals, quill
  icons, drop-shadowed "aged" overlays. The classicism is typographic and
  structural, never a costume.

## Design Principles

1. **Show the page, don't assert the claim.** Evidence is the product, so evidence
   gets primary typographic treatment — real size, real contrast, quotable. Any
   screen where the quote is smaller or fainter than its metadata is inverted.
2. **Legibility is the luxury.** This is a reading instrument for long sessions in
   Chinese, Japanese, Korean and Latin scripts. Refinement shows up as correct
   CJK typography, honest contrast, and a disciplined type scale — never as
   smaller, lighter, wider-tracked text.
3. **Density with air.** Serious reference density is welcome; uniform density is
   not. Group tightly, separate generously, and let one idea dominate each view.
4. **The catalog voice is a system, not a garnish.** Mono, small caps, rules and
   numbering are a deliberate archival register applied at named moments. If a
   device appears on every block, it has stopped meaning anything.
5. **Structure earns the classicism.** The antiquarian identity is carried by
   proportion, rules, and typesetting — bound volumes, gold hairlines, a real type
   hierarchy — not by texture or ornament.

## Accessibility & Inclusion

- WCAG 2.1 AA as the floor: body text ≥4.5:1, large text ≥3:1, placeholders held
  to the body ratio. Muted-gold-on-cream is the known offender and must be
  verified rather than eyeballed.
- **11px is the hard type floor** for any user-facing text, including mono labels
  and metadata. Nothing at 8.5–10px ships.
- Never encode meaning in hue alone — relation types, pipeline states, and phase
  markers each need a second channel (line style, glyph, weight, or label). The
  palette leans gold/rust/moss, which is exactly the range red-green color
  vision deficiency compresses.
- `prefers-reduced-motion: reduce` must have a real alternative for every
  animation, including the 3-D shelf's entrance and the graph's force simulation.
- The 3-D shelf requires a working non-WebGL path (the flat shelf), and every
  view needs visible keyboard focus.
- Eight locales ship (en · zh-CN · zh-TW · ja · ko · fr · es · de). Layouts must
  survive German compounds and CJK line-breaking without clipping or mid-word
  truncation.
