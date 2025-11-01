import { RequestHandler } from "express";
import { getTHash } from "./cookie";

interface Episode {
  id: string;
  title: string;
  season: string;
  episode: string;
  description: string;
  completed: string;
  duration: string;
}

export const handleEpisodes: RequestHandler = async (req, res) => {
  const { seriesId, seasonId } = req.query;

  if (!seriesId || typeof seriesId !== "string") {
    return res.status(400).json({ error: "Missing or invalid seriesId" });
  }

  if (!seasonId || typeof seasonId !== "string") {
    return res.status(400).json({ error: "Missing or invalid seasonId" });
  }

  try {
    // Get cookies
    const cookieHeader = await getTHash();

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

    console.log(
      `Fetching episodes for seriesId: ${seriesId}, seasonId: ${seasonId}`,
    );

    // Use pv path for amazon-prime when requested
    const service = typeof req.query.service === 'string' ? req.query.service : undefined;
    let episodesDomain = 'https://net51.cc/episodes.php';
    if (service === 'amazon-prime') episodesDomain = 'https://net51.cc/pv/episodes.php';
    if (service === 'jio-hotstar') episodesDomain = 'https://net51.cc/mobile/hs/episodes.php';
    const url = `${episodesDomain}?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(seriesId)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();
    console.log(
      `Episodes response status: ${response.status}, length: ${text.length}`,
    );

    if (!text) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    let jsonData: any;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error("Parse error:", e, "Text:", text.substring(0, 200));
      return res.status(500).json({ error: "Invalid JSON response from API" });
    }

    if (!jsonData.episodes || !Array.isArray(jsonData.episodes)) {
      return res.status(404).json({ error: "No episodes found" });
    }

    const episodes: Episode[] = jsonData.episodes.map((ep: any) => ({
      id: ep.id || "",
      title: ep.t || "Unknown",
      season: ep.s || "Unknown",
      episode: ep.ep || "Unknown",
      description: ep.ep_desc || "No description available",
      completed: ep.complate || "0",
      duration: ep.time || "Unknown",
    }));

    res.status(200).json({ episodes });
  } catch (error) {
    console.error("Episodes API error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch episodes. Please try again." });
  }
};
