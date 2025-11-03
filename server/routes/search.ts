import { RequestHandler } from "express";

interface SearchResult {
  id: string;
  title: string;
  provider: "netflix" | "prime";
  poster: string;
  year?: string;
  duration?: string;
}

interface NetflixSearchResponse {
  searchResult?: Array<{
    id: string;
    t: string;
    y?: string;
    r?: string;
  }>;
  error?: string;
}

interface PrimeSearchResponse {
  searchResult?: Array<{
    id: string;
    t: string;
  }>;
}

const searchNetflix = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://net20.cc/search.php?s=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      console.error(`Netflix search failed with status ${response.status}`);
      return [];
    }

    const data: NetflixSearchResponse = await response.json();

    if (data.searchResult && Array.isArray(data.searchResult)) {
      return data.searchResult.map((item) => ({
        id: item.id,
        title: item.t,
        provider: "netflix" as const,
        poster: `https://wsrv.nl/?url=https://imgcdn.kim/poster/v/${encodeURIComponent(item.id)}.jpg&w=500`,
        year: item.y,
        duration: item.r,
      }));
    }
    return [];
  } catch (err) {
    console.error("Netflix search error:", err);
    return [];
  }
};

const searchPrime = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://net20.cc/pv/search.php?s=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      console.error(`Prime search failed with status ${response.status}`);
      return [];
    }

    const data: PrimeSearchResponse = await response.json();

    if (data.searchResult && Array.isArray(data.searchResult)) {
      return data.searchResult.map((item) => ({
        id: item.id,
        title: item.t,
        provider: "prime" as const,
        poster: `https://wsrv.nl/?url=https://imgcdn.kim/pv/v/${encodeURIComponent(item.id)}.jpg&w=500`,
      }));
    }
    return [];
  } catch (err) {
    console.error("Prime search error:", err);
    return [];
  }
};

export const handleUnifiedSearch: RequestHandler = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim() === "") {
    return res.status(400).json({ error: "Missing or empty search query" });
  }

  try {
    const [netflixResults, primeResults] = await Promise.all([
      searchNetflix(q),
      searchPrime(q),
    ]);

    const allResults = [...netflixResults, ...primeResults];

    return res.json({
      query: q,
      results: allResults,
      count: allResults.length,
    });
  } catch (err) {
    console.error("Unified search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const handleNetflixSearch: RequestHandler = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim() === "") {
    return res.status(400).json({ error: "Missing or empty search query" });
  }

  try {
    const results = await searchNetflix(q);

    return res.json({
      query: q,
      provider: "netflix",
      results,
      count: results.length,
    });
  } catch (err) {
    console.error("Netflix search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const handlePrimeSearch: RequestHandler = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim() === "") {
    return res.status(400).json({ error: "Missing or empty search query" });
  }

  try {
    const results = await searchPrime(q);

    return res.json({
      query: q,
      provider: "prime",
      results,
      count: results.length,
    });
  } catch (err) {
    console.error("Prime search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
