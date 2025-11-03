import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trash2,
  FolderOpen,
  Film,
  Tv,
  Link2,
  Trash,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HistoryItem,
  MovieHistoryItem,
  SeriesHistoryItem,
  loadHistory,
  saveHistory,
  clearHistory as clearAll,
} from "@/lib/history";

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHistory(loadHistory());
    } catch (err) {
      setError("Failed to load history");
    }
  }, []);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    try {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      saveHistory(updated);
    } catch (err) {
      setError("Failed to delete history item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    clearAll();
    setHistory([]);
  };

  const movies = history.filter(
    (h): h is MovieHistoryItem => h.type === "movie",
  );
  const series = history.filter(
    (h): h is SeriesHistoryItem => h.type === "series",
  );
  const hasAny = history.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="p-6 border-b border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-white">
                Streaming History
              </h1>
            </div>
            {hasAny && (
              <Button
                variant="destructive"
                onClick={handleClearAll}
                className="bg-red-600/30 hover:bg-red-600 text-red-300 border-red-600/50"
              >
                <Trash className="w-4 h-4 mr-2" /> Clear History
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!hasAny ? (
              <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700 text-center">
                <FolderOpen className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-300 mb-2">
                  No History Yet
                </h2>
                <p className="text-slate-400">
                  When you generate movies or series from Netflix, Amazon Prime,
                  or JioHotstar, they will appear here.
                </p>
              </div>
            ) : (
              <Tabs
                defaultValue={movies.length ? "movies" : "series"}
                className="w-full"
              >
                <TabsList className="mb-6">
                  <TabsTrigger value="movies">
                    Movies ({movies.length})
                  </TabsTrigger>
                  <TabsTrigger value="series">
                    Series ({series.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="movies">
                  <div className="grid gap-4">
                    {movies.map((m) => (
                      <div
                        key={m.id}
                        className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
                      >
                        <div className="p-4 border-b border-slate-700 bg-slate-900/40 flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-500/30 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase">
                                {m.provider}
                              </span>
                              <span className="bg-slate-600 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase">
                                Movie
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                              <Film className="w-4 h-4 text-slate-400" />{" "}
                              {m.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                              Saved {new Date(m.savedAt).toLocaleString()} •
                              File: {m.fileName}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === m.id}
                            onClick={() => handleDelete(m.id)}
                            className="bg-red-600/30 hover:bg-red-600 text-red-300 border-red-600/50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletingId === m.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="text-xs text-slate-400 font-mono break-all">
                            📁 {m.folderPath}
                          </div>
                          <a
                            href={m.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
                          >
                            <Link2 className="w-4 h-4" /> Stream link
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="series">
                  <div className="grid gap-4">
                    {series.map((s) => (
                      <div
                        key={s.id}
                        className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
                      >
                        <div className="p-4 border-b border-slate-700 bg-slate-900/40 flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-500/30 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase">
                                {s.provider}
                              </span>
                              <span className="bg-slate-600 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase">
                                Series
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                              <Tv className="w-4 h-4 text-slate-400" /> {s.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                              Saved {new Date(s.savedAt).toLocaleString()} •
                              Files: {s.totalFilesCreated}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id)}
                            className="bg-red-600/30 hover:bg-red-600 text-red-300 border-red-600/50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletingId === s.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                        <div className="p-4 space-y-4">
                          {s.seasons.map((season, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900/50 rounded p-3 border border-slate-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-slate-300 font-semibold">
                                  Season {season.seasonNumber}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {season.files.length} episodes
                                </div>
                              </div>
                              <div className="text-xs text-slate-400 font-mono break-all mb-2">
                                📁 {season.folderPath}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {season.files.map((file, fi) => (
                                  <a
                                    key={fi}
                                    href={file.streamUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-slate-800/50 rounded p-2 text-center hover:bg-slate-800 transition-colors"
                                    title={file.streamUrl}
                                  >
                                    <div className="text-xs font-bold text-white">
                                      {file.fileName}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Open link
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
