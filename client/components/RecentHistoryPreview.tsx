import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Tv, Link2 } from "lucide-react";
import { loadHistory, HistoryItem } from "@/lib/history";

export default function RecentHistoryPreview() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const h = loadHistory();
      setItems(h.slice(0, 3));
    } catch {
      setItems([]);
    }
  }, []);

  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-900/30 rounded p-4 text-center text-sm text-slate-400">
        No recent history
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between bg-slate-900/20 rounded p-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800/50 rounded flex items-center justify-center">
              {it.type === "movie" ? (
                <Film className="w-5 h-5 text-slate-200" />
              ) : (
                <Tv className="w-5 h-5 text-slate-200" />
              )}
            </div>
            <div>
              <div className="text-sm text-white font-semibold">
                {it.type === "movie" ? (it as any).name : (it as any).name}
              </div>
              <div className="text-xs text-slate-400">
                {it.type === "movie"
                  ? `${(it as any).provider} • movie`
                  : `${(it as any).provider} • series`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {it.type === "movie" && (
              <a
                href={(it as any).link}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-300 hover:text-blue-200 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" /> Open
              </a>
            )}
            <Link
              to="/history"
              className="text-sm text-slate-300 hover:text-white underline"
            >
              Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
