import { RequestHandler } from "express";
import { getTHash } from "./cookie";

interface JioHotstarAPIResponse {
  title: string;
  year: number | string;
  lang: Array<{ l: string } | string>;
  episodes?: any[];
  season?: string;
}

interface JioHotstarResponse {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
}

export const handleJioHotstar: RequestHandler = async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid ID" });
  }

  try {
    // Get all cookies formatted for the Cookie header
    const cookieHeader = await getTHash();

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    };

    // Use mobile/hs post.php endpoint
    const url = `https://net20.cc/mobile/hs/post.php?id=${encodeURIComponent(id)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();

    if (!text) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    let jsonData: any;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error(
        "JioHotstar parse error:",
        e,
        "Text:",
        text.substring(0, 300),
      );
      return res.status(500).json({ error: "Invalid JSON response from API" });
    }

    // Determine if it's a movie or series
    const isSeriesData =
      Array.isArray(jsonData.season) && jsonData.season.length > 0;
    const category = isSeriesData ? "Series" : "Movie";

    // Extract languages
    const languagesArray = jsonData.lang || [];
    const languages = Array.isArray(languagesArray)
      ? languagesArray
          .map((lang) => (typeof lang === "string" ? lang : lang.l || lang))
          .join(", ")
      : "Unknown";

    // Process seasons similarly to Netflix/Prime parsing
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

          // If still no count, try fetching episodes from mobile/hs episodes endpoint
          if (episodeCount === 0) {
            try {
              const seasonId = season.id || season.sid || `${index + 1}`;
              const episodeUrl = `https://net51.cc/mobile/hs/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(id)}`;
              const episodeResponse = await fetch(episodeUrl, {
                method: "GET",
                headers: fetchOptions.headers,
              });
              const episodeText = await episodeResponse.text();
              if (episodeText) {
                try {
                  const episodeData = JSON.parse(episodeText);
                  if (
                    episodeData.episodes &&
                    Array.isArray(episodeData.episodes)
                  ) {
                    episodeCount = episodeData.episodes.length;
                  }
                } catch (e) {
                  // ignore
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

    const result: JioHotstarResponse = {
      title: jsonData.title || "Unknown",
      year: (jsonData.year || "Unknown").toString(),
      languages: languages || "Unknown",
      category,
    };

    if (seasons) {
      // @ts-ignore
      (result as any).seasons = seasons;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("JioHotstar API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
