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
    // Get the full Set-Cookie header
    const setCookieHeader = await getTHash();

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        ...(setCookieHeader && { Cookie: setCookieHeader }),
      },
    };

    // TODO: Replace with actual JioHotstar API endpoint
    const apiEndpoint = `https://api.example.com/jio-hotstar?id=${encodeURIComponent(id)}`;
    const response = await fetch(apiEndpoint, fetchOptions);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch data from JioHotstar API" });
    }

    const jsonData: JioHotstarAPIResponse = await response.json();

    // Extract data from response
    const episodes = jsonData.episodes || [];
    const season = jsonData.season;

    // Determine if it's a movie or series
    const category =
      !episodes || (Array.isArray(episodes) && episodes[0] === null) || !season
        ? "Movie"
        : "Series";

    // Extract and format languages
    const languagesArray = jsonData.lang || [];
    const languages = Array.isArray(languagesArray)
      ? languagesArray
          .map((lang) => (typeof lang === "string" ? lang : lang.l || lang))
          .join(", ")
      : "";

    const result: JioHotstarResponse = {
      title: jsonData.title || "Unknown",
      year: (jsonData.year || "Unknown").toString(),
      languages: languages || "Unknown",
      category,
    };

    res.json(result);
  } catch (error) {
    console.error("JioHotstar API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
