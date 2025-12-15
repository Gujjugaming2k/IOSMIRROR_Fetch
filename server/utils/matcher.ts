import { CinemetaMeta } from "./cinemeta";

interface SearchResult {
    id: string;
    title: string;
    year?: string;
    provider: "netflix" | "prime";
}

export const findBestMatch = (
    meta: CinemetaMeta,
    results: SearchResult[],
): SearchResult | null => {
    if (!results || results.length === 0) return null;

    // Normalize strings for comparison
    const normalize = (s: string) =>
        s
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, "");

    const metaTitle = normalize(meta.name);
    let metaYear = meta.year ? parseInt(meta.year.split("-")[0]) : null;

    // If year is null, try to extract from releaseInfo
    if (!metaYear && meta.releaseInfo) {
        const match = meta.releaseInfo.match(/\b\d{4}\b/);
        if (match) {
            metaYear = parseInt(match[0]);
        }
    }

    // 1. Exact Title Match + Year Match (within 1 year)
    const exactMatch = results.find((r) => {
        const rTitle = normalize(r.title);
        if (rTitle !== metaTitle) return false;

        if (metaYear && r.year) {
            const rYear = parseInt(r.year);
            if (!isNaN(rYear)) {
                return Math.abs(rYear - metaYear) <= 1;
            }
        }
        return true; // Match on title if year is missing
    });

    if (exactMatch) return exactMatch;

    // 2. Exact Title Match (ignore year)
    const titleMatch = results.find((r) => normalize(r.title) === metaTitle);
    if (titleMatch) return titleMatch;

    // 3. Fuzzy Match (Title contains) - REQUIRE year match if available
    // "Home Alone" is contained in "A Girl Walks Home Alone At Night", so we must use year to disambiguate
    const fuzzyMatch = results.find((r) => {
        const rTitle = normalize(r.title);
        // Check containment
        const isContained = rTitle.includes(metaTitle) || metaTitle.includes(rTitle);
        if (!isContained) return false;

        // If we have years for both, they MUST match for a fuzzy title match
        if (metaYear && r.year) {
            const rYear = parseInt(r.year);
            if (!isNaN(rYear)) {
                return Math.abs(rYear - metaYear) <= 1; // Strict year match (+/- 1 year)
            }
        }

        // If year is missing on one side, be conservative
        // Only match if the title length difference is small (e.g. "The Matrix" vs "Matrix")
        // "Home Alone" (10 chars) vs "A Girl Walks Home Alone At Night" (32 chars) -> Diff 22 chars. Too big.
        if (Math.abs(rTitle.length - metaTitle.length) > 5) return false;

        return true;
    });

    if (fuzzyMatch && metaTitle.length > 3) return fuzzyMatch;

    return null;
};
