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

  return (
    <div className="w-full max-w-4xl mx-auto px-6 mb-16">
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
            <h3 className="text-lg font-semibold text-white mb-4">
              Results ({results.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={`${result.provider}-${result.id}`}
                  className="bg-slate-900/30 border border-slate-700 hover:border-slate-500 rounded-lg p-4 transition-colors hover:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {result.title}
                      </p>
                      <p className="text-slate-400 text-sm">
                        ID: <span className="font-mono">{result.id}</span>
                      </p>
                      {result.year && (
                        <p className="text-slate-500 text-xs mt-1">
                          {result.year}
                          {result.duration && ` • ${result.duration}`}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          result.provider === "netflix"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {result.provider === "netflix" ? "Netflix" : "Prime"}
                      </span>
                    </div>
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
