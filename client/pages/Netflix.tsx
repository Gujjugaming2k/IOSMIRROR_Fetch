import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, AlertCircle, Loader2, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NetflixData {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
}

export default function Netflix() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<NetflixData | null>(null);

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
      const response = await fetch(`https://net20.cc/post.php?id=${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const jsonData = await response.json();

      const episodes = jsonData.get?.("episodes", []) || jsonData.episodes || [];
      const season = jsonData.get?.("season") || jsonData.season;

      const category =
        !episodes || (Array.isArray(episodes) && episodes[0] === null) || !season
          ? "Movie"
          : "Series";

      const languages = Array.isArray(jsonData.lang || jsonData.get?.("lang", []))
        ? (jsonData.lang || jsonData.get?.("lang", []))
            .map((lang: any) => lang.l || lang)
            .join(", ")
        : "";

      const result: NetflixData = {
        title: jsonData.title || jsonData.get?.("title") || "Unknown",
        year: (jsonData.year || jsonData.get?.("year") || "Unknown").toString(),
        languages: languages || "Unknown",
        category,
      };

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch data. Please try again."
      );
    } finally {
      setLoading(false);
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
        <div className="max-w-2xl mx-auto px-6 py-12">
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
                    <p className="text-2xl font-bold text-white">{data.title}</p>
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
                Enter a Netflix ID above to search for movies and series information.
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
