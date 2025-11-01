import { RequestHandler } from "express";

let cachedTHash: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export const getTHash = async (): Promise<string | null> => {
  // Return cached value if still valid
  if (cachedTHash && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log("Using cached t_hash");
    return cachedTHash;
  }

  try {
    console.log("Fetching fresh t_hash from net51.cc");
    const response = await fetch("https://net51.cc/tv/p.php", {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    // Get all Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    console.log(
      "Set-Cookie headers count:",
      setCookieHeaders.length,
      setCookieHeaders.map((h) => h.substring(0, 100)),
    );

    if (setCookieHeaders.length === 0) {
      console.error("No Set-Cookie headers found");
      return null;
    }

    // Find the Set-Cookie header that contains t_hash
    for (const cookieHeader of setCookieHeaders) {
      console.log("Processing Set-Cookie header:", cookieHeader.substring(0, 150));
      const hashMatch = cookieHeader.match(/t_hash=([^;]*)/);
      if (hashMatch && hashMatch[1]) {
        cachedTHash = hashMatch[1];
        cacheTimestamp = Date.now();
        console.log("Successfully extracted t_hash. Length:", cachedTHash.length, "Value:", cachedTHash);
        return cachedTHash;
      }
    }

    console.error("Could not find t_hash in any Set-Cookie headers");
    return null;
  } catch (error) {
    console.error("Error fetching t_hash:", error);
    return null;
  }
};

export const handleFetchCookie: RequestHandler = async (req, res) => {
  try {
    const tHash = await getTHash();
    if (tHash) {
      res.json({ success: true, tHash });
    } else {
      res.status(500).json({ success: false, error: "Failed to fetch t_hash" });
    }
  } catch (error) {
    console.error("Cookie fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch cookie" });
  }
};

export const handleCookieStatus: RequestHandler = async (req, res) => {
  const tHash = await getTHash();
  res.json({
    status: tHash ? "success" : "failed",
    hasCookie: !!tHash,
    cached: !!cachedTHash && Date.now() - cacheTimestamp < CACHE_DURATION,
  });
};
