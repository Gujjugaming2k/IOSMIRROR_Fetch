import { Link } from "react-router-dom";
import {
  Play,
  Film,
  Tv,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookie } from "@/hooks/useCookie";
import { useToken } from "@/hooks/useToken";
import { useState } from "react";

export default function Index() {
  const { tHash, loading, error, fetchCookie, hasCookie, clearCookie } =
    useCookie();
  const {
    primeToken,
    loading: tokenLoading,
    error: tokenError,
    fetchToken,
    hasToken,
    clearToken,
  } = useToken();
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const handleCopyCookie = async () => {
    if (tHash) {
      let copied = false;

      // Try Clipboard API first
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(tHash);
          copied = true;
        }
      } catch (err) {
        console.log("Clipboard API blocked, using fallback:", err);
      }

      // Fallback to execCommand if Clipboard API failed
      if (!copied) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = tHash;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textArea);
          copied = success;
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }
      }

      if (copied) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleCopyToken = async () => {
    if (primeToken) {
      let copied = false;

      // Try Clipboard API first
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(primeToken);
          copied = true;
        }
      } catch (err) {
        console.log("Clipboard API blocked, using fallback:", err);
      }

      // Fallback to execCommand if Clipboard API failed
      if (!copied) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = primeToken;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textArea);
          copied = success;
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }
      }

      if (copied) {
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
    }
  };

  const services = [
    {
      id: "netflix",
      name: "Netflix",
      icon: Play,
      description: "Search for movies and series on Netflix",
      color: "from-red-600 to-red-800",
      path: "/netflix",
    },
    {
      id: "prime",
      name: "Amazon Prime",
      icon: Film,
      description: "Search for movies and series on Amazon Prime",
      color: "from-blue-600 to-blue-800",
      path: "/amazon-prime",
    },
    {
      id: "hotstar",
      name: "JioHotstar",
      icon: Tv,
      description: "Search for movies and series on JioHotstar",
      color: "from-purple-600 to-purple-800",
      path: "/jio-hotstar",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="pt-16 px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tighter">
            IOSMIRROR
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-2">
            Streaming Content Discovery
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Search for movies and series across your favorite streaming
            platforms
          </p>

          {/* Fetch Cookie and Token Buttons */}
          <div className="max-w-2xl mx-auto mb-12 space-y-4">
            {(error || tokenError) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error || tokenError}
              </div>
            )}
            <Button
              onClick={fetchCookie}
              disabled={loading}
              className={`w-full py-6 text-lg font-semibold flex items-center justify-center gap-3 transition-all ${
                hasCookie
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:opacity-90 border-0"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90 border-0"
              } text-white`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Fetching Cookies...
                </>
              ) : hasCookie ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Cookie Ready ✓
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Fetch Cookies to Start
                </>
              )}
            </Button>

            {hasCookie && (
              <Button
                onClick={fetchToken}
                disabled={tokenLoading}
                className={`w-full py-6 text-lg font-semibold flex items-center justify-center gap-3 transition-all ${
                  hasToken
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:opacity-90 border-0"
                    : "bg-gradient-to-r from-orange-600 to-orange-700 hover:opacity-90 border-0"
                } text-white`}
              >
                {tokenLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Fetching Token...
                  </>
                ) : hasToken ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Token Ready ✓
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Fetch Prime Token
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Services Grid */}
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link key={service.id} to={service.path}>
                  <div className="group h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20 transform hover:scale-105 cursor-pointer">
                    <div
                      className={`bg-gradient-to-br ${service.color} rounded-xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {service.name}
                    </h3>
                    <p className="text-slate-400 mb-6">{service.description}</p>

                    <Button
                      asChild
                      className={`w-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white border-0`}
                    >
                      <span>Search Now</span>
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 mt-12 pt-8 pb-8">
          <div className="max-w-4xl mx-auto px-6">
            <p className="text-slate-500 text-sm text-center mb-6">
              IOSMIRROR © 2024. Search movies and series across streaming
              platforms.
            </p>

            {/* Cookie Status Section */}
            {hasCookie && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-green-300 font-semibold">Cookie Active</p>
                </div>
                <div className="bg-slate-900/50 rounded p-3 mb-3 font-mono text-xs text-slate-300 relative">
                  <div className="pr-16 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {tHash}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={handleCopyCookie}
                      className="p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 hover:text-slate-300" />
                      )}
                    </button>
                    <button
                      onClick={clearCookie}
                      className="p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Clear cookie"
                    >
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-xs">
                  This cookie will be used for all API requests. Click "Fetch
                  Cookies" again to refresh.
                </p>
              </div>
            )}

            {/* Token Status Section */}
            {hasToken && (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  <p className="text-amber-300 font-semibold">
                    Prime Token Active
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded p-3 mb-3 font-mono text-xs text-slate-300 relative">
                  <div className="pr-16 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {primeToken}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={handleCopyToken}
                      className="p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {tokenCopied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 hover:text-slate-300" />
                      )}
                    </button>
                    <button
                      onClick={clearToken}
                      className="p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Clear token"
                    >
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-xs">
                  This token will be used for streaming API requests. Click
                  "Fetch Prime Token" again to refresh.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
