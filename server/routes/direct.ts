import { RequestHandler } from "express";
import { getPrimeToken } from "./cookie";

export const handleDirectStream: RequestHandler = async (req, res) => {
    try {
        const { service, id } = req.query;

        if (!service || !id || typeof service !== 'string' || typeof id !== 'string') {
            return res.status(400).json({ error: "Missing service or id" });
        }

        // Determine target URL pattern based on service
        // Logic adapted from proxy.ts
        let targetUrl = "";

        if (service === "netflix") {
            targetUrl = `https://net51.cc/hls/${id}.m3u8`;
        } else if (service === "prime" || service === "amazon-prime") {
            targetUrl = `https://net51.cc/pv/hls/${id}.m3u8`;
        } else if (service === "jio" || service === "jio-hotstar") {
            targetUrl = `https://net51.cc/mobile/hs/hls/${id}.m3u8`;
        } else {
            return res.status(400).json({ error: "Unsupported service" });
        }

        const token = await getPrimeToken();
        if (!token) {
            return res.status(500).json({ error: "Failed to get token" });
        }

        // Appending token. Token format usually "in=...::..."
        const finalUrl = `${targetUrl}?${token}`;

        // Redirect to the direct source
        return res.redirect(finalUrl);

    } catch (error) {
        console.error("Direct stream error:", error);
        return res.status(500).json({ error: "Internal Error" });
    }
};
