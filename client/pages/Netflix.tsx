import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  AlertCircle,
  Loader2,
  Check,
  Tv,
  Calendar,
  Users,
  Tag,
  Play,
  Film,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addMovieHistory, addSeriesHistory } from "@/lib/history";

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
  description: string;
  completed: string;
  duration: string;
}

interface NetflixData {
  title: string;
  year: string;
  language: string;
  category: "Movie" | "Series";
  genre: string;
  cast: string;
  description: string;
  rating: string;
  match: string;
  runtime: string;
  quality: string;
  creator?: string;
  director?: string;
  seasons?: Season[];
  contentWarning?: string;
}

interface StrmGenerationResult {
  success: boolean;
  // Series fields
  seriesName?: string;
  seriesId?: string;
  totalSeasonsProcessed?: number;
  totalFilesCreated?: number;
  seasons?: Array<{
    seasonNumber: string;
    totalEpisodes: number;
    folderPath: string;
    files: Array<{
      fileName: string;
      filePath: string;
      streamUrl: string;
    }>;
  }>;
  // Movie fields
  movieName?: string;
  movieId?: string;
  folderPath?: string;
  file?: {
    fileName: string;
    filePath: string;
    streamUrl: string;
  };
  generatedAt: string;
}

export default function Netflix() {
  const [searchParams] = useSearchParams();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<NetflixData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [history, setHistory] = useState<StrmGenerationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Per-service save location (Netflix)
  const [savePath, setSavePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Top10 posters
  const [top10, setTop10] = useState<
    Array<{ id: string; poster: string; seen?: boolean }>
  >([]);
  const [topLoading, setTopLoading] = useState(false);
  const [topStatus, setTopStatus] = useState("");
  const [newTop, setNewTop] = useState<
    Array<{ id: string; poster: string; seen?: boolean }>
  >([]);

  // All posters (full page)
  const [postersAll, setPostersAll] = useState<
    Array<{ id: string; poster: string; seen?: boolean }>
  >([]);
  const [postersLoading, setPostersLoading] = useState(false);
  const [postersStatus, setPostersStatus] = useState("");

  // Show/hide posters and fetching state
  const [showPosters, setShowPosters] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json && json.settings) {
          const s = json.settings;
          setSavePath(s.netflixBaseFolder || s.defaultBaseFolder || "");
        }
      } catch (_) {
        // ignore
      }

      // fetch cached top10 posters
      setTopLoading(true);
      try {
        const r = await fetch("/api/netflix/top10");
        const j = await r.json();
        if (j && Array.isArray(j.items)) setTop10(j.items.slice(0, 10));
      } catch (_) {
        // ignore
      } finally {
        setTopLoading(false);
      }

      // fetch cached full posters list
      setPostersLoading(true);
      try {
        const r2 = await fetch("/api/netflix/posters");
        const j2 = await r2.json();
        if (j2 && Array.isArray(j2.items)) setPostersAll(j2.items || []);
      } catch (_) {
        // ignore
      } finally {
        setPostersLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      setId(idParam);
      handleSearch({ preventDefault: () => {} } as React.FormEvent, idParam);
    }
  }, [searchParams]);

  const handleRefreshTop10 = async () => {
    setTopStatus("");
    setTopLoading(true);
    try {
      const r = await fetch("/api/netflix/top10/refresh", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || "Refresh failed");
      setTop10(j.items.slice(0, 10));
      setTopStatus(j.newCount ? `${j.newCount} new` : "Up to date");
    } catch (e) {
      setTopStatus("Refresh failed");
    } finally {
      setTopLoading(false);
      setTimeout(() => setTopStatus(""), 3000);
    }
  };

  const handleRefreshAllPosters = async () => {
    setPostersStatus("");
    setPostersLoading(true);
    try {
      const r = await fetch("/api/netflix/posters/refresh", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || "Refresh failed");
      setPostersAll(j.items || []);
      setPostersStatus(j.newCount ? `${j.newCount} new` : "Up to date");
    } catch (e) {
      setPostersStatus("Refresh failed");
    } finally {
      setPostersLoading(false);
      setTimeout(() => setPostersStatus(""), 3000);
    }
  };

  const handleSavePath = async () => {
    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ netflixBaseFolder: savePath }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save");
      }
      setSaveStatus("Saved");
    } catch (e) {
      setSaveStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fetchMetadataAndGenerate = async (serviceId: string) => {
    setIsFetching(true);
    setShowPosters(false);
    setFetchProgress("Fetching metadata...");
    setError("");
    try {
      const resp = await fetch(
        `/api/netflix?id=${encodeURIComponent(serviceId)}`,
      );
      const meta = await resp.json();
      if (!resp.ok) throw new Error(meta.error || "Failed to fetch metadata");

      const primeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("prime_token")
          : null;

      if (meta.category === "Movie") {
        setFetchProgress("Generating movie .strm file...");
        const genRes = await fetch("/api/generate-movie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: "netflix",
            movieName: meta.title,
            movieId: serviceId,
            primeToken: primeToken || null,
          }),
        });
        const jr = await genRes.json();
        if (!genRes.ok) throw new Error(jr.error || "Failed to generate movie");
        setFetchProgress(`✓ Successfully generated: ${meta.title}`);
        setHistory([jr, ...history]);
        addMovieHistory(jr, "netflix");
        setShowHistory(true);
        setTimeout(() => {
          setIsFetching(false);
          setShowPosters(true);
          setFetchProgress("");
        }, 2000);
        // mark as seen (top10 + all posters)
        try {
          await fetch("/api/netflix/top10/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [serviceId] }),
          });
        } catch (_) {}
        try {
          await fetch("/api/netflix/posters/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [serviceId] }),
          });
        } catch (_) {}
      } else if (meta.category === "Series") {
        // collect seasons
        const seasons = meta.seasons || [];
        const seasonData: any[] = [];
        let processedSeasons = 0;
        for (const s of seasons) {
          try {
            setFetchProgress(
              `Fetching episodes... (${processedSeasons + 1}/${seasons.length} seasons)`,
            );
            const r = await fetch(
              `/api/episodes?seriesId=${encodeURIComponent(serviceId)}&seasonId=${encodeURIComponent(s.id)}`,
            );
            const j = await r.json();
            if (r.ok && j.episodes) {
              seasonData.push({
                number: s.number,
                id: s.id,
                episodes: j.episodes,
              });
            }
            processedSeasons++;
          } catch (e) {
            // skip this season
          }
        }
        if (seasonData.length > 0) {
          setFetchProgress("Generating .strm files...");
          const genRes = await fetch("/api/generate-strm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service: "netflix",
              seriesName: meta.title,
              seriesId: serviceId,
              seasons: seasonData,
              primeToken: primeToken || null,
            }),
          });
          const jr = await genRes.json();
          if (!genRes.ok)
            throw new Error(jr.error || "Failed to generate .strm files");
          setFetchProgress(`✓ Successfully generated: ${meta.title}`);
          setHistory([jr, ...history]);
          addSeriesHistory(jr, "netflix");
          setShowHistory(true);
          setTimeout(() => {
            setIsFetching(false);
            setShowPosters(true);
            setFetchProgress("");
          }, 2000);
          try {
            await fetch("/api/netflix/top10/mark", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [serviceId] }),
            });
          } catch (_) {}
          try {
            await fetch("/api/netflix/posters/mark", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [serviceId] }),
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate from poster",
      );
      setIsFetching(false);
      setShowPosters(true);
      setFetchProgress("");
    }
  };

  const handleSearch = async (e: React.FormEvent, searchId?: string) => {
    e.preventDefault?.();

    const idToSearch = searchId || id;
    if (!idToSearch.trim()) {
      setError("Please enter an ID");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    setSelectedSeason(null);
    setEpisodes([]);
    setShowPosters(false);

    try {
      const response = await fetch(
        `/api/netflix?id=${encodeURIComponent(idToSearch)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      setData(data);
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
        `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch episodes");
      }

      const fetchedEpisodes = result.episodes || [];
      setEpisodes(fetchedEpisodes);

      // Generate .strm files for single season
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
          `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}`,
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

      // Generate .strm files
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
      // Get prime token from localStorage
      const primeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("prime_token")
          : null;

      const response = await fetch("/api/generate-strm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: "netflix",
          seriesName: data?.title || "Unknown",
          seriesId: id,
          seasons: seasonData,
          primeToken: primeToken || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate .strm files");
      }

      setHistory([result, ...history]);
      addSeriesHistory(result, "netflix");
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
      // Get prime token from localStorage
      const primeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("prime_token")
          : null;

      const response = await fetch("/api/generate-movie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: "netflix",
          movieName: data.title,
          movieId: id,
          primeToken: primeToken || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate movie file");
      }

      setHistory([result, ...history]);
      addMovieHistory(result, "netflix");
      setShowHistory(true);
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
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
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

          <h1 className="text-3xl font-bold text-white">Netflix Search</h1>

          <div className="w-24" />
        </div>

        {/* Main Content */}
        <div className="w-full max-w-full mx-0 px-6 py-12">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-12">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
              <label className="block text-white font-semibold mb-4">
                Enter Netflix ID
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="e.g., 80189685"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setError("");
                  }}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-red-500"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90 text-white border-0 px-8"
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

          {/* Save Location for Netflix */}
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
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-red-500"
                disabled={saving}
              />
              <Button
                onClick={handleSavePath}
                disabled={saving}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90 text-white border-0 px-8"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
              </Button>
            </div>
            {saveStatus && (
              <p className="text-slate-400 text-sm mt-2">{saveStatus}</p>
            )}
          </div>

          {/* Poster Controls - Always visible */}
          {!isFetching && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-white font-bold">
                {showPosters ? "Latest Releases" : "Posters"}
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowPosters(!showPosters)}
                  className="bg-slate-700/30 hover:bg-slate-700/50 text-white border-0 px-3 py-1 text-sm"
                >
                  {showPosters ? "Hide Posters" : "Show Posters"}
                </Button>
                {showPosters && (
                  <>
                    <span className="text-slate-400 text-sm">{topStatus}</span>
                    <Button
                      onClick={handleRefreshTop10}
                      className="bg-slate-700/30 hover:bg-slate-700/50 text-white border-0 px-3 py-1 text-sm"
                    >
                      {topLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Progress Display or Top10 Posters / Latest Release */}
          {isFetching ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white font-bold">Processing</h2>
                <Button
                  onClick={() => setShowPosters(!showPosters)}
                  className="bg-slate-700/30 hover:bg-slate-700/50 text-white border-0 px-3 py-1 text-sm"
                >
                  {showPosters ? "Hide Posters" : "Show Posters"}
                </Button>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-red-500/30 flex flex-col items-center justify-center min-h-96">
                <Loader2 className="w-16 h-16 animate-spin text-red-400 mb-6" />
                <p className="text-white text-lg font-semibold text-center">
                  {fetchProgress}
                </p>
              </div>
            </div>
          ) : showPosters ? (
            <div className="mb-8">
              {topLoading ? (
                <div className="text-slate-400">Loading...</div>
              ) : top10.length === 0 ? (
                <div className="text-slate-400">No posters found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 bg-slate-800/50 rounded-2xl p-4 flex flex-col items-center">
                    <img
                      src={top10[0].poster}
                      alt="Latest poster"
                      className="w-full max-w-none rounded-lg mb-4 object-contain max-h-[70vh]"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => fetchMetadataAndGenerate(top10[0].id)}
                        disabled={loading || isFetching}
                        className="bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90 text-white border-0 px-6"
                      >
                        {loading || isFetching ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Fetch & Add .strm"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {top10.slice(0, 9).map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-800/50 rounded-lg p-2 text-center"
                        >
                          <img
                            src={item.poster}
                            alt={`poster-${item.id}`}
                            className="w-full h-56 object-contain rounded mb-2"
                          />
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => fetchMetadataAndGenerate(item.id)}
                              disabled={loading || isFetching}
                              className="bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90 text-white border-0 px-4 py-1 text-sm"
                            >
                              Fetch
                            </Button>
                            <Button
                              onClick={() => setId(item.id)}
                              variant="outline"
                              className="px-4 py-1 text-sm"
                            >
                              Use ID
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* All Posters (full page) */}
          {showPosters && !isFetching && (
            <div className="mb-8">
              {postersLoading ? (
                <div className="text-slate-400">Loading...</div>
              ) : postersAll.length === 0 ? (
                <div className="text-slate-400">No posters found</div>
              ) : (
                <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                  {postersAll.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-800/50 rounded p-2 text-center"
                    >
                      <img
                        src={p.poster}
                        alt={`poster-${p.id}`}
                        className="w-full h-40 object-contain rounded mb-2"
                      />
                      <div className="flex gap-1 justify-center">
                        <Button
                          onClick={() => fetchMetadataAndGenerate(p.id)}
                          disabled={loading || isFetching}
                          className="bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90 text-white border-0 px-3 py-1 text-xs"
                        >
                          Fetch
                        </Button>
                        <Button
                          onClick={() => setId(p.id)}
                          variant="outline"
                          className="px-2 py-1 text-xs"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Posters Refresh Button */}
          {showPosters && !isFetching && (
            <div className="flex items-center justify-between mb-4">
              <div />
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{postersStatus}</span>
                <Button
                  onClick={handleRefreshAllPosters}
                  className="bg-slate-700/30 hover:bg-slate-700/50 text-white border-0 px-3 py-1 text-sm"
                >
                  {postersLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Refresh All"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="mb-8 bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <AlertDescription className="text-red-200 ml-3">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {data && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-green-500/30 shadow-lg shadow-green-500/20">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-green-500/20 rounded-full p-3">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Found!</h2>
                </div>

                <div className="space-y-8">
                  {/* Title Section */}
                  <div>
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {data.title}
                    </h3>
                    <p className="text-slate-400 text-lg">{data.description}</p>
                  </div>

                  {/* Key Info Grid */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-400 text-xs font-medium">
                          YEAR
                        </p>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {data.year}
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Tv className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-400 text-xs font-medium">
                          CATEGORY
                        </p>
                      </div>
                      <p>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold inline-block ${
                            data.category === "Movie"
                              ? "bg-blue-500/30 text-blue-300"
                              : "bg-purple-500/30 text-purple-300"
                          }`}
                        >
                          {data.category}
                        </span>
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">
                        LANGUAGE
                      </p>
                      <p className="text-white font-semibold uppercase">
                        {data.language}
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">
                        QUALITY
                      </p>
                      <p className="text-white font-semibold">{data.quality}</p>
                    </div>
                  </div>

                  {/* Runtime and Match */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">
                        RUNTIME
                      </p>
                      <p className="text-xl font-bold text-white">
                        {data.runtime}
                      </p>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">
                        MATCH
                      </p>
                      <p className="text-xl font-bold text-white">
                        {data.match}
                      </p>
                    </div>
                  </div>

                  {/* Genres */}
                  {data.genre && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-400 text-sm font-medium">
                          GENRES
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {data.genre.split(",").map((genre, idx) => (
                          <span
                            key={idx}
                            className="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-sm"
                          >
                            {genre.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating and Content Warning */}
                  {(data.rating || data.contentWarning) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.rating && (
                        <div className="bg-slate-700/50 rounded-lg p-4">
                          <p className="text-slate-400 text-xs font-medium mb-2">
                            RATING
                          </p>
                          <p className="text-white font-semibold">
                            {data.rating}
                          </p>
                        </div>
                      )}
                      {data.contentWarning && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <p className="text-yellow-400 text-xs font-medium mb-2">
                            CONTENT WARNING
                          </p>
                          <p className="text-yellow-200 text-sm">
                            {data.contentWarning}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cast */}
                  {data.cast && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-400 text-sm font-medium">
                          CAST
                        </p>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {data.cast}
                      </p>
                    </div>
                  )}

                  {/* Creator/Director */}
                  {(data.creator || data.director) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {data.creator && (
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-2">
                            CREATOR
                          </p>
                          <p className="text-white font-semibold">
                            {data.creator}
                          </p>
                        </div>
                      )}
                      {data.director && (
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-2">
                            DIRECTOR
                          </p>
                          <p className="text-white font-semibold">
                            {data.director}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fetch Movie Button for Movies */}
                  {data.category === "Movie" && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Film className="w-5 h-5 text-slate-400" />
                        <p className="text-slate-400 text-sm font-medium">
                          STREAMING
                        </p>
                      </div>

                      <Button
                        onClick={handleFetchMovie}
                        disabled={episodesLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 text-white border-0"
                      >
                        {episodesLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Movie File...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Fetch Movie
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Seasons for Series */}
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

                        {/* Fetch All Seasons Button */}
                        <div className="mb-4">
                          <Button
                            onClick={handleFetchAllSeasons}
                            disabled={episodesLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90 text-white border-0"
                          >
                            {episodesLoading && !selectedSeason ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Fetching All Seasons...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Fetch All Seasons
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Individual Season Buttons */}
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
                              className={`${
                                selectedSeason?.id === season.id
                                  ? "bg-red-600 hover:bg-red-700 border-red-600 text-white"
                                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              {episodesLoading &&
                              selectedSeason?.id === season.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  {season.number}
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Season {season.number}
                                  <span className="ml-1 text-xs opacity-75">
                                    ({season.episodeCount})
                                  </span>
                                </>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Episodes Section */}
              {episodes.length > 0 && (
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-500/20 rounded-full p-3">
                      <Play className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedSeason
                        ? `Season ${selectedSeason.number} Episodes`
                        : "All Episodes"}
                    </h2>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {episodes.map((episode, idx) => (
                      <div
                        key={episode.id}
                        className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 bg-red-500/30 rounded-lg p-3 min-w-fit">
                            <p className="text-red-300 font-bold text-sm">
                              {episode.season}E{episode.episode}
                            </p>
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-white font-semibold mb-1">
                              {episode.title}
                            </h3>
                            <p className="text-slate-400 text-sm mb-2">
                              {episode.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>⏱️ {episode.duration}</span>
                              {episode.completed === "1" && (
                                <span className="text-green-400">
                                  ✓ Watched
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Again Button */}
          {data && (
            <Button
              onClick={() => {
                setId("");
                setData(null);
                setSelectedSeason(null);
                setEpisodes([]);
              }}
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800 mt-6"
            >
              Search Again
            </Button>
          )}

          {/* History Toggle Button */}
          {history.length > 0 && (
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800 mt-6"
            >
              {showHistory ? "Hide" : "Show"} Generation History (
              {history.length})
            </Button>
          )}

          {/* History Section */}
          {showHistory && history.length > 0 && (
            <div className="mt-8 space-y-4 animate-in fade-in duration-300">
              {history.map((result, historyIdx) => {
                const isMovie = result.movieName && result.file;
                const isSeries =
                  result.seriesName && result.seasons && result.seasons.length;

                return (
                  <div
                    key={historyIdx}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-amber-500/30 shadow-lg shadow-amber-500/20"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-500/20 rounded-full p-3">
                        {isMovie ? (
                          <Film className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Tv className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {result.movieName || result.seriesName}
                        </h2>
                        <p className="text-slate-400 text-sm">
                          {isMovie ? "Movie" : "Series"} •{" "}
                          {new Date(result.generatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Movie Display */}
                    {isMovie && (
                      <div className="space-y-4">
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <p className="text-slate-400 text-xs mb-3">
                            {result.folderPath}
                          </p>

                          <div className="bg-slate-800/50 rounded p-3 text-center">
                            <p className="text-sm font-bold text-white mb-1">
                              {result.file.fileName}
                            </p>
                            <p className="text-xs text-green-400">
                              ✓ Generated
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Series Display */}
                    {isSeries && (
                      <>
                        <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-400 text-xs font-medium mb-1">
                                TOTAL FILES
                              </p>
                              <p className="text-2xl font-bold text-green-400">
                                {result.totalFilesCreated}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-xs font-medium mb-1">
                                SEASONS PROCESSED
                              </p>
                              <p className="text-2xl font-bold text-blue-400">
                                {result.totalSeasonsProcessed}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {result.seasons.map((season, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <Tv className="w-4 h-4 text-slate-400" />
                                <h3 className="text-white font-semibold flex-grow">
                                  Season {season.seasonNumber}
                                </h3>
                                <span className="bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-sm font-bold">
                                  {season.totalEpisodes} Episodes
                                </span>
                              </div>

                              <p className="text-slate-400 text-xs mb-3">
                                {season.folderPath}
                              </p>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {season.files.map((file, fileIdx) => (
                                  <div
                                    key={fileIdx}
                                    className="bg-slate-800/50 rounded p-2 text-center hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={file.streamUrl}
                                  >
                                    <p className="text-xs font-bold text-white">
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      ✓ Generated
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Message */}
          {!data && !error && !loading && (
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">
                Enter a Netflix ID above to search for movies and series
                information.
              </p>
              <p className="text-slate-500 text-sm mt-4">
                Example ID: 80189685
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
