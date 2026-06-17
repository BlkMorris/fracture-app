const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "...",
  mdash: "-",
  ndash: "-",
  nbsp: " ",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

const danglingEndings = /\b(and|as|at|because|but|by|for|from|if|in|of|on|or|over|than|that|the|to|while|with)$/i;
const summaryLead = /^(fracture\s+(is\s+)?(tracking|watching|monitoring|comparing|covering)|latest coverage\s+(shows|from|on)|sources\s+(are|say|show))\b/i;

export function normalizePlainText(value: string | null | undefined) {
  const text = String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, decodeEntity)
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, " - ")
    .replace(/\u2212/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.!?])$/g, "$1")
    .trim();

  return normalizeTerminalPunctuation(text);
}

export function normalizeHeadline(value: string | null | undefined, fallback = "Live story developing") {
  const clean = normalizePlainText(value)
    .replace(/\s+\|\s+[^|]{2,36}$/i, "")
    .replace(/\s+-\s+(AP|BBC|CNN|Fox News|NBC News|The Associated Press|Reuters|Washington Post|New York Times)$/i, "")
    .replace(/^breaking\s*:\s*/i, "")
    .replace(/^update\s*:\s*/i, "")
    .replace(/[.]+$/g, "")
    .trim();

  const candidate = firstSentence(clean).replace(/[.]+$/g, "").trim();
  const headline = candidate && !summaryLead.test(candidate) ? candidate : clean;
  const readable = polishSentenceCase(removeDanglingTail(headline));

  return readable || fallback;
}

export function normalizeSummary(value: string | null | undefined, fallback = "") {
  const clean = normalizePlainText(value);
  if (!clean) return fallback;
  return ensureSentenceEnd(clean);
}

export function headlineFromCandidates(candidates: Array<string | null | undefined>, fallback = "Live story developing") {
  for (const candidate of candidates) {
    const headline = normalizeHeadline(candidate, "");
    if (isReadableHeadline(headline)) return headline;
  }

  const first = candidates.map((candidate) => normalizeHeadline(candidate, "")).find(Boolean);
  return first || fallback;
}

export function truncatePlainText(value: string | null | undefined, maxLength = 128, options: { sentence?: boolean; headline?: boolean } = {}) {
  const clean = options.headline ? normalizeHeadline(value, "") : normalizePlainText(value);
  if (!clean || clean.length <= maxLength) return clean;

  if (options.sentence) {
    const sentence = firstSentence(clean);
    if (sentence && sentence.length <= maxLength) return ensureSentenceEnd(sentence);
  }

  const clipped = clean.slice(0, maxLength + 1);
  const boundary = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("?"),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf(";"),
    clipped.lastIndexOf(":"),
    clipped.lastIndexOf(","),
    clipped.lastIndexOf(" "),
  );
  const candidate = removeDanglingTail(clipped.slice(0, boundary > Math.floor(maxLength * 0.58) ? boundary : maxLength));
  const normalized = normalizePlainText(candidate).replace(/[,:;-]+$/g, "").trim();

  if (options.headline) return `${normalizeHeadline(normalized, "Live story developing")}...`;
  return ensureSentenceEnd(`${normalized}...`);
}

export function isReadableHeadline(value: string | null | undefined) {
  const clean = normalizePlainText(value);
  if (!clean) return false;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 4 || words.length > 20) return false;
  if (summaryLead.test(clean)) return false;
  if (danglingEndings.test(clean)) return false;
  if ((clean.match(/[.!?](?=\s|$)/g) ?? []).length > 1) return false;

  return /[a-z]/i.test(clean);
}

export function isLikelyEnglishText(value: string | null | undefined) {
  const clean = normalizePlainText(value);
  if (!clean) return false;

  const letters = clean.match(/\p{L}/gu) ?? [];
  if (letters.length < 12) return true;

  const nonLatinLetters = letters.filter((char) => !/\p{Script=Latin}/u.test(char));
  if (nonLatinLetters.length / letters.length > 0.08) return false;

  const asciiLetters = clean.match(/[A-Za-z]/g) ?? [];
  if (asciiLetters.length / letters.length < 0.86) return false;

  const words = clean.toLowerCase().match(/[a-z][a-z']*/g) ?? [];
  if (words.length < 5) return true;

  const englishSignals = words.filter((word) => englishFunctionWords.has(word)).length;
  const longLatinWords = words.filter((word) => word.length >= 4).length;

  return englishSignals >= 2 || (englishSignals >= 1 && longLatinWords >= 5) || words.length < 10;
}

function decodeEntity(match: string, entity: string) {
  const key = entity.toLowerCase();
  if (key[0] === "#") {
    const value = key[1] === "x" ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : match;
  }

  return htmlEntityMap[key] ?? match;
}

function firstSentence(value: string) {
  const match = value.match(/^.{18,220}?[.!?](?=\s|$)/);
  return match?.[0]?.trim() || value;
}

function removeDanglingTail(value: string) {
  let clean = value.replace(/\s+/g, " ").trim();
  while (danglingEndings.test(clean)) {
    clean = clean.replace(/\s+\S+$/g, "").trim();
  }
  return clean;
}

function ensureSentenceEnd(value: string) {
  const clean = normalizePlainText(value).replace(/[,;:-]+$/g, "").trim();
  if (!clean) return "";
  if (/[.!?)]$/.test(clean)) return clean;
  return `${clean}.`;
}

function normalizeTerminalPunctuation(value: string) {
  return value
    .replace(/([.!?]){3,}$/g, "...")
    .replace(/([!?]){2,}$/g, "$1")
    .replace(/\.{4,}/g, "...")
    .replace(/\s+\.{3}$/g, "...")
    .trim();
}

function polishSentenceCase(value: string) {
  const clean = normalizePlainText(value).trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const englishFunctionWords = new Set([
  "a",
  "about",
  "after",
  "all",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "more",
  "new",
  "not",
  "of",
  "on",
  "or",
  "over",
  "said",
  "says",
  "that",
  "the",
  "their",
  "this",
  "to",
  "under",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
]);
