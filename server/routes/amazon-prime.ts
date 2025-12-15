import { RequestHandler } from "express";
import { getTHash } from "./cookie";

interface AmazonPrimeAPIResponse {
  title: string;
  year: number | string;
  lang: Array<{ l: string } | string>;
  episodes?: any[];
  season?: any;
  [key: string]: any;
}

interface AmazonPrimeResponse {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
  lang?: any[]; // Allow lang to be passed through
}

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const CACHE_PATH = path.join(DATA_DIR, "amazon-prime-posters-cache.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCache(pathName = CACHE_PATH) {
  try {
    if (fs.existsSync(pathName)) {
      const raw = fs.readFileSync(pathName, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return { slider: [], items: [], lastUpdated: 0 };
}

function writeCache(data: any, pathName = CACHE_PATH) {
  ensureDataDir();
  fs.writeFileSync(pathName, JSON.stringify(data, null, 2), "utf-8");
}

export const handleGetAmazonPrimePosters: RequestHandler = (_req, res) => {
  const cache = readCache();
  res.json({
    success: true,
    slider: cache.slider || [],
    items: cache.items || [],
    lastUpdated: cache.lastUpdated || 0,
  });
};

export const handleRefreshAmazonPrimePosters: RequestHandler = async (
  _req,
  res,
) => {
  try {
    // fetch homepage JSON
    let cookieHeader: string | null = null;
    try {
      cookieHeader = await getTHash();
    } catch (_) {
      cookieHeader = null;
    }

    const headers: any = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.158 Safari/537.36 /OS.Gatu v3.0",
      Accept: "application/json",
      "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
      Referer: "https://net51.cc/",
    };
    if (cookieHeader) headers.Cookie = cookieHeader;

    const response = await fetch("https://net51.cc/tv/pv/homepage.php", {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch amazon prime homepage");
    const text = await response.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("amazon homepage parse error", e, text.substring(0, 500));
      return res
        .status(500)
        .json({ success: false, error: "Invalid JSON from homepage" });
    }

    const slider: any[] = Array.isArray(json.slider)
      ? json.slider.map((s: any) => ({
        id: s.id || null,
        poster: s.img || null,
        desc: s.desc || "",
        ua: s.ua || "",
        namelogo: s.namelogo || null,
      }))
      : [];

    // flatten post ids into individual poster entries
    const items: Array<{ id: string; poster: string; cate?: string }> = [];
    const seen = new Set<string>();
    if (Array.isArray(json.post)) {
      for (const group of json.post) {
        if (!group || !group.ids) continue;
        const cate = group.cate || "";
        const ids = String(group.ids)
          .split(",")
          .map((i: string) => i.trim())
          .filter(Boolean);
        for (const id of ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          // construct poster URL using wsrv.nl wrapper for resizing
          const poster = `https://wsrv.nl/?url=https://imgcdn.kim/pv/v/${encodeURIComponent(id)}.jpg&w=500`;
          items.push({ id, poster, cate });
        }
      }
    }

    const cache = readCache();
    const existingIds = new Set((cache.items || []).map((i: any) => i.id));

    const merged = items.map((it) => ({
      id: it.id,
      poster: it.poster,
      cate: it.cate,
      seen: existingIds.has(it.id),
    }));

    const now = Date.now();
    const out = { slider, items: merged, lastUpdated: now };
    writeCache(out);

    const newCount = merged.filter((i: any) => !i.seen).length;
    res.json({
      success: true,
      slider,
      items: merged,
      lastUpdated: now,
      newCount,
    });
  } catch (err) {
    console.error("refresh amazon prime posters error", err);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to refresh amazon prime posters",
      });
  }
};

export const handleMarkAmazonPrimePosters: RequestHandler = (req, res) => {
  try {
    const ids: string[] = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids))
      return res
        .status(400)
        .json({ success: false, error: "ids array required" });

    const cache = readCache();
    const items = (cache.items || []).map((it: any) => ({
      ...it,
      seen: ids.includes(it.id) ? true : it.seen,
    }));
    const out = { slider: cache.slider || [], items, lastUpdated: Date.now() };
    writeCache(out);
    res.json({ success: true, items });
  } catch (err) {
    console.error("mark amazon prime posters error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark amazon prime posters" });
  }
};

export const getPrimeDetails = async (
  id: string,
  cookieHeader: string | null = null,
): Promise<AmazonPrimeAPIResponse | null> => {
  const fetchOptions: RequestInit = {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://net51.cc/",
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
  };

  try {
    const url = `https://net20.cc/pv/post.php?id=${encodeURIComponent(id)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();
    if (!text) return null;

    let jsonData: any;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error("Amazon parse error:", e);
      return null;
    }

    const isSeriesData =
      Array.isArray(jsonData.season) && jsonData.season.length > 0;
    const category = isSeriesData ? "Series" : "Movie";

    const languagesArray = jsonData.lang || [];
    const languages = Array.isArray(languagesArray)
      ? languagesArray
        .map((lang) => (typeof lang === "string" ? lang : lang.l || lang))
        .join(", ")
      : "Unknown";

    let seasons: any[] | undefined;
    if (isSeriesData && Array.isArray(jsonData.season)) {
      seasons = await Promise.all(
        jsonData.season.map(async (season: any, index: number) => {
          let episodeCount = 0;
          const countValue =
            season.ep_count ||
            season.total_episodes ||
            season.episode_count ||
            season.eps ||
            season.epCount ||
            season.episodes_count ||
            season.episode_count_total ||
            season.totalEpisodes ||
            season.count;

          if (countValue) {
            const parsed = parseInt(String(countValue), 10);
            if (!isNaN(parsed) && parsed > 0) {
              episodeCount = parsed;
            }
          }

          if (
            episodeCount === 0 &&
            season.episodes &&
            Array.isArray(season.episodes)
          ) {
            episodeCount = season.episodes.length;
          }

          if (episodeCount === 0) {
            try {
              const seasonId = season.id || season.sid || `${index + 1}`;
              const episodeUrl = `https://net51.cc/pv/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(id)}`;
              const episodeResponse = await fetch(episodeUrl, {
                method: "GET",
                headers: fetchOptions.headers,
              });
              const episodeText = await episodeResponse.text();
              if (episodeText) {
                const episodeData = JSON.parse(episodeText);
                if (
                  episodeData.episodes &&
                  Array.isArray(episodeData.episodes)
                ) {
                  episodeCount = episodeData.episodes.length;
                }
              }
            } catch (e) {
              // ignore
            }
          }

          return {
            id: season.id || season.sid || `${index + 1}`,
            number: season.num || season.number || `${index + 1}`,
            episodeCount,
          };
        }),
      );
    }

    const result: AmazonPrimeResponse = {
      title: jsonData.title || "Unknown",
      year: (jsonData.year || "Unknown").toString(),
      languages: languages || "Unknown",
      category,
    };

    if (seasons) {
      // @ts-ignore
      (result as any).seasons = seasons;
    }

    return result as AmazonPrimeAPIResponse;
  } catch (error) {
    console.error("Amazon fetch error:", error);
    return null;
  }
};

export const handleAmazonPrime: RequestHandler = async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid ID" });
  }

  try {
    const cookieHeader = await getTHash();
    const result = await getPrimeDetails(id, cookieHeader);

    if (!result) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Amazon Prime API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
