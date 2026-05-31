import { api, type Segment } from "./tauri";

export type { Segment };

export const DEFAULT_CATEGORIES = [
  "sponsor",
  "selfpromo",
  "interaction",
  "intro",
  "outro",
];

const segmentCache = new Map<string, Segment[]>();

export async function getSegments(
  videoId: string,
  categories: string[]
): Promise<Segment[]> {
  const key = `${videoId}:${categories.join(",")}`;
  if (segmentCache.has(key)) return segmentCache.get(key)!;

  const segments = await api.fetchSponsorSegments(videoId, categories);
  segmentCache.set(key, segments);
  return segments;
}

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function findActiveSegment(
  segments: Segment[],
  currentTime: number
): Segment | null {
  return (
    segments.find(
      (seg) => currentTime >= seg.segment[0] && currentTime < seg.segment[1]
    ) ?? null
  );
}
