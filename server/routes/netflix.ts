import { RequestHandler } from "express";
import { getTHash } from "./cookie";

interface Season {
  id: string;
  number: string;
  episodeCount: number;
}

interface NetflixResponse {
  title: string;
  year: string;
  language: string;
  category: "Movie" | "Series";
  genre: string;
  cast: string;
  description: string;
  rating: string;
  match: string;
  runtime: string;
  quality: string;
  creator?: string;
  director?: string;
  seasons?: Season[];
  contentWarning?: string;
}

// Exportable function to get Netflix details
export const getNetflixDetails = async (
  id: string,
  cookieHeader: string | null = null,
): Promise<NetflixResponse | null> => {
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
    const url = `https://net20.cc/post.php?id=${encodeURIComponent(id)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();

    if (!text) return null;

    let jsonData: any;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error("Parse error:", e);
      return null;
    }

    if (jsonData?.status !== "y") return null;
    if (!jsonData?.title) return null;

    const isSeriesData =
      Array.isArray(jsonData.season) && jsonData.season.length > 0;
    const category = isSeriesData ? "Series" : "Movie";

    const genre = jsonData.genre
      ? jsonData.genre.replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      : "Unknown";

    const castList = jsonData.short_cast || jsonData.cast || "Unknown";

    let seasons: Season[] | undefined;
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
              const episodeUrl = `https://net51.cc/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(id)}`;
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
              // Ignore
            }
          }

          return {
            id: season.id || season.sid || `${index + 1}`,
            number: season.num || season.number || `${index + 1}`,
            episodeCount: episodeCount,
            // Capture episodes array if available for later use
            episodes: season.episodes,
          } as Season & { episodes?: any[] };
        }),
      );
    }

    return {
      title: jsonData.title || "Unknown",
      year: jsonData.year || "Unknown",
      language: jsonData.d_lang || "Unknown",
      category,
      genre,
      cast: castList,
      description: jsonData.desc || "No description available",
      rating: jsonData.ua || "Not rated",
      match: jsonData.match || "N/A",
      runtime: jsonData.runtime || "Unknown",
      quality: jsonData.hdsd || "Unknown",
      creator: jsonData.creator || undefined,
      director: jsonData.director || undefined,
      seasons: seasons,
      contentWarning: jsonData.m_reason || undefined,
    };
  } catch (error) {
    console.error("Netflix fetch error:", error);
    return null;
  }
};

export const handleNetflix: RequestHandler = async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid ID" });
  }

  try {
    const cookieHeader = await getTHash();
    const result = await getNetflixDetails(id, cookieHeader);

    if (!result) {
      return res.status(404).json({ error: "Content not found on Netflix" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Netflix API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
