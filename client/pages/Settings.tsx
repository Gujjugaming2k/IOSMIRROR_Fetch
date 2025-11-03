import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsResponse {
  success: boolean;
  settings: {
    defaultBaseFolder: string;
    telegramToken?: string;
    telegramChannelId?: string;
  };
  error?: string;
}

export default function Settings() {
  const [defaultBaseFolder, setDefaultBaseFolder] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const data: SettingsResponse = await res.json();
        if (data.success) {
          setDefaultBaseFolder(data.settings.defaultBaseFolder || "");
          setTelegramToken(data.settings.telegramToken || "");
          setTelegramChannelId(data.settings.telegramChannelId || "");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const onSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultBaseFolder,
          telegramToken,
          telegramChannelId,
        }),
      });
      const data: SettingsResponse = await res.json();
      if (data.success) {
        setDefaultBaseFolder(data.settings.defaultBaseFolder);
        setTelegramToken(data.settings.telegramToken || "");
        setTelegramChannelId(data.settings.telegramChannelId || "");
        setStatus("Saved");
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus(data.error || "Failed");
      }
    } catch (e) {
      setStatus("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <Card className="bg-slate-900/60 border-slate-800 text-white">
          <CardHeader>
            <CardTitle>Default STRM Base Folder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              All STRM files for Netflix, Amazon Prime, and JioHotstar will be
              saved under this folder, using the structure:
              <br />
              <code className="text-slate-400">
                [base]/[service]/(Series|Movies)/...
              </code>
            </p>
            <div className="flex gap-3 items-center">
              <Input
                value={defaultBaseFolder}
                onChange={(e) => setDefaultBaseFolder(e.target.value)}
                placeholder="/path/to/OTT"
                className="bg-slate-900 border-slate-700 text-white flex-1"
              />
              <Button onClick={onSave} disabled={loading} className="shrink-0">
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
            {status && <div className="text-sm text-slate-300">{status}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
