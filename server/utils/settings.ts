import * as fs from "fs";
import * as path from "path";

export interface AppSettings {
  defaultBaseFolder: string;
  netflixBaseFolder?: string;
  amazonPrimeBaseFolder?: string;
  jioHotstarBaseFolder?: string;
}

const DATA_DIR = path.join(process.cwd(), "server", "data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: AppSettings = {
  defaultBaseFolder: path.join(process.cwd(), "OTT"),
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const base: AppSettings = {
          defaultBaseFolder:
            typeof parsed.defaultBaseFolder === "string" &&
            parsed.defaultBaseFolder.length > 0
              ? parsed.defaultBaseFolder
              : DEFAULT_SETTINGS.defaultBaseFolder,
          netflixBaseFolder:
            typeof parsed.netflixBaseFolder === "string" &&
            parsed.netflixBaseFolder.length > 0
              ? parsed.netflixBaseFolder
              : undefined,
          amazonPrimeBaseFolder:
            typeof parsed.amazonPrimeBaseFolder === "string" &&
            parsed.amazonPrimeBaseFolder.length > 0
              ? parsed.amazonPrimeBaseFolder
              : undefined,
          jioHotstarBaseFolder:
            typeof parsed.jioHotstarBaseFolder === "string" &&
            parsed.jioHotstarBaseFolder.length > 0
              ? parsed.jioHotstarBaseFolder
              : undefined,
        };
        return base;
      }
    }
  } catch (e) {
    // ignore and fall back to default
  }
  return { ...DEFAULT_SETTINGS };
}

export function setSettings(next: Partial<AppSettings>): AppSettings {
  // Start from current settings and merge
  const current = getSettings();
  const merged: AppSettings = {
    defaultBaseFolder: current.defaultBaseFolder,
    netflixBaseFolder: current.netflixBaseFolder,
    amazonPrimeBaseFolder: current.amazonPrimeBaseFolder,
    jioHotstarBaseFolder: current.jioHotstarBaseFolder,
  };

  const setPath = (val?: string) =>
    val && val.trim().length > 0 ? path.resolve(val.trim()) : undefined;

  if (typeof next.defaultBaseFolder === "string") {
    merged.defaultBaseFolder =
      setPath(next.defaultBaseFolder) || DEFAULT_SETTINGS.defaultBaseFolder;
  }
  if (typeof next.netflixBaseFolder === "string") {
    merged.netflixBaseFolder = setPath(next.netflixBaseFolder);
  }
  if (typeof next.amazonPrimeBaseFolder === "string") {
    merged.amazonPrimeBaseFolder = setPath(next.amazonPrimeBaseFolder);
  }
  if (typeof next.jioHotstarBaseFolder === "string") {
    merged.jioHotstarBaseFolder = setPath(next.jioHotstarBaseFolder);
  }

  ensureDataDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

export function getBaseFolderForService(service: string): string {
  const s = getSettings();
  const map: Record<string, string | undefined> = {
    netflix: s.netflixBaseFolder,
    "amazon-prime": s.amazonPrimeBaseFolder,
    "jio-hotstar": s.jioHotstarBaseFolder,
  };
  return path.resolve(map[service] || s.defaultBaseFolder);
}
