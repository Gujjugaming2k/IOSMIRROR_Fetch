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
  Play,
  Tv,
  Film,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCookie } from "@/hooks/useCookie";
import { useToken } from "@/hooks/useToken";
import { useEffect } from "react";

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

interface PrimeData {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
  seasons?: Season[];
}

export default function AmazonPrime() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PrimeData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Per-service save location (Amazon Prime)
  const [savePath, setSavePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // load settings and cached posters
  const [slider, setSlider] = useState<Array<any>>([]);
  const [postersAll, setPostersAll] = useState<
    Array<{ id: string; poster: string; cate?: string; seen?: boolean }>
  >([]);
  const [postersLoading, setPostersLoading] = useState(false);
  const [postersStatus, setPostersStatus] = useState("");
  const [showPosters, setShowPosters] = useState(true);

  // Fetching state for progress display
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json && json.settings) {
          const s = json.settings;
          setSavePath(s.amazonPrimeBaseFolder || s.defaultBaseFolder || "");
        }
      } catch (_) {
        // ignore
      }

      // load cached posters
      setPostersLoading(true);
      try {
        const r = await fetch("/api/amazon-prime/posters");
        const j = await r.json();
        if (j && Array.isArray(j.items)) {
          setPostersAll(j.items || []);
        }
        if (j && Array.isArray(j.slider)) {
          setSlider(j.slider || []);
        }
      } catch (_) {
        // ignore
      } finally {
        setPostersLoading(false);
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
        body: JSON.stringify({ amazonPrimeBaseFolder: savePath }),
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

  // Cookie/token hooks (auto-fetch to improve UX)
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
    // If no cookie, fetch it; once cookie present, fetch token if missing
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

  const handleRefreshPosters = async () => {
    setPostersStatus("");
    setPostersLoading(true);
    try {
      const r = await fetch("/api/amazon-prime/posters/refresh", {
        method: "POST",
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || "Refresh failed");
      setPostersAll(j.items || []);
      setSlider(j.slider || []);
      setPostersStatus(j.newCount ? `${j.newCount} new` : "Up to date");
    } catch (e) {
      setPostersStatus("Refresh failed");
    } finally {
      setPostersLoading(false);
      setTimeout(() => setPostersStatus(""), 3000);
    }
  };

  const fetchMetadataAndGenerateFromAmazon = async (serviceId: string) => {
    setIsFetching(true);
    setShowPosters(false);
    setFetchProgress("Fetching metadata...");
    setError("");
    try {
      const resp = await fetch(
        `/api/amazon-prime?id=${encodeURIComponent(serviceId)}`,
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
            service: "amazon-prime",
            movieName: meta.title,
            movieId: serviceId,
            primeToken: primeToken || null,
          }),
        });
        const jr = await genRes.json();
        if (!genRes.ok) throw new Error(jr.error || "Failed to generate movie");
        setFetchProgress(`✓ Successfully generated: ${meta.title}`);
        setHistory([jr, ...history]);
        setShowHistory(true);
        setTimeout(() => {
          setIsFetching(false);
          setShowPosters(true);
          setFetchProgress("");
        }, 2000);
        try {
          await fetch("/api/amazon-prime/posters/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [serviceId] }),
          });
        } catch (_) {}
      } else if (meta.category === "Series") {
        const seasons = meta.seasons || [];
        const seasonData: any[] = [];
        let processedSeasons = 0;
        for (const s of seasons) {
          try {
            setFetchProgress(
              `Fetching episodes... (${processedSeasons + 1}/${seasons.length} seasons)`,
            );
            const r = await fetch(
              `/api/episodes?seriesId=${encodeURIComponent(serviceId)}&seasonId=${encodeURIComponent(s.id)}&service=amazon-prime`,
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
            // skip
          }
        }
        if (seasonData.length > 0) {
          setFetchProgress("Generating .strm files...");
          const genRes = await fetch("/api/generate-strm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service: "amazon-prime",
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
          setShowHistory(true);
          setTimeout(() => {
            setIsFetching(false);
            setShowPosters(true);
            setFetchProgress("");
          }, 2000);
          try {
            await fetch("/api/amazon-prime/posters/mark", {
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
        `/api/amazon-prime?id=${encodeURIComponent(id)}`,
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
        `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}&service=amazon-prime`,
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
          `/api/episodes?seriesId=${encodeURIComponent(id)}&seasonId=${encodeURIComponent(season.id)}&service=amazon-prime`,
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
          service: "amazon-prime",
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
      setShowHistory(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate .strm files. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
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

          <h1 className="text-3xl font-bold text-white">Amazon Prime Search</h1>

          <div className="w-24" />
        </div>

        {/* Main Content */}
        <div className="w-full max-w-full mx-0 px-6 py-12">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-12">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
              <label className="block text-white font-semibold mb-4">
                Enter Amazon Prime ID
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
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0 px-8"
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

          {/* Save Location for Amazon Prime */}
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
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                disabled={saving}
              />
              <Button
                onClick={handleSavePath}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0 px-8"
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
                {showPosters ? "Featured" : "Posters"}
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
                    <span className="text-slate-400 text-sm">
                      {postersStatus}
                    </span>
                    <Button
                      onClick={handleRefreshPosters}
                      className="bg-slate-700/30 hover:bg-slate-700/50 text-white border-0 px-3 py-1 text-sm"
                    >
                      {postersLoading ? (
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

          {/* Progress Display or Featured Slider and Posters */}
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
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-blue-500/30 flex flex-col items-center justify-center min-h-96">
                <Loader2 className="w-16 h-16 animate-spin text-blue-400 mb-6" />
                <p className="text-white text-lg font-semibold text-center">
                  {fetchProgress}
                </p>
              </div>
            </div>
          ) : showPosters ? (
            <div className="mb-8">
              {postersLoading ? (
                <div className="text-slate-400">Loading...</div>
              ) : slider.length === 0 ? (
                <div className="text-slate-400">No featured items</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 bg-slate-800/50 rounded-2xl p-4 flex flex-col items-center">
                    <img
                      src={slider[0].poster}
                      alt="Featured poster"
                      className="w-full max-w-none rounded-lg mb-4 object-contain max-h-[70vh]"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          fetchMetadataAndGenerateFromAmazon(slider[0].id)
                        }
                        disabled={loading || isFetching}
                        className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0 px-6"
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
                      {slider.slice(0, 9).map((item: any) => (
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
                              onClick={() =>
                                fetchMetadataAndGenerateFromAmazon(item.id)
                              }
                              disabled={loading || isFetching}
                              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0 px-4 py-1 text-sm"
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
                          onClick={() =>
                            fetchMetadataAndGenerateFromAmazon(p.id)
                          }
                          disabled={loading || isFetching}
                          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white border-0 px-3 py-1 text-xs"
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-500/20 rounded-full p-3">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Found!</h2>
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">
                      TITLE
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {data.title}
                    </p>
                  </div>

                  {/* Details Grid */}
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
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
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
                      <p className="text-slate-400 text-sm font-medium mb-2">
                        ID
                      </p>
                      <p className="text-xl font-semibold text-white">{id}</p>
                    </div>
                  </div>

                  {/* Languages */}
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

              {/* Fetch Movie Button for Movies */}
              {data.category === "Movie" && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Play className="w-5 h-5 text-slate-400" />
                    <p className="text-slate-400 text-sm font-medium">
                      STREAMING
                    </p>
                  </div>

                  <Button
                    onClick={async () => {
                      if (!data?.title) return;
                      setGenerating(true);
                      setSuccessMsg("");
                      setError("");
                      try {
                        const primeToken =
                          typeof window !== "undefined"
                            ? localStorage.getItem("prime_token")
                            : null;

                        const response = await fetch("/api/generate-movie", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            service: "amazon-prime",
                            movieName: data.title,
                            movieId: id,
                            primeToken: primeToken || null,
                          }),
                        });

                        const result = await response.json();

                        if (!response.ok)
                          throw new Error(
                            result.error || "Failed to generate movie file",
                          );

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
                        setGenerating(false);
                      }
                    }}
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
                          Season {season.number} ({season.episodeCount ?? 0}{" "}
                          eps)
                        </Button>
                      ))}
                    </div>

                    {/* Episodes Grid */}
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

              {/* Search Again Button */}
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

          {/* Info Message */}
          {!data && !error && !loading && (
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">
                Enter an Amazon Prime ID above to search for movies and series
                information.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
