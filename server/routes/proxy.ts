import { RequestHandler } from "express";
import { getPrimeToken } from "./cookie";

const PROXY_BASE_URL = "https://iosmirror.vflix.life/api/stream-proxy";
const NETFLIX_BASE_URL = "https://net51.cc/hls";
const DEFAULT_REFERER = "https://net51.cc";

export const handleProxy: RequestHandler = async (req, res) => {
  try {
    const { service, id } = req.query;

    // Validate inputs
    if (!service || !id) {
      return res.status(400).json({
        success: false,
        error:
          "Missing service or id parameter. Usage: /api/proxy?service=netflix&id=70270776",
      });
    }

    // Construct the target URL based on service
    let targetUrl: string;
    let refererUrl: string = DEFAULT_REFERER;

    if (service === "netflix") {
      targetUrl = `${NETFLIX_BASE_URL}/${id}.m3u8`;
    } else if (service === "amazon-prime" || service === "prime") {
      targetUrl = `https://net51.cc/pv/hls/${id}.m3u8`;
      refererUrl = "https://net51.cc";
    } else if (service === "jio-hotstar" || service === "jio") {
      targetUrl = `https://net51.cc/mobile/hs/hls/${id}.m3u8`;
      refererUrl = "https://net51.cc";
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported service: ${service}. Currently supported: netflix, amazon-prime, prime, jio-hotstar, jio`,
      });
    }

    // Get the prime token (contains 'in=...' format)
    const primeToken = await getPrimeToken();
    if (!primeToken) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch prime token",
      });
    }

    // Construct the referer header value
    const referer = req.query.referer || refererUrl;

    // Build the full proxy URL with the format:
    // https://iosmirror.vflix.life/api/stream-proxy?url=https://net51.cc/hls/70270776.m3u8?in=...&referer=...
    const targetUrlWithToken = `${targetUrl}?${primeToken}`;
    const encodedReferer = encodeURIComponent(String(referer));
    const proxyUrl = `${PROXY_BASE_URL}?url=${targetUrlWithToken}&referer=${encodedReferer}`;

    // Redirect to the final proxy URL
    res.redirect(proxyUrl);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate proxy URL",
    });
  }
};
