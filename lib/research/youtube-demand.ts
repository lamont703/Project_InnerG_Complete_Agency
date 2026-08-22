import "server-only";

/**
 * What people actually typed into YouTube to reach this channel.
 *
 * WHY THIS IS WORTH A SEPARATE SOURCE. Every other input the Content agent has
 * comes from this site's own traffic, which only tells you what people who
 * already found you were looking for. YouTube search terms are demand from
 * outside — people looking for something in this industry who had never heard
 * of ShearQuery. That is the difference between optimising an audience and
 * finding one.
 *
 * The first pull made the point immediately: 452 of the channel's views came
 * from search, and the terms were "barbers charging too much", "barber prices
 * too high", "mgk hair transplant" — a pricing conversation nothing in the
 * publish queue addresses, plus leftovers from an earlier era of the channel.
 *
 * THE ANALYTICS LAG IS PART OF THE DATA, NOT A CAVEAT IN A COMMENT. YouTube
 * Analytics takes 24-72 hours to process, so a Short published yesterday
 * reports zero views while the Data API shows it has 452. An agent handed the
 * Analytics number alone would confidently conclude the newest posts had
 * flopped. So both are fetched, the recent view counts come from the Data API,
 * and the lag is passed in as a field the model has to read.
 *
 * FAILS SOFT, ALWAYS. YouTube is one input among several; a refresh-token
 * expiry must degrade the content research, never break it. Every failure path
 * returns `available: false` with the reason.
 */

const ANALYTICS_WINDOW_DAYS = 30;

export interface YouTubeDemand {
  available: boolean;
  unavailable_reason?: string;
  window?: { start: string; end: string };
  /** What people searched to find the channel. Real demand, from outside the site. */
  youtube_search_terms?: { term: string; views: number }[];
  /** Search against feed against everything else, so search can be put in proportion. */
  youtube_traffic_sources?: { source: string; views: number }[];
  /** Live counts from the Data API — NOT the lagged Analytics figures. */
  youtube_recent_videos?: { title: string; views: number; likes: number; published: string }[];
  youtube_data_freshness_note?: string;
}

async function accessToken(): Promise<string | null> {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) return null;
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // .toString(), not the URLSearchParams object itself. jsdom's Request
      // constructor rejects a URLSearchParams built in Node's realm — "Expected
      // init.body to be an instance of URLSearchParams" — so passing the object
      // works in Next.js and throws under the test environment, which meant this
      // whole source silently reported itself unavailable when tested. An
      // encoded string is accepted everywhere.
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        refresh_token: YOUTUBE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }).toString(),
      cache: "no-store",
    });
    const j = (await r.json()) as { access_token?: string };
    return j.access_token ?? null;
  } catch {
    return null;
  }
}

async function analytics(
  token: string,
  params: Record<string, string>,
): Promise<(string | number)[][]> {
  const r = await fetch(
    "https://youtubeanalytics.googleapis.com/v2/reports?" + new URLSearchParams(params),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const j = (await r.json()) as { rows?: (string | number)[][]; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.rows ?? [];
}

/**
 * Recent uploads with LIVE view counts.
 *
 * Deliberately the Data API rather than Analytics: this is the half that has to
 * be current, because it is what tells the agent whether a subject landed.
 */
async function recentVideos(token: string) {
  const search = await fetch(
    "https://www.googleapis.com/youtube/v3/search?" +
      new URLSearchParams({ part: "id", forMine: "true", type: "video", order: "date", maxResults: "10" }),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const sj = (await search.json()) as { items?: { id: { videoId: string } }[]; error?: { message: string } };
  if (sj.error) throw new Error(sj.error.message);
  const ids = (sj.items ?? []).map((i) => i.id.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const vids = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?" +
      new URLSearchParams({ part: "snippet,statistics", id: ids.join(",") }),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const vj = (await vids.json()) as {
    items?: { snippet: { title: string; publishedAt: string }; statistics: { viewCount?: string; likeCount?: string } }[];
    error?: { message: string };
  };
  if (vj.error) throw new Error(vj.error.message);
  return (vj.items ?? []).map((v) => ({
    title: v.snippet.title,
    views: Number(v.statistics.viewCount ?? 0),
    likes: Number(v.statistics.likeCount ?? 0),
    published: v.snippet.publishedAt.slice(0, 10),
  }));
}

export async function fetchYouTubeDemand(now: Date = new Date()): Promise<YouTubeDemand> {
  const token = await accessToken();
  if (!token) {
    return { available: false, unavailable_reason: "YouTube credentials missing or refresh failed." };
  }

  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - ANALYTICS_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  try {
    const [terms, sources, videos] = await Promise.all([
      analytics(token, {
        ids: "channel==MINE",
        startDate: start,
        endDate: end,
        metrics: "views",
        dimensions: "insightTrafficSourceDetail",
        filters: "insightTrafficSourceType==YT_SEARCH",
        sort: "-views",
        maxResults: "25",
      }),
      analytics(token, {
        ids: "channel==MINE",
        startDate: start,
        endDate: end,
        metrics: "views",
        dimensions: "insightTrafficSourceType",
        sort: "-views",
        maxResults: "15",
      }),
      recentVideos(token).catch(() => []),
    ]);

    return {
      available: true,
      window: { start, end },
      youtube_search_terms: terms.map(([term, views]) => ({ term: String(term), views: Number(views) })),
      youtube_traffic_sources: sources.map(([source, views]) => ({
        source: String(source),
        views: Number(views),
      })),
      youtube_recent_videos: videos,
      youtube_data_freshness_note:
        "youtube_search_terms and youtube_traffic_sources come from YouTube Analytics, which lags " +
        "24-72 hours — a video published in the last three days will be under-counted or absent there. " +
        "youtube_recent_videos carries LIVE counts from the Data API and is the one to judge recent " +
        "posts by. Never conclude a new post failed from the Analytics side.",
    };
  } catch (e) {
    return {
      available: false,
      unavailable_reason: e instanceof Error ? e.message.slice(0, 200) : String(e),
    };
  }
}
