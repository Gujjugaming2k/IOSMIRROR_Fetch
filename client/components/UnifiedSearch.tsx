import { useState } from "react";
import { Search, Loader2, AlertCircle, Play, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  title: string;
  provider: "netflix" | "prime";
  poster: string;
  year?: string;
  duration?: string;
}

export default function UnifiedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const performSearch = async (searchQuery: string) => {
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error("Search error:", err);
      throw err;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSearched(true);

    try {
      const results = await performSearch(query);

      if (results.length === 0) {
        setError("No results found");
      } else {
        setResults(results);
      }
    } catch (err) {
      setError("An error occurred while searching. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async (result: SearchResult) => {
    setFetchingId(`${result.provider}-${result.id}`);
    setFetchError(null);

    try {
      let apiEndpoint = "";
      if (result.provider === "netflix") {
        apiEndpoint = `/api/netflix?id=${encodeURIComponent(result.id)}`;
      } else {
        apiEndpoint = `/api/amazon-prime?id=${encodeURIComponent(result.id)}`;
      }

      const response = await fetch(apiEndpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      localStorage.setItem(
        `${result.provider}_last_content`,
        JSON.stringify({ id: result.id, title: result.title, ...data }),
      );

      setFetchError(null);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch content",
      );
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 mb-16">
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white mb-6">
          Search Netflix & Prime
        </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search movies and series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 py-6 text-base bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400 focus:ring-slate-400"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </form>

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-6">
              Results ({results.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result) => (
                <div
                  key={`${result.provider}-${result.id}`}
                  className="bg-slate-900/30 border border-slate-700 hover:border-slate-500 rounded-lg overflow-hidden transition-all hover:bg-slate-900/50 hover:shadow-lg flex flex-col"
                >
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 aspect-[2/3] overflow-hidden flex-shrink-0">
                    {result.poster ? (
                      <img
                        src={result.poster}
                        alt={result.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect fill='%23374151' width='400' height='600'/%3E%3Ctext x='50%25' y='50%25' font-size='18' fill='%239CA3AF' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          result.provider === "netflix"
                            ? "bg-red-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {result.provider === "netflix" ? "Netflix" : "Prime"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="text-white font-semibold text-sm mb-1 truncate">
                      {result.title}
                    </h4>
                    <p className="text-slate-400 text-xs mb-3">
                      ID: <span className="font-mono">{result.id}</span>
                    </p>

                    {(result.year || result.duration) && (
                      <p className="text-slate-500 text-xs mb-3">
                        {result.year}
                        {result.duration && ` • ${result.duration}`}
                      </p>
                    )}

                    <Button
                      onClick={() => fetchContent(result)}
                      disabled={
                        fetchingId === `${result.provider}-${result.id}`
                      }
                      className={`w-full py-2 text-sm font-semibold transition-all ${
                        result.provider === "netflix"
                          ? "bg-gradient-to-r from-red-600 to-red-800 hover:opacity-90"
                          : "bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90"
                      } text-white border-0`}
                    >
                      {fetchingId === `${result.provider}-${result.id}` ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-2 inline" />
                          Fetching...
                        </>
                      ) : result.provider === "netflix" ? (
                        <>
                          <Play className="w-3 h-3 mr-2 inline" />
                          Fetch Netflix
                        </>
                      ) : (
                        <>
                          <Film className="w-3 h-3 mr-2 inline" />
                          Fetch Prime
                        </>
                      )}
                    </Button>

                    {fetchError &&
                      fetchingId === `${result.provider}-${result.id}` && (
                        <div className="mt-2 text-red-400 text-xs">
                          {fetchError}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searched && results.length === 0 && !loading && !error && (
          <div className="mt-6 text-center text-slate-400">
            <p>No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
