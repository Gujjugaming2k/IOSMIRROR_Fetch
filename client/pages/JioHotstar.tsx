import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  AlertCircle,
  Loader2,
  Check,
  Play,
  Tv,
  Film,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCookie } from "@/hooks/useCookie";
import { useToken } from "@/hooks/useToken";
import { useEffect, useState } from "react";

interface Season {
  id: string;
  number: string;
  episodeCount: number;
}

interface Episode {
  id: string;
  title: string;
  season: string;
  episode: string;
}

interface HotstarData {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
  seasons?: Season[];
}

export default function JioHotstar() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<HotstarData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Per-service save location (JioHotstar)
  const [savePath, setSavePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json && json.settings) {
          const s = json.settings;
          setSavePath(s.jioHotstarBaseFolder || s.defaultBaseFolder || "");
        }
      } catch (_) {
        // ignore
      }
    };
    load();
  }, []);

  const handleSavePath = async () => {
    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jioHotstarBaseFolder: savePath }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed");
      setSaveStatus("Saved");
    } catch (_) {
      setSaveStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Cookie/token hooks (auto-fetch)
  const {
    tHash,
    loading: cookieLoading,
    error: cookieError,
    fetchCookie,
    hasCookie,
  } = useCookie();
  const {
    primeToken,
    loading: tokenLoading,
    error: tokenError,
    fetchToken,
    hasToken,
  } = useToken();

  useEffect(() => {
    (async () => {
      if (!hasCookie) {
        await fetchCookie();
      }
      if (hasCookie && !hasToken) {
        await fetchToken();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id.trim()) {
      setError("Please enter an ID");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(
        `/api/jio-hotstar?id=${encodeURIComponent(id)}`,
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to fetch data");
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSeason = async (season: Season) => {
    setSelectedSeason(season);
    setEpisodesLoading(true);

    try {
      const response = await fetch(
        `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}&service=jio-hotstar`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch episodes");
      }

      const fetchedEpisodes = result.episodes || [];
      setEpisodes(fetchedEpisodes);

      if (fetchedEpisodes.length > 0) {
        await generateStrmFiles([
          {
            number: season.number,
            id: season.id,
            episodes: fetchedEpisodes,
          },
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch episodes. Please try again.",
      );
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handleFetchAllSeasons = async () => {
    if (!data?.seasons || data.seasons.length === 0) return;

    setSelectedSeason(null);
    setEpisodes([]);
    setEpisodesLoading(true);

    try {
      const allEpisodes: Episode[] = [];
      const seasonData: any[] = [];

      for (const season of data.seasons) {
        const response = await fetch(
          `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}&service=jio-hotstar`,
        );

        const result = await response.json();

        if (response.ok && result.episodes) {
          allEpisodes.push(...result.episodes);
          seasonData.push({
            number: season.number,
            id: season.id,
            episodes: result.episodes,
          });
        }
      }

      setEpisodes(allEpisodes);

      if (seasonData.length > 0) {
        await generateStrmFiles(seasonData);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch episodes. Please try again.",
      );
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const generateStrmFiles = async (seasonData: any[]) => {
    try {
      const primeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("prime_token")
          : null;

      const response = await fetch("/api/generate-strm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "jio-hotstar",
          seriesName: data?.title || "Unknown",
          seriesId: id,
          seasons: seasonData,
          primeToken: primeToken || null,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to generate .strm files");

      setHistory([result, ...history]);
      setShowHistory(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate .strm files. Please try again.",
      );
    }
  };

  const handleFetchMovie = async () => {
    if (!data?.title) return;

    setEpisodesLoading(true);

    try {
      const primeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("prime_token")
          : null;

      const response = await fetch("/api/generate-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "jio-hotstar",
          movieName: data.title,
          movieId: id,
          primeToken: primeToken || null,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to generate movie file");

      setSuccessMsg(
        `Generated ${result.file?.fileName || "file"} in ${result.folderPath || "Movies folder"}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate movie file. Please try again.",
      );
    } finally {
      setEpisodesLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <Link to="/">
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-white">JioHotstar Search</h1>

          <div className="w-24" />
        </div>

        <div className="max-w-2xl mx-auto px-6 py-12">
          <form onSubmit={handleSearch} className="mb-12">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
              <label className="block text-white font-semibold mb-4">
                Enter JioHotstar ID
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter ID"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setError("");
                  }}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 text-white border-0 px-8"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Save Location for JioHotstar */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-8">
            <label className="block text-white font-semibold mb-2">
              Save Location
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Base folder path"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500"
                disabled={saving}
              />
              <Button
                onClick={handleSavePath}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 text-white border-0 px-8"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
              </Button>
            </div>
            {saveStatus && (
              <p className="text-slate-400 text-sm mt-2">{saveStatus}</p>
            )}
          </div>

          {error && (
            <Alert className="mb-8 bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <AlertDescription className="text-red-200 ml-3">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-green-500/30 shadow-lg shadow-green-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-500/20 rounded-full p-3">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Found!</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">
                      TITLE
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {data.title}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm font-medium mb-2">
                        YEAR
                      </p>
                      <p className="text-xl font-semibold text-white">
                        {data.year}
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm font-medium mb-2">
                        CATEGORY
                      </p>
                      <p className="text-xl font-semibold">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${data.category === "Movie" ? "bg-blue-500/30 text-blue-300" : "bg-purple-500/30 text-purple-300"}`}
                        >
                          {data.category}
                        </span>
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm font-medium mb-2">
                        ID
                      </p>
                      <p className="text-xl font-semibold text-white">{id}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">
                      LANGUAGES
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.languages.split(",").map((lang, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg text-sm"
                        >
                          {lang.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {data.category === "Movie" && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Play className="w-5 h-5 text-slate-400" />
                    <p className="text-slate-400 text-sm font-medium">
                      STREAMING
                    </p>
                  </div>

                  <Button
                    onClick={handleFetchMovie}
                    disabled={generating}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Generating Movie File...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Fetch Movie
                      </>
                    )}
                  </Button>

                  {successMsg && (
                    <Alert className="mt-4 bg-green-500/10 border-green-500/50">
                      <AlertDescription className="text-green-200 ml-3">
                        {successMsg}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {data.category === "Series" &&
                data.seasons &&
                data.seasons.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Tv className="w-5 h-5 text-slate-400" />
                      <p className="text-slate-400 text-sm font-medium">
                        SEASONS ({data.seasons.length})
                      </p>
                    </div>

                    <div className="mb-4">
                      <Button
                        onClick={handleFetchAllSeasons}
                        disabled={episodesLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 text-white border-0"
                      >
                        {episodesLoading && !selectedSeason ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                            Fetching All Seasons...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" /> Fetch All Seasons
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {data.seasons.map((season) => (
                        <Button
                          key={season.id}
                          onClick={() => handleFetchSeason(season)}
                          disabled={episodesLoading}
                          variant={
                            selectedSeason?.id === season.id
                              ? "default"
                              : "outline"
                          }
                          className={`${selectedSeason?.id === season.id ? "bg-red-600 hover:bg-red-700 border-red-600 text-white" : "border-slate-600 text-slate-300 hover:bg-slate-700"}`}
                        >
                          Season {season.number} ({season.episodeCount ?? 0}{" "}
                          eps)
                        </Button>
                      ))}
                    </div>

                    {episodes.length > 0 && (
                      <div className="mt-4">
                        <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-400 text-xs font-medium mb-1">
                                TOTAL EPISODES
                              </p>
                              <p className="text-2xl font-bold text-green-400">
                                {episodes.length}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {episodes.map((ep) => (
                            <div
                              key={ep.id}
                              className="bg-slate-800/50 rounded p-3 text-center"
                            >
                              <p className="text-sm font-bold text-white">
                                {ep.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {ep.episode}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              <Button
                onClick={() => {
                  setId("");
                  setData(null);
                }}
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-800"
              >
                Search Again
              </Button>
            </div>
          )}

          {!data && !error && !loading && (
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">
                Enter a JioHotstar ID above to search for movies and series
                information.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
