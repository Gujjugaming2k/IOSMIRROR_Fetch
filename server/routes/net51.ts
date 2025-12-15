import { RequestHandler } from "express";
import { RequestHandler } from "express";
import { getTHash } from "./cookie";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const CACHE_PATH = path.join(DATA_DIR, "top10-cache.json");
const ALL_CACHE_PATH = path.join(DATA_DIR, "all-posters-cache.json");

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
  return { items: [], lastUpdated: 0 };
}

function wrapPosterUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  if (url.includes("wsrv.nl/")) return url;
  // If it's an imgcdn.kim url, wrap it
  if (url.includes("imgcdn.kim/poster/")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=500`;
  }
  return url;
}

function writeCache(data: any, pathName = CACHE_PATH) {
  ensureDataDir();
  fs.writeFileSync(pathName, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchRemoteTop10() {
  const html = await fetchHomeHtml();
  const items: { id: string; poster: string }[] = [];
  const regex =
    /<div[^>]*class=["'][^"']*top10-post[^"']*["'][^>]*data-post=["'](\d+)["'][\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html))) {
    const id = m[1];
    const poster = `https://wsrv.nl/?url=https://imgcdn.kim/poster/v/${encodeURIComponent(id)}.jpg&w=500`;
    items.push({ id, poster });
  }
  return items;
}

async function fetchRemoteAllPosters() {
  const html = await fetchHomeHtml();
  const items: Array<{ id: string; poster: string }> = [];

  // first try anchors with data-post + img inside
  const regex =
    /<a[^>]*data-post=["'](\d+)["'][^>]*>[\s\S]*?<img[^>]*data-src=["'](https:\/\/imgcdn\.kim\/poster\/v\/(\d+)\.jpg)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = regex.exec(html))) {
    const id = m[1] || m[3];
    const poster = `https://wsrv.nl/?url=${encodeURIComponent(m[2])}&w=500`;
    if (id && m[2] && !seen.has(id)) {
      seen.add(id);
      items.push({ id, poster });
    }
  }

  // fallback: find any img with poster v/{id}.jpg
  const imgRegex = /https:\/\/imgcdn\.kim\/poster\/v\/(\d+)\.jpg/gi;
  while ((m = imgRegex.exec(html))) {
    const id = m[1];
    const poster = `https://wsrv.nl/?url=https://imgcdn.kim/poster/v/${encodeURIComponent(id)}.jpg&w=500`;
    if (!seen.has(id)) {
      seen.add(id);
      items.push({ id, poster });
    }
  }

  return items;
}

async function fetchHomeHtml() {
  let cookieHeader: string | null = null;
  try {
    cookieHeader = await getTHash();
  } catch (_) {
    cookieHeader = null;
  }

  const headers: any = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.158 Safari/537.36 /OS.Gatu v3.0",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
    Connection: "keep-alive",
    Host: "net51.cc",
    "Upgrade-Insecure-Requests": "1",
  };
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await fetch("https://net51.cc/mobile/home?app=1", {
    method: "GET",
    headers,
  });
  if (!response.ok) throw new Error("Failed to fetch remote");
  return await response.text();
}

export const handleGetCachedTop10: RequestHandler = (_req, res) => {
  const cache = readCache();
  const items = (cache.items || []).map((it: any) => ({
    ...it,
    poster: wrapPosterUrl(it.poster) || it.poster,
  }));
  res.json({
    success: true,
    items,
    lastUpdated: cache.lastUpdated || 0,
  });
};

export const handleRefreshTop10: RequestHandler = async (_req, res) => {
  try {
    const remote = await fetchRemoteTop10();
    const cache = readCache();
    const existingIds = new Set((cache.items || []).map((i: any) => i.id));

    const merged = remote.map((it) => ({
      id: it.id,
      poster: it.poster,
      seen: existingIds.has(it.id),
    }));

    const now = Date.now();
    const out = { items: merged, lastUpdated: now };
    writeCache(out);

    const newCount = merged.filter((i: any) => !i.seen).length;
    res.json({ success: true, items: merged, lastUpdated: now, newCount });
  } catch (err) {
    console.error("refresh top10 error", err);
    res.status(500).json({ success: false, error: "Failed to refresh" });
  }
};

export const handleMarkTop10: RequestHandler = (req, res) => {
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
    const out = { items, lastUpdated: Date.now() };
    writeCache(out);
    res.json({ success: true, items });
  } catch (err) {
    console.error("mark top10 error", err);
    res.status(500).json({ success: false, error: "Failed to mark" });
  }
};

// --- All posters handlers ---
export const handleGetAllPosters: RequestHandler = (_req, res) => {
  const cache = readCache(ALL_CACHE_PATH);
  const items = (cache.items || []).map((it: any) => ({
    ...it,
    poster: wrapPosterUrl(it.poster) || it.poster,
  }));
  res.json({
    success: true,
    items,
    lastUpdated: cache.lastUpdated || 0,
  });
};

export const handleRefreshAllPosters: RequestHandler = async (_req, res) => {
  try {
    const remote = await fetchRemoteAllPosters();
    const cache = readCache(ALL_CACHE_PATH);
    const existingIds = new Set((cache.items || []).map((i: any) => i.id));

    const merged = remote.map((it) => ({
      id: it.id,
      poster: it.poster,
      seen: existingIds.has(it.id),
    }));

    const now = Date.now();
    const out = { items: merged, lastUpdated: now };
    writeCache(out, ALL_CACHE_PATH);

    const newCount = merged.filter((i: any) => !i.seen).length;
    res.json({ success: true, items: merged, lastUpdated: now, newCount });
  } catch (err) {
    console.error("refresh all posters error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to refresh all posters" });
  }
};

export const handleMarkAllPosters: RequestHandler = (req, res) => {
  try {
    const ids: string[] = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids))
      return res
        .status(400)
        .json({ success: false, error: "ids array required" });

    const cache = readCache(ALL_CACHE_PATH);
    const items = (cache.items || []).map((it: any) => ({
      ...it,
      seen: ids.includes(it.id) ? true : it.seen,
    }));
    const out = { items, lastUpdated: Date.now() };
    writeCache(out, ALL_CACHE_PATH);
    res.json({ success: true, items });
  } catch (err) {
    console.error("mark all posters error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark all posters" });
  }
};
