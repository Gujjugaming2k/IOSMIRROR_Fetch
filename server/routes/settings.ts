import { RequestHandler } from "express";
import { getSettings, setSettings } from "../utils/settings";

export const handleGetSettings: RequestHandler = (_req, res) => {
  const settings = getSettings();
  res.status(200).json({ success: true, settings });
};

export const handleUpdateSettings: RequestHandler = (req, res) => {
  const {
    defaultBaseFolder,
    netflixBaseFolder,
    amazonPrimeBaseFolder,
    jioHotstarBaseFolder,
  } = req.body || {};

  const hasAny = [
    defaultBaseFolder,
    netflixBaseFolder,
    amazonPrimeBaseFolder,
    jioHotstarBaseFolder,
  ].some((v) => typeof v === "string");

  if (!hasAny) {
    return res
      .status(400)
      .json({ success: false, error: "No valid settings provided" });
  }

  const saved = setSettings({
    defaultBaseFolder,
    netflixBaseFolder,
    amazonPrimeBaseFolder,
    jioHotstarBaseFolder,
  });
  res.status(200).json({ success: true, settings: saved });
};
