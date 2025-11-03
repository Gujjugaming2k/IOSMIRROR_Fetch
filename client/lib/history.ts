export type Provider = "netflix" | "amazon-prime" | "jio-hotstar";

export interface MovieHistoryItem {
  id: string;
  type: "movie";
  provider: Provider;
  name: string;
  movieId: string;
  link: string;
  fileName: string;
  filePath: string;
  folderPath: string;
  savedAt: string;
}

export interface SeriesHistoryItem {
  id: string;
  type: "series";
  provider: Provider;
  name: string;
  seriesId: string;
  seasons: Array<{
    seasonNumber: string;
    folderPath: string;
    files: Array<{ fileName: string; filePath: string; streamUrl: string }>;
  }>;
  totalFilesCreated: number;
  savedAt: string;
}

export type HistoryItem = MovieHistoryItem | SeriesHistoryItem;

const STORAGE_KEY = "streaming_history";

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HistoryItem[];
    return [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addMovieHistory(result: any, provider: Provider) {
  try {
    if (!result || !result.file || !result.file.streamUrl) return;
    const items = loadHistory();
    const id = `${provider}_movie_${result.movieId}_${Date.now()}`;
    const item: MovieHistoryItem = {
      id,
      type: "movie",
      provider,
      name: result.movieName || "Unknown",
      movieId: result.movieId || "",
      link: result.file.streamUrl,
      fileName: result.file.fileName,
      filePath: result.file.filePath,
      folderPath: result.folderPath,
      savedAt: result.generatedAt || new Date().toISOString(),
    };
    saveHistory([item, ...items]);
  } catch {}
}

export function addSeriesHistory(result: any, provider: Provider) {
  try {
    if (!result || !result.seasons || !Array.isArray(result.seasons)) return;
    const items = loadHistory();
    const id = `${provider}_series_${result.seriesId || ""}_${Date.now()}`;
    const seasons = result.seasons.map((s: any) => ({
      seasonNumber: String(s.seasonNumber ?? s.number ?? ""),
      folderPath: s.folderPath,
      files: Array.isArray(s.files)
        ? s.files.map((f: any) => ({
            fileName: f.fileName,
            filePath: f.filePath ?? f.path ?? "",
            streamUrl: f.streamUrl ?? f.content ?? "",
          }))
        : [],
    }));

    const item: SeriesHistoryItem = {
      id,
      type: "series",
      provider,
      name: result.seriesName || "Unknown",
      seriesId: result.seriesId || "",
      seasons,
      totalFilesCreated: Number(result.totalFilesCreated || 0),
      savedAt: result.generatedAt || new Date().toISOString(),
    };
    saveHistory([item, ...items]);
  } catch {}
}
