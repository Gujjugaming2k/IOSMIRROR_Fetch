import { RequestHandler } from "express";

let cachedSetCookieHeaders: string[] | null = null;
let cachedCookieHeader: string | null = null;
let cachedPrimeToken: string | null = null;
let cacheTimestamp: number = 0;
let tokenCacheTimestamp: number = 0;
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
    cached:
      !!cachedCookieHeader && Date.now() - cacheTimestamp < CACHE_DURATION,
  });
};

export const getPrimeToken = async (): Promise<string | null> => {
  // Return cached value if still valid
  if (cachedPrimeToken && Date.now() - tokenCacheTimestamp < CACHE_DURATION) {
    console.log("Using cached prime token");
    return cachedPrimeToken;
  }

  try {
    console.log("Fetching fresh prime token from net51.cc");

    // First get the cookie
    const cookieHeader = await getTHash();
    if (!cookieHeader) {
      console.error("Failed to get cookie for prime token");
      return null;
    }

    // Make request to get prime playlist
    const url =
      "https://net51.cc/pv/playlist.php?id=0IOXQJ1CQWMH3Y1FNVUO30OSME&tm=1761932966";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error("Invalid prime playlist response");
      return null;
    }

    // Extract the "in" value from the first item's sources
    for (const item of data) {
      if (item.sources && Array.isArray(item.sources)) {
        for (const source of item.sources) {
          const fileUrl = source.file || "";
          const match = fileUrl.match(
            /in=([a-f0-9]{32}::[a-f0-9]{32}::\d+::[a-z]+)/,
          );
          if (match) {
            let tokenValue = match[1];
            // Normalize the final segment to 'ni' (replace ::su, ::es, etc.)
            tokenValue = tokenValue.replace(/::[a-zA-Z]+$/i, "::ni");
            const primeToken = `in=${tokenValue}`;
            cachedPrimeToken = primeToken;
            tokenCacheTimestamp = Date.now();
            console.log("Successfully fetched prime token:", primeToken);
            return primeToken;
          }
        }
      }
    }

    console.error("Could not extract prime token from response");
    return null;
  } catch (error) {
    console.error("Error fetching prime token:", error);
    return null;
  }
};

export const handleFetchToken: RequestHandler = async (req, res) => {
  try {
    const primeToken = await getPrimeToken();
    if (primeToken) {
      res.json({ success: true, primeToken });
    } else {
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch prime token" });
    }
  } catch (error) {
    console.error("Token fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch token" });
  }
};
