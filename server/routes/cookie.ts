import { RequestHandler } from "express";

let cachedSetCookieHeaders: string[] | null = null;
let cachedCookieHeader: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Combine all Set-Cookie headers into a single Cookie header string
export const formatCookieHeader = (setCookieHeaders: string[]): string => {
  return setCookieHeaders.join("; ");
};

export const getTHash = async (): Promise<string | null> => {
  // Return cached value if still valid
  if (cachedCookieHeader && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log("Using cached cookies");
    return cachedCookieHeader;
  }

  try {
    console.log("Fetching fresh cookies from net51.cc");
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

    // Store all cookies and format them for the Cookie header
    cachedSetCookieHeaders = setCookieHeaders;
    cachedCookieHeader = formatCookieHeader(setCookieHeaders);
    cacheTimestamp = Date.now();

    console.log("Successfully stored all Set-Cookie headers");
    console.log("Cookie header value:", cachedCookieHeader.substring(0, 200));

    return cachedCookieHeader;
  } catch (error) {
    console.error("Error fetching cookies:", error);
    return null;
  }
};

export const handleFetchCookie: RequestHandler = async (req, res) => {
  try {
    const setCookieHeader = await getTHash();
    if (setCookieHeader) {
      res.json({ success: true, setCookieHeader });
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
