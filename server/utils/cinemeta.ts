export interface CinemetaMeta {
    id: string;
    type: string;
    name: string;
    year?: string;
    releaseInfo?: string;
}

export const fetchCinemetaDetails = async (
    type: string,
    imdbId: string,
): Promise<CinemetaMeta | null> => {
    try {
        const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Cinemeta fetch failed: ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (!data || !data.meta) {
            return null;
        }

        return {
            id: data.meta.id,
            type: data.meta.type,
            name: data.meta.name,
            year: data.meta.year,
            releaseInfo: data.meta.releaseInfo
        };
    } catch (error) {
        console.error("Error fetching Cinemeta details:", error);
        return null;
    }
};
