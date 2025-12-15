import { RequestHandler } from "express";
import { getNetflixDetails } from "./netflix";
import { getPrimeDetails } from "./amazon-prime";
import { searchNetflix, searchPrime } from "./search";
import { fetchCinemetaDetails } from "../utils/cinemeta";
import { findBestMatch } from "../utils/matcher";
import { getTHash } from "./cookie";

export const handleStremioStream: RequestHandler = async (req, res) => {
    const { service, type, id } = req.params;

    if (!service || !type || !id) {
        return res.status(400).json({ streams: [] });
    }

    // Parse ID (handle series id:season:episode)
    const [contentId, seasonStr, episodeStr] = id.split(":");
    const isSeries = type === "series";

    // Stremio expects streams array
    // If we return empty array, it just shows "No streams found"

    try {
        let internalId = contentId;
        let internalService = service; // "netflix" or "prime"

        // 1. Resolve IMDb ID if provided
        if (contentId.startsWith("tt")) {
            console.log(`Resolving IMDb ID ${contentId} for ${service}...`);
            const meta = await fetchCinemetaDetails(type, contentId);

            if (!meta) {
                console.log(`Failed to fetch metadata for ${contentId}`);
                return res.json({ streams: [] });
            }

            console.log(`Found metadata: ${meta.name} (${meta.year})`);

            let searchResults;
            if (service === "netflix") {
                searchResults = await searchNetflix(meta.name);
            } else if (service === "prime") {
                searchResults = await searchPrime(meta.name);
            } else {
                return res.json({ streams: [] });
            }

            const match = findBestMatch(meta, searchResults || []);

            if (!match) {
                console.log(`No match found for ${meta.name} on ${service}`);
                return res.json({ streams: [] });
            }

            console.log(`Matched to internal content: ${match.title} (${match.id})`);
            internalId = match.id;
        }

        // 2. Fetch details to get stream info (and episode ID for series)
        const cookieHeader = await getTHash();
        let streamUrl = "";
        let title = "";

        if (service === "netflix") {
            const details = await getNetflixDetails(internalId, cookieHeader);
            if (!details) return res.json({ streams: [] });

            title = details.title;

            if (isSeries) {
                if (!seasonStr || !episodeStr) return res.json({ streams: [] });

                // Find matching season
                const season = details.seasons?.find(s => parseInt(s.number) === parseInt(seasonStr));
                if (!season) return res.json({ streams: [] });

                // Check if we have episodes in the season object (populated by our refactored getNetflixDetails)
                // The current getNetflixDetails logic might need a tweak to ensure it returns specific episode ID
                // Currently it tries to fetch episode count. 
                // Strategy: We construct the Proxy URL. Proxy needs the *specific episode ID*.
                // internalId is the Show ID. 
                // We need to fetch episodes list for this season to get the real ID.

                // Actually, let's look at the proxy logic in streaming.ts:
                // `https://s.vflix.life/api/proxy?service={service}&id={episodeId}`

                // So we DO need the specific episode ID.
                // Let's use the season object to fetch episodes if not already there.
                // In `getNetflixDetails`, I added `episodes: season.episodes`. 
                // If `season.episodes` is missing/incomplete, we might need to fetch it explicitly like the frontend/episodes.ts does.

                // Let's try to fetch episodes for this season if we don't have the specific ID.
                // Construct URL to fetch specific season episodes:
                // https://net51.cc/episodes.php?s={season.id}&series={internalId}

                const seasonId = season.id;
                const episodeUrl = `https://net51.cc/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(internalId)}`;

                const epResp = await fetch(episodeUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Referer": "https://net51.cc/",
                        ...(cookieHeader && { Cookie: cookieHeader }),
                    }
                });

                const epData = await epResp.json();
                // epData.episodes is array of { id, episode, title, ... }

                const targetEp = epData.episodes?.find((e: any) => parseInt(e.episode) === parseInt(episodeStr));

                if (targetEp) {
                    streamUrl = `https://fetch.vflix.life/api/proxy?service=netflix&id=${targetEp.id}`;
                    title += ` S${seasonStr}E${episodeStr} - ${targetEp.title || "Episode " + episodeStr}`;
                } else {
                    console.log("Episode not found in season list");
                    return res.json({ streams: [] });
                }

            } else {
                // Movie
                streamUrl = `https://fetch.vflix.life/api/proxy?service=netflix&id=${internalId}`;
            }

        } else if (service === "prime") {
            const details = await getPrimeDetails(internalId, cookieHeader);
            if (!details) return res.json({ streams: [] });

            title = details.title;

            if (isSeries) {
                if (!seasonStr || !episodeStr) return res.json({ streams: [] });

                // Logic for Prime Seasons
                // Prime details also has seasons array.
                // @ts-ignore
                const seasons = details.seasons;
                const season = seasons?.find((s: any) => parseInt(s.number) === parseInt(seasonStr));

                if (!season) return res.json({ streams: [] });

                const seasonId = season.id;
                // Fetch episodes for prime
                const episodeUrl = `https://net51.cc/tv/pv/episodes.php?s=${encodeURIComponent(seasonId)}&series=${encodeURIComponent(internalId)}`;
                const epResp = await fetch(episodeUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Referer": "https://net51.cc/",
                        ...(cookieHeader && { Cookie: cookieHeader }),
                    }
                });

                const epData = await epResp.json();
                const targetEp = epData.episodes?.find((e: any) => parseInt(e.episode) === parseInt(episodeStr));

                if (targetEp) {
                    streamUrl = `https://fetch.vflix.life/api/proxy?service=prime&id=${targetEp.id}`;
                    title += ` S${seasonStr}E${episodeStr} - ${targetEp.title || "Episode " + episodeStr}`;
                } else {
                    return res.json({ streams: [] });
                }

            } else {
                // Movie - Prime movies also use valid IDs directly
                streamUrl = `https://fetch.vflix.life/api/proxy?service=prime&id=${internalId}`;
            }
        }

        if (!streamUrl) return res.json({ streams: [] });

        return res.json({
            streams: [
                {
                    name: `IOSMIRROR-${service.toUpperCase()}`,
                    title: title,
                    url: streamUrl
                }
            ]
        });

    } catch (error) {
        console.error("Stremio Handler Error:", error);
        return res.status(500).json({ streams: [] });
    }
};
