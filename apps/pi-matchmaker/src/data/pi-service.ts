// Pi digits service - fetches from pi.delivery API with local cache
const PI_API_BASE = "https://api.pi.delivery/v1/pi";

let cachedDigits = "";
let fetchedLength = 0;

// Fetch Pi digits from API, with caching
export async function fetchPiDigits(numDigits: number = 100000): Promise<string> {
  if (fetchedLength >= numDigits) return cachedDigits.slice(0, numDigits);

  try {
    // API supports up to 1000 digits per request, so batch
    const batchSize = 1000;
    const promises: Promise<string>[] = [];
    
    for (let start = fetchedLength; start < numDigits; start += batchSize) {
      const count = Math.min(batchSize, numDigits - start);
      // Skip the "3." by starting at position start (digits after decimal)
      promises.push(
        fetch(`${PI_API_BASE}?start=${start + 1}&numberOfDigits=${count}`)
          .then((r) => r.json())
          .then((data) => data.content as string)
      );
    }

    const chunks = await Promise.all(promises);
    cachedDigits = cachedDigits.slice(0, fetchedLength) + chunks.join("");
    fetchedLength = cachedDigits.length;
    return cachedDigits;
  } catch (error) {
    console.error("Failed to fetch Pi digits:", error);
    // Return whatever we have cached
    return cachedDigits;
  }
}

// Generate all date format variants for a given date
export function generateDateFormats(year: number, month: number, day: number): { format: string; value: string }[] {
  const y4 = String(year);
  const y2 = y4.slice(-2);
  const m2 = String(month).padStart(2, "0");
  const d2 = String(day).padStart(2, "0");
  const m1 = String(month);
  const d1 = String(day);

  return [
    { format: "YYYYMMDD", value: `${y4}${m2}${d2}` },
    { format: "MMDDYYYY", value: `${m2}${d2}${y4}` },
    { format: "DDMMYYYY", value: `${d2}${m2}${y4}` },
    { format: "YYMMDD", value: `${y2}${m2}${d2}` },
    { format: "MMDDYY", value: `${m2}${d2}${y2}` },
    { format: "MMDD", value: `${m2}${d2}` },
    { format: "DDMM", value: `${d2}${m2}` },
    { format: "MDD", value: `${m1}${d2}` },
    { format: "MYY", value: `${m1}${y2}` },
  ];
}

export interface SearchResult {
  format: string;
  query: string;
  position: number; // 1-indexed
  before: string;
  match: string;
  after: string;
}

// Find all format matches in Pi digits
export function findAllMatches(digits: string, year: number, month: number, day: number): SearchResult[] {
  const formats = generateDateFormats(year, month, day);
  const results: SearchResult[] = [];
  const contextSize = 15;

  for (const { format, value } of formats) {
    const idx = digits.indexOf(value);
    if (idx !== -1) {
      const position = idx + 1;
      results.push({
        format,
        query: value,
        position,
        before: digits.substring(Math.max(0, idx - contextSize), idx),
        match: value,
        after: digits.substring(idx + value.length, idx + value.length + contextSize),
      });
    }
  }

  // Sort by longest match first, then by earliest position
  results.sort((a, b) => b.query.length - a.query.length || a.position - b.position);
  return results;
}

// Advanced love compatibility calculation
export interface LoveResult {
  score: number; // 0-100
  level: string;
  emoji: string;
  description: string;
  details: {
    bestMatch1: SearchResult | null;
    bestMatch2: SearchResult | null;
    distanceScore: number;
    formatBonus: number;
    proximityBonus: number;
  };
}

export function calculateLoveScore(
  digits: string,
  y1: number, m1: number, d1: number,
  y2: number, m2: number, d2: number
): LoveResult {
  const matches1 = findAllMatches(digits, y1, m1, d1);
  const matches2 = findAllMatches(digits, y2, m2, d2);

  if (matches1.length === 0 || matches2.length === 0) {
    return {
      score: 50,
      level: "神秘缘分",
      emoji: "🌌",
      description: "你们的缘分超越了数字的维度，无法用圆周率衡量",
      details: { bestMatch1: null, bestMatch2: null, distanceScore: 0, formatBonus: 0, proximityBonus: 0 },
    };
  }

  // Find best pair (closest distance with longest format match)
  let bestScore = -1;
  let bestPair: [SearchResult, SearchResult] = [matches1[0], matches2[0]];

  for (const r1 of matches1) {
    for (const r2 of matches2) {
      const distance = Math.abs(r1.position - r2.position);
      const lengthBonus = (r1.query.length + r2.query.length) / 16; // normalized
      // Closer = higher score, longer match = higher score
      const pairScore = Math.max(0, 100 - Math.log10(distance + 1) * 20) * (0.5 + lengthBonus * 0.5);
      if (pairScore > bestScore) {
        bestScore = pairScore;
        bestPair = [r1, r2];
      }
    }
  }

  const [best1, best2] = bestPair;
  const distance = Math.abs(best1.position - best2.position);

  // Distance score (logarithmic scale, closer = better)
  const distanceScore = Math.max(0, Math.min(50, 50 - Math.log10(distance + 1) * 12));

  // Format bonus: longer format matches get more points
  const formatBonus = Math.min(25, ((best1.query.length + best2.query.length) / 16) * 25);

  // Proximity bonus: check if combined birthday appears nearby
  const combined = `${String(m1).padStart(2, "0")}${String(d1).padStart(2, "0")}${String(m2).padStart(2, "0")}${String(d2).padStart(2, "0")}`;
  const combinedIdx = digits.indexOf(combined);
  const proximityBonus = combinedIdx !== -1 ? 25 : Math.min(15, matches1.length + matches2.length);

  const score = Math.min(99, Math.round(distanceScore + formatBonus + proximityBonus));

  const levels = [
    { min: 90, level: "天作之合", emoji: "💫", desc: "命运将你们的名字刻在了圆周率最亲密的角落" },
    { min: 75, level: "心有灵犀", emoji: "💕", desc: "在无限的数字海洋中，你们的心跳同频共振" },
    { min: 60, level: "缘分天注定", emoji: "🌸", desc: "冥冥之中的安排，让两个数字如此和谐" },
    { min: 45, level: "千里姻缘", emoji: "🌙", desc: "虽有距离，但星辰大海终会让你们相遇" },
    { min: 30, level: "有缘千里", emoji: "🔮", desc: "这份距离恰好是浪漫的留白" },
    { min: 0, level: "无限可能", emoji: "✨", desc: "在无限中寻找彼此，这本身就是最浪漫的事" },
  ];

  const { level, emoji, desc } = levels.find((l) => score >= l.min)!;

  return {
    score,
    level,
    emoji,
    description: desc,
    details: {
      bestMatch1: best1,
      bestMatch2: best2,
      distanceScore: Math.round(distanceScore),
      formatBonus: Math.round(formatBonus),
      proximityBonus: Math.round(proximityBonus),
    },
  };
}
