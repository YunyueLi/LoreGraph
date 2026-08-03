"""Controlled vocabulary for edge predicates.

The problem this solves
-----------------------
Pass-5 asks the model for "a specific verb-phrase … stay close to the verb in
the evidence_span", and it obliges: alice and xyj between them produced **2627
distinct predicates over 9843 edges**, 1554 of which occur exactly once. A
third of every edge in the graph carries a relation name that appears nowhere
else. That is not a knowledge graph, it is free text with arrows — you cannot
ask "who betrayed whom" when betrayal is spread across BETRAYS, DECEIVES and
TRICKS at one occurrence each.

The 5-way `relation` enum above it is too coarse to compensate: 65% of all
edges are `INTERACTS`.

The fix is not to take the specific verb away — it is genuinely the most
informative thing on the edge, and it is what a reader wants to see. It is to
add a **second, closed** axis to query on:

    relation        INTERACTS            (5 values — too coarse)
    predicate_class CONFLICT             (~24 values — queryable)
    predicate       THREATENS_TO_BURN    (open — readable)

`classify` maps the open verb onto the closed class. Anything it cannot place
lands in `<RELATION>_OTHER` rather than being forced into a wrong bucket: an
honest "unclassified" is worth more than a plausible mis-file, and the share
of `_OTHER` is a number you can watch and drive down.
"""

from __future__ import annotations

import re
from enum import StrEnum

__all__ = ["PredicateClass", "classify", "coverage"]


class PredicateClass(StrEnum):
    """Closed set of queryable relation families.

    Derived from the observed predicate distribution over alice + xyj, not
    invented: every family here has a real head in the data.
    """

    MOTION = "MOTION"
    LOCATION = "LOCATION"
    POSSESSION = "POSSESSION"
    EXCHANGE = "EXCHANGE"
    KINSHIP = "KINSHIP"
    AUTHORITY = "AUTHORITY"
    CONFLICT = "CONFLICT"
    AID = "AID"
    SOCIAL = "SOCIAL"
    SPEECH_NEUTRAL = "SPEECH_NEUTRAL"
    SPEECH_APPROVING = "SPEECH_APPROVING"
    SPEECH_CRITICAL = "SPEECH_CRITICAL"
    BELIEF = "BELIEF"
    EMOTION = "EMOTION"
    PERCEPTION = "PERCEPTION"
    TRANSFORMATION = "TRANSFORMATION"
    CREATION = "CREATION"
    DESTRUCTION = "DESTRUCTION"
    CAUSATION = "CAUSATION"
    PARTICIPATION = "PARTICIPATION"
    COMPOSITION = "COMPOSITION"
    IDENTITY = "IDENTITY"
    MANIPULATION = "MANIPULATION"
    CONSUMPTION = "CONSUMPTION"
    FORESIGHT = "FORESIGHT"

    # Escape hatches, one per relation class. Not failures to hide — the share
    # of edges landing here is the vocabulary's coverage metric.
    STRUCTURAL_OTHER = "STRUCTURAL_OTHER"
    INTERACTS_OTHER = "INTERACTS_OTHER"
    ASSERTS_OTHER = "ASSERTS_OTHER"
    INFLUENCES_OTHER = "INFLUENCES_OTHER"
    PREDICTS_OTHER = "PREDICTS_OTHER"
    UNCLASSIFIED = "UNCLASSIFIED"


_OTHER_FOR_RELATION = {
    "STRUCTURAL": PredicateClass.STRUCTURAL_OTHER,
    "INTERACTS": PredicateClass.INTERACTS_OTHER,
    "ASSERTS": PredicateClass.ASSERTS_OTHER,
    "INFLUENCES": PredicateClass.INFLUENCES_OTHER,
    "PREDICTS": PredicateClass.PREDICTS_OTHER,
}

# Verb stems per family. Matched against the predicate's *leading* segments
# after suffix stripping, so `THREATENS_TO_BURN` finds `THREATEN` and
# `CAUSES_SNEEZING` finds `CAUSE`. Stems are stored without inflection; see
# `_stem`.
_FAMILIES: dict[PredicateClass, tuple[str, ...]] = {
    PredicateClass.MOTION: (
        "LAND",
        "BRING",
        "FETCH",
        "RETRIEVE",
        "TRANSPORT",
        "ESCORT",
        "ABANDON",
        "PICK_UP",
        "GRAB",
        "CAST",
        "SEND_TO",
        "ENTER",
        "EXIT",
        "LEAVE",
        "DEPART",
        "ARRIVE",
        "TRAVEL",
        "GO",
        "COME",
        "RETURN",
        "VISIT",
        "MOVE",
        "FLEE",
        "ESCAPE",
        "FOLLOW",
        "PURSUE",
        "CHASE",
        "RIDE",
        "FLY",
        "SWIM",
        "WALK",
        "RUN",
        "CLIMB",
        "DESCEND",
        "APPROACH",
        "CROSS",
        "PASS",
        "WANDER",
        "ACCOMPANY",
        "LEAD_TO",
        "SET_OUT",
        "SET_OFF",
        "HEAD",
        "REACH",
        "JOURNEY",
        "MARCH",
        "ADVANCE",
        "RETREAT",
        "WITHDRAW",
        "FALL",
        "JUMP",
        "STEP",
    ),
    PredicateClass.LOCATION: (
        "SURROUND",
        "ORIGINATE",
        "FROM",
        "LOCATE",
        "RESIDE",
        "LIVE",
        "DWELL",
        "OCCUR",
        "HAPPEN",
        "SIT",
        "STAND",
        "LIE",
        "REST",
        "REMAIN",
        "STAY",
        "INHABIT",
        "STUDY_AT",
        "WORK_AT",
        "SITUATE",
        "POSITION",
        "PLACE",
        "SET",
        "HANG",
        "APPEAR_AT",
        "APPEAR_IN",
        "BASED",
        "NEAR",
        "BORDER",
        "ADJACENT",
    ),
    PredicateClass.POSSESSION: (
        "SECURE",
        "RECOVER",
        "HANDLE",
        "MANAGE",
        "OWN",
        "POSSESS",
        "HOLD",
        "CARRY",
        "WIELD",
        "WEAR",
        "BEAR",
        "KEEP",
        "GRASP",
        "GRIP",
        "CLUTCH",
        "RETAIN",
        "HAVE",
        "LACK",
        "LOSE",
        "BELONG",
        "ACQUIRE",
        "OBTAIN",
        "GAIN",
        "USE",
        "EMPLOY",
    ),
    PredicateClass.EXCHANGE: (
        "DISTRIBUTE",
        "ENTRUST",
        "GIFT",
        "REWARD",
        "BET",
        "NEGOTIATE",
        "GIVE",
        "RECEIVE",
        "TAKE",
        "STEAL",
        "SELL",
        "BUY",
        "TRADE",
        "PAY",
        "LEND",
        "BORROW",
        "OFFER",
        "HAND",
        "PRESENT",
        "DELIVER",
        "SEND",
        "GRANT",
        "BESTOW",
        "AWARD",
        "RETURN_TO_OWNER",
        "EXCHANGE",
        "SHARE",
    ),
    PredicateClass.KINSHIP: (
        "BETROTHED",
        "WED",
        "PARENT",
        "CHILD",
        "SIBLING",
        "SPOUSE",
        "MARRY",
        "MOTHER",
        "FATHER",
        "SON",
        "DAUGHTER",
        "BROTHER",
        "SISTER",
        "ANCESTOR",
        "DESCENDANT",
        "KIN",
        "RELATIVE",
        "FAMILY",
        "WIFE",
        "HUSBAND",
        "UNCLE",
        "AUNT",
        "COUSIN",
        "NEPHEW",
        "NIECE",
        "GRANDPARENT",
        "ADOPT",
        "BETROTH",
    ),
    PredicateClass.AUTHORITY: (
        "DEMAND",
        "CONTROL",
        "ASSIGN",
        "COMMIT",
        "DEFY",
        "DISOBEY",
        "PETITION_FORMALLY",
        "SEEK_AUDIENCE",
        "COMMAND",
        "ORDER",
        "RULE",
        "GOVERN",
        "LEAD",
        "INSTRUCT",
        "DIRECT",
        "REPORT_TO",
        "SERVE",
        "OBEY",
        "APPOINT",
        "SUMMON",
        "DISMISS",
        "PROMOTE",
        "DEMOTE",
        "SUPERVISE",
        "OVERSEE",
        "AUTHORIZE",
        "PERMIT",
        "FORBID",
        "PROHIBIT",
        "SENTENCE",
        "JUDGE",
        "DECREE",
        "PRESIDE",
        "SUBMIT_TO",
        "DEFER_TO",
        "EMPLOY_AS",
        "MASTER",
        "DISCIPLE",
        "SUBORDINATE",
        "SUPERIOR",
    ),
    PredicateClass.CONFLICT: (
        "DOUBLE_CROSS",
        "TARGET",
        "RESTRAIN",
        "PINCH",
        "ASSAULT",
        "CONFLICT",
        "REVENGE",
        "BLOCK",
        "DECLINE",
        "OPPOSE_PHYSICALLY",
        "ARGUE",
        "UNBIND",
        "ATTACK",
        "FIGHT",
        "BATTLE",
        "STRIKE",
        "HIT",
        "BEAT",
        "CAPTURE",
        "SEIZE",
        "KILL",
        "SLAY",
        "WOUND",
        "INJURE",
        "DEFEAT",
        "CONQUER",
        "THREATEN",
        "CONFRONT",
        "OPPOSE",
        "RESIST",
        "IMPRISON",
        "BIND",
        "TRAP",
        "AMBUSH",
        "BESIEGE",
        "RAID",
        "PUNISH",
        "EXECUTE",
        "BEHEAD",
        "TORTURE",
        "ABDUCT",
        "KIDNAP",
        "BETRAY",
        "DECEIVE",
        "TRICK",
        "SUBDUE",
        "OVERPOWER",
        "REPEL",
        "DRIVE_AWAY",
        "EXPEL",
        "EXILE",
        "BANISH",
        "INTIMIDATE",
        "COERCE",
        "CHALLENGE",
        "COMPETE",
    ),
    PredicateClass.AID: (
        "CARE",
        "REASSURE",
        "CONSOLE",
        "ENCOURAGE",
        "PERSUADE",
        "HELP",
        "AID",
        "ASSIST",
        "RESCUE",
        "SAVE",
        "PROTECT",
        "GUARD",
        "SHIELD",
        "HEAL",
        "CURE",
        "SUPPORT",
        "DEFEND",
        "GUIDE",
        "ADVISE",
        "COUNSEL",
        "TEACH",
        "TRAIN",
        "COMFORT",
        "RELIEVE",
        "SPARE",
        "FORGIVE",
        "PARDON",
        "FREE",
        "RELEASE",
        "SHELTER",
        "PROVIDE",
        "NURSE",
        "TEND",
    ),
    PredicateClass.SOCIAL: (
        "CONSULT",
        "COMMUNICATE",
        "COLLABORATE",
        "INTERACT",
        "WELCOME",
        "ASSOCIATE",
        "COMPANION",
        "FRIEND",
        "SIGNAL",
        "PRAY",
        "GREET",
        "THANK",
        "MEET",
        "ENCOUNTER",
        "COORDINATE",
        "COOPERATE",
        "INVITE",
        "BOW",
        "ADDRESS",
        "CONVERSE",
        "TALK",
        "SPEAK_WITH",
        "APOLOGIZE",
        "SALUTE",
        "BID_FAREWELL",
        "INTRODUCE",
        "HOST",
        "ENTERTAIN",
        "CELEBRATE",
        "ALLY",
        "BEFRIEND",
        "PLAY_WITH",
    ),
    PredicateClass.SPEECH_NEUTRAL: (
        "SPEAK",
        "ENTREAT",
        "POINT",
        "RECITE_ALOUD",
        "RESPOND",
        "REACT",
        "UTTER",
        "COMMENT",
        "REFERENCE",
        "QUERY",
        "PLEAD",
        "PETITION",
        "APPEAL",
        "URGE",
        "RETORT",
        "POINT_OUT",
        "SING",
        "READ",
        "INTERROGATE",
        "DESCRIBE",
        "MENTION",
        "EXPLAIN",
        "REPORT",
        "INFORM",
        "RECOUNT",
        "IDENTIFY",
        "STATE",
        "SAY",
        "TELL",
        "ANSWER",
        "REPLY",
        "ASK",
        "QUESTION",
        "INQUIRE",
        "CLAIM",
        "ASSERT",
        "RECITE",
        "NARRATE",
        "DECLARE",
        "ANNOUNCE",
        "REMARK",
        "NOTE",
        "REFER",
        "QUOTE",
        "DISCUSS",
        "SUGGEST",
        "PROPOSE",
        "REQUEST",
        "BEG",
        "CALL",
        "NAME",
        "GREET_BY_NAME",
        "REVEAL",
        "DISCLOSE",
        "CONFESS",
    ),
    PredicateClass.SPEECH_APPROVING: (
        "ACCLAIM",
        "APPLAUD",
        "ASSURE",
        "PRAISE",
        "ACKNOWLEDGE",
        "ENDORSE",
        "COMPLIMENT",
        "COMMEND",
        "APPROVE",
        "AGREE",
        "CONFIRM",
        "CONSENT",
        "CONGRATULATE",
        "FLATTER",
        "ADMIRE_ALOUD",
        "RECOMMEND",
        "VOUCH",
    ),
    PredicateClass.SPEECH_CRITICAL: (
        "REFUSE",
        "DECRY",
        "TEASE",
        "ADMONISH",
        "REPRIMAND",
        "DENOUNCE",
        "ACCUSE",
        "CRITICIZE",
        "RIDICULE",
        "MOCK",
        "COMPLAIN",
        "INSULT",
        "BLAME",
        "REBUKE",
        "SCOLD",
        "OBJECT",
        "DENY",
        "CONTRADICT",
        "DISPUTE",
        "REFUTE",
        "REPROACH",
        "CONDEMN",
        "CURSE",
        "TAUNT",
        "SNEER",
        "DISMISS_CLAIM",
        "DISAGREE",
        "PROTEST",
        "CHIDE",
    ),
    PredicateClass.BELIEF: (
        "SEEK",
        "INVESTIGATE",
        "ATTEMPT",
        "BELIEVE",
        "KNOW",
        "SUSPECT",
        "DOUBT",
        "RECOGNIZE",
        "REALIZE",
        "ASSUME",
        "CONSIDER",
        "SPECULATE",
        "WONDER",
        "THINK",
        "UNDERSTAND",
        "REMEMBER",
        "RECALL",
        "FORGET",
        "LEARN",
        "DECIDE",
        "INTEND",
        "PONDER",
        "REASON",
        "CONCLUDE",
        "IMAGINE",
        "MISTAKE",
    ),
    PredicateClass.EMOTION: (
        "LAMENT",
        "WORSHIP",
        "MOURN",
        "DISLIKE",
        "TERRIFY",
        "FEAR",
        "LOVE",
        "HATE",
        "PITY",
        "ADMIRE",
        "RESENT",
        "TRUST",
        "DISTRUST",
        "ENVY",
        "MISS",
        "FRIGHTEN",
        "ANGER",
        "ENRAGE",
        "DELIGHT",
        "PLEASE",
        "ANNOY",
        "IRRITATE",
        "SADDEN",
        "COMFORT_EMOTIONALLY",
        "LONG_FOR",
        "DESIRE",
        "WANT",
        "ENJOY",
        "DREAD",
        "WORRY",
        "SHOCK",
        "SURPRISE",
        "AMUSE",
        "DISGUST",
        "RESPECT",
        "DESPISE",
    ),
    PredicateClass.PERCEPTION: (
        "OBSERVE",
        "SEE",
        "HEAR",
        "WATCH",
        "NOTICE",
        "LOOK",
        "PEEP",
        "PEER",
        "GLIMPSE",
        "SPOT",
        "SMELL",
        "TASTE_OF",
        "TOUCH",
        "FEEL",
        "LISTEN",
        "WITNESS",
        "EXAMINE",
        "INSPECT",
        "SEARCH",
        "DISCOVER",
        "FIND",
    ),
    PredicateClass.TRANSFORMATION: (
        "TRANSFORM",
        "BECOME",
        "CHANGE",
        "TURN",
        "GROW",
        "SHRINK",
        "DISGUISE",
        "REVERT",
        "MORPH",
        "AGE",
        "MATURE",
        "EVOLVE",
        "CONVERT",
        "SWELL",
        "EXPAND",
        "REDUCE",
        "ALTER",
        "REINCARNATE",
        "RESURRECT",
    ),
    PredicateClass.CREATION: (
        "CREATE",
        "MAKE",
        "BUILD",
        "WRITE",
        "AUTHOR",
        "FORGE",
        "CONSTRUCT",
        "PRODUCE",
        "COMPOSE",
        "DRAW",
        "PAINT",
        "PLANT",
        "COOK",
        "BREW",
        "CRAFT",
        "FORM",
        "GENERATE",
        "ESTABLISH",
        "FOUND",
        "DESIGN",
    ),
    PredicateClass.DESTRUCTION: (
        "DESTROY",
        "BREAK",
        "SHATTER",
        "BURN",
        "RUIN",
        "DEMOLISH",
        "WRECK",
        "TEAR",
        "SMASH",
        "CRUSH",
        "COLLAPSE",
        "SPOIL",
        "DAMAGE",
        "ERASE",
    ),
    PredicateClass.CAUSATION: (
        "CAUSE",
        "ENABLE",
        "PROMPT",
        "AFFECT",
        "TRIGGER",
        "PREVENT",
        "DISRUPT",
        "RESULT",
        "INFLUENCE",
        "PROVOKE",
        "INDUCE",
        "FORCE",
        "COMPEL",
        "ALLOW",
        "HINDER",
        "OBSTRUCT",
        "DELAY",
        "ACCELERATE",
        "CONTRIBUTE",
        "DEPEND",
        "REQUIRE",
        "NECESSITATE",
        "SILENCE",
        "AWAKEN",
        "INTERRUPT",
    ),
    PredicateClass.PARTICIPATION: (
        "INITIATE",
        "COMPLETE",
        "EXPERIENCE",
        "HARVEST",
        "OPERATE",
        "PARTICIPATE",
        "INVOLVE",
        "PERFORM",
        "UNDERGO",
        "ATTEND",
        "JOIN",
        "ENGAGE",
        "ENACT",
        "STAGE",
        "CONDUCT",
        "PLAY",
        "COMPETE_IN",
        "ORGANIZE",
        "PREPARE",
        "PRACTICE",
        "WORK",
        "ACT",
    ),
    PredicateClass.COMPOSITION: (
        "RELATE",
        "FEATURE",
        "ACCOMPANIED_BY",
        "HAS_COMPANION",
        "PART_OF",
        "CONTAIN",
        "COMPRISE",
        "MEMBER",
        "INCLUDE",
        "CONSIST",
        "COMPOSE_OF",
        "MADE_FROM",
        "MADE_OF",
        "SUBSET",
        "SEGMENT",
        "COLLECTION",
        "GROUP",
        "ELEMENT",
        "COMPONENT",
        "ENCOMPASS",
        "SUBSUME",
        "NEST",
    ),
    PredicateClass.IDENTITY: (
        "IMITATE",
        "MIMIC",
        "IDENTIFY_AS",
        "RESEMBLE",
        "COMPARE",
        "SYMBOLIZE",
        "REPRESENT",
        "SIGNIFY",
        "EMBODY",
        "EQUAL",
        "DIFFER",
        "CONTRAST",
        "MIRROR",
        "TYPIFY",
        "EXEMPLIFY",
        "LABEL",
        "MARK",
        "DENOTE",
        "TITLE",
        "ALIAS",
        "KNOWN_AS",
        "CALLED",
    ),
    PredicateClass.MANIPULATION: (
        "CONCEAL",
        "HIDE",
        "REVEAL_OBJECT",
        "OPEN",
        "CLOSE",
        "LOCK",
        "UNLOCK",
        "PUSH",
        "PULL",
        "LIFT",
        "DROP",
        "THROW",
        "PUT",
        "REMOVE",
        "ATTACH",
        "TIE",
        "UNTIE",
        "CUT",
        "FILL",
        "EMPTY",
        "COVER",
        "WRAP",
        "SHUT",
        "RAISE",
        "LOWER",
        "TURN_OVER",
        "SHAKE",
        "STIR",
        "POUR",
        "WAVE",
        "FOLD",
    ),
    PredicateClass.CONSUMPTION: (
        "SMOKE",
        "EAT",
        "DRINK",
        "CONSUME",
        "DEVOUR",
        "SWALLOW",
        "TASTE",
        "BITE",
        "NIBBLE",
        "FEED",
        "SIP",
        "INGEST",
        "STARVE",
    ),
    PredicateClass.FORESIGHT: (
        "PREDICT",
        "FORETELL",
        "FORESEE",
        "PROPHESY",
        "ANTICIPATE",
        "EXPECT",
        "WARN",
        "VOW",
        "PROMISE",
        "PLAN",
        "FORECAST",
        "PORTEND",
        "OMEN",
        "PLEDGE",
        "SWEAR",
        "THREATEN_FUTURE",
        "HOPE",
        "AWAIT",
        "DESTINE",
        "FATE",
        "PROPHECY",
        "ENVISION",
    ),
}

# Flattened stem -> family. First family to claim a stem keeps it; `classify`
# tries longer multi-segment stems before shorter ones, so `LEAD_TO` (MOTION)
# beats `LEAD` (AUTHORITY) and `TASTE_OF` (PERCEPTION) beats `TASTE` (eating).
_STEM_TO_CLASS: dict[str, PredicateClass] = {}
for _family, _family_stems in _FAMILIES.items():
    for _family_stem in _family_stems:
        _STEM_TO_CLASS.setdefault(_family_stem, _family)

# Tense/modal/aspect prefixes the model puts in front of the real verb:
# WILL_EXECUTE, WOULD_FETCH, IS_LOCATED_IN, HAS_TAKEN.
_LEADING_NOISE = re.compile(
    r"^(WILL|WOULD|SHALL|SHOULD|MAY|MIGHT|CAN|COULD|MUST|IS|WAS|ARE|WERE|"
    r"HAS|HAVE|HAD|BE|BEEN|BEING|DOES|DID|GETS|GET|BECOMES)_"
)
# Irregular forms the suffix rules cannot reach. Kept small and observed:
# TAUGHT appeared in the real miss list, the rest share its shape.
_IRREGULAR = {
    "TAKEN": "TAKE",
    "TOOK": "TAKE",
    "GIVEN": "GIVE",
    "GAVE": "GIVE",
    "WRITTEN": "WRITE",
    "WROTE": "WRITE",
    "SPOKEN": "SPEAK",
    "SPOKE": "SPEAK",
    "SEEN": "SEE",
    "SAW": "SEE",
    "KNOWN": "KNOW",
    "KNEW": "KNOW",
    "HELD": "HOLD",
    "TOLD": "TELL",
    "SENT": "SEND",
    "BROUGHT": "BRING",
    "CAUGHT": "CATCH",
    "FOUGHT": "FIGHT",
    "TAUGHT": "TEACH",
    "LED": "LEAD",
    "MADE": "MAKE",
    "WENT": "GO",
    "GONE": "GO",
    "CAME": "COME",
    "BOUGHT": "BUY",
    "SOLD": "SELL",
    "LOST": "LOSE",
    "FOUND": "FIND",
    "FLED": "FLEE",
    "STOLEN": "STEAL",
    "STOLE": "STEAL",
    "SLEW": "SLAY",
    "SLAIN": "SLAY",
    "BOUND": "BIND",
    "STRUCK": "STRIKE",
    "BORNE": "BEAR",
    "WORN": "WEAR",
    "DRUNK": "DRINK",
    "DRANK": "DRINK",
    "ATE": "EAT",
    "EATEN": "EAT",
    "FELL": "FALL",
    "FALLEN": "FALL",
    "BECAME": "BECOME",
    "SOUGHT": "SEEK",
    "THOUGHT": "THINK",
    "HEARD": "HEAR",
    "KEPT": "KEEP",
}

# Inflections to peel so ACCUSES/ACCUSED/ACCUSING all reach ACCUSE.
_INFLECTIONS = ("ING", "ED", "ES", "S", "D")


def _stem(token: str) -> set[str]:
    """Candidate uninflected forms of a single verb token."""
    out = {token}
    if (base := _IRREGULAR.get(token)) is not None:
        out.add(base)
    for suffix in _INFLECTIONS:
        if token.endswith(suffix) and len(token) >= len(suffix) + 2:
            base = token[: -len(suffix)]
            out.add(base)
            out.add(base + "E")  # CAUSING -> CAUS -> CAUSE
            if len(base) > 2 and base[-1] == base[-2]:
                out.add(base[:-1])  # STOPPED -> STOPP -> STOP
    for plural in ("IES", "IED"):
        if token.endswith(plural) and len(token) > 4:
            out.add(token[:-3] + "Y")  # PROPHESIES -> PROPHESY, MARRIED -> MARRY
    return out


def classify(predicate: str | None, relation: str | None = None) -> PredicateClass:
    """Map an open-vocabulary predicate onto a closed, queryable class.

    Resolution order, most specific first:

    1. the whole predicate as a stem (`PART_OF`, `REPORT_TO`)
    2. progressively shorter leading segments, so the model's habit of
       appending the object survives: `CAUSES_SNEEZING` -> CAUSE ->
       CAUSATION, `THREATENS_TO_BURN` -> THREATEN -> CONFLICT
    3. any single segment, for predicates that lead with a preposition or
       an adverb (`PRIVATELY_CRITICIZES`)
    4. `<RELATION>_OTHER`, or UNCLASSIFIED when the relation is unknown

    Never guesses: an unplaceable verb goes to `_OTHER`, and the share of
    edges there is the metric to drive down (see `coverage`).
    """
    if not predicate:
        return _OTHER_FOR_RELATION.get(str(relation or ""), PredicateClass.UNCLASSIFIED)

    normalized = re.sub(r"[\s\-]+", "_", predicate.strip()).upper()
    normalized = re.sub(r"[^A-Z0-9_]", "", normalized).strip("_")
    while True:
        stripped = _LEADING_NOISE.sub("", normalized)
        if stripped == normalized:
            break
        normalized = stripped
    if not normalized:
        return _OTHER_FOR_RELATION.get(str(relation or ""), PredicateClass.UNCLASSIFIED)

    segments = normalized.split("_")

    # 1 + 2: longest leading run of segments that resolves.
    for end in range(len(segments), 0, -1):
        candidate = "_".join(segments[:end])
        if (hit := _lookup(candidate)) is not None:
            return hit

    # 3: any single segment, longest first — catches adverb-led predicates.
    for segment in sorted(segments, key=len, reverse=True):
        if (hit := _lookup(segment)) is not None:
            return hit

    return _OTHER_FOR_RELATION.get(str(relation or ""), PredicateClass.UNCLASSIFIED)


def _lookup(candidate: str) -> PredicateClass | None:
    for form in _stem(candidate):
        if (hit := _STEM_TO_CLASS.get(form)) is not None:
            return hit
    # Multi-segment stems like `PART_OF` may need their own tail inflected.
    if "_" in candidate:
        head, _, tail = candidate.rpartition("_")
        for form in _stem(head):
            if (hit := _STEM_TO_CLASS.get(f"{form}_{tail}")) is not None:
                return hit
    return None


def coverage(
    predicates: list[tuple[str | None, str | None]],
) -> dict[str, float | int | dict[str, int]]:
    """Classify a corpus of (predicate, relation) pairs and score the vocabulary.

    `classified_rate` is the share of edges that reached a real family. It is
    the number to watch: an `_OTHER` bucket is not a bug, it is the honest
    residue, and it should shrink as the vocabulary earns its stems.
    """
    counts: dict[str, int] = {}
    placed = 0
    for predicate, relation in predicates:
        cls = classify(predicate, relation)
        counts[cls.value] = counts.get(cls.value, 0) + 1
        if not cls.value.endswith("_OTHER") and cls is not PredicateClass.UNCLASSIFIED:
            placed += 1
    total = len(predicates)
    return {
        "total": total,
        "classified": placed,
        "classified_rate": round(placed / total, 4) if total else 0.0,
        "classes_used": len(counts),
        "by_class": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
    }
