import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, FolderOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StreamingDetail {
  id: string;
  service: "netflix" | "amazon-prime" | "jio-hotstar";
  seriesName: string;
  seriesId: string;
  season: {
    number: string;
    id: string;
  };
  episodes: Array<{
    id: string;
    title: string;
    episode: string;
    streamUrl: string;
  }>;
  savedAt: string;
  folderPath: string;
}

export default function History() {
  const [history, setHistory] = useState<StreamingDetail[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem("streaming_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
      setError("Failed to load history");
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    try {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      localStorage.setItem("streaming_history", JSON.stringify(updated));

      // Call API to delete folder/files
      fetch("/api/delete-streaming-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          folderPath: history.find((h) => h.id === id)?.folderPath,
        }),
      }).catch(console.error);
    } catch (err) {
      setError("Failed to delete history item");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {history.length === 0 ? (
              <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700 text-center">
                <FolderOpen className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-300 mb-2">
                  No History Yet
                </h2>
                <p className="text-slate-400">
                  Streaming details will appear here when you fetch episodes
                  from Netflix, Amazon Prime, or JioHotstar.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-4 border-b border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-blue-500/30 text-blue-300">
                              {item.service}
                            </span>
                            <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-slate-600 text-slate-300">
                              Season {item.season.number}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">
                            {item.seriesName}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {item.episodes.length} episode
                            {item.episodes.length !== 1 ? "s" : ""} •{" "}
                            {new Date(item.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-600/30 hover:bg-red-600 text-red-300 border-red-600/50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>

                    {/* Episodes */}
                    <div className="p-4">
                      <div className="space-y-2 mb-4">
                        {item.episodes.slice(0, 3).map((ep) => (
                          <div
                            key={ep.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="font-mono bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                              {ep.episode}
                            </span>
                            <span className="text-slate-300">{ep.title}</span>
                          </div>
                        ))}
                        {item.episodes.length > 3 && (
                          <p className="text-sm text-slate-500 pl-2">
                            +{item.episodes.length - 3} more episodes
                          </p>
                        )}
                      </div>

                      {/* Folder Path */}
                      <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-400 font-mono break-all">
                        📁 {item.folderPath}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
