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

export const handleNetflix: RequestHandler = async (req, res) => {
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
        Referer: "https://net51.cc/",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    };

    console.log(
      `Fetching Netflix data for ID: ${id}, with cookies: ${cookieHeader ? "yes" : "no"}`,
    );
    console.log("Request Cookie header length:", cookieHeader?.length || 0);
    const url = `https://net20.cc/post.php?id=${encodeURIComponent(id)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();
    console.log(
      `Response status: ${response.status}, length: ${text.length}, text: ${text.substring(0, 500)}`,
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

    // Log what we got
    console.log("API Response:", {
      status: jsonData?.status,
      hasTitle: !!jsonData?.title,
      hasYear: !!jsonData?.year,
      hasSeason: !!jsonData?.season,
      seasonCount: Array.isArray(jsonData?.season) ? jsonData.season.length : 0,
      firstSeasonKeys: Array.isArray(jsonData?.season)
        ? Object.keys(jsonData.season[0] || {})
        : [],
      firstSeasonData: Array.isArray(jsonData?.season)
        ? JSON.stringify(jsonData.season[0]).substring(0, 200)
        : null,
    });

    // Check if the API returned success status
    if (jsonData?.status !== "y") {
      return res.status(404).json({ error: "Content not found on Netflix" });
    }

    // Check if we have at least a title
    if (!jsonData?.title) {
      return res.status(404).json({ error: "No title data available" });
    }

    // Determine if it's a movie or series
    const isSeriesData =
      Array.isArray(jsonData.season) && jsonData.season.length > 0;
    const category = isSeriesData ? "Series" : "Movie";

    // Parse genre
    const genre = jsonData.genre
      ? jsonData.genre.replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      : "Unknown";

    // Get cast
    const castList = jsonData.short_cast || jsonData.cast || "Unknown";

    // Process seasons with IDs and episode counts
    let seasons: Season[] | undefined;
    if (isSeriesData && Array.isArray(jsonData.season)) {
      seasons = await Promise.all(
        jsonData.season.map(async (season: any, index: number) => {
          // Try multiple possible field names for episode count
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

          // If still no count and episodes array exists, use array length
          if (
            episodeCount === 0 &&
            season.episodes &&
            Array.isArray(season.episodes)
          ) {
            episodeCount = season.episodes.length;
          }

          // If still no count, try fetching episodes from the API
          if (episodeCount === 0) {
            try {
              const seasonId = season.id || season.sid || `${index + 1}`;
              const episodeUrl = `https://net51.cc/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(id)}`;
              const episodeResponse = await fetch(episodeUrl, {
                method: "GET",
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Accept: "application/json",
                  "Accept-Language": "en-US,en;q=0.9",
                  Referer: "https://net51.cc/",
                  ...(cookieHeader && { Cookie: cookieHeader }),
                },
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
                  // Episode parsing failed, keep episodeCount as is
                }
              }
            } catch (e) {
              // Episode fetch failed, keep episodeCount as is
            }
          }

          console.log(
            `Season ${season.number || index + 1}: episodeCount=${episodeCount}`,
          );
          if (index === 0) {
            console.log(
              `  Available fields in season object:`,
              Object.keys(season).join(", "),
            );
          }

          return {
            id: season.id || season.sid || `${index + 1}`,
            number: season.num || season.number || `${index + 1}`,
            episodeCount: episodeCount,
          };
        }),
      );
    }

    const result: NetflixResponse = {
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

    res.status(200).json(result);
  } catch (error) {
    console.error("Netflix API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
