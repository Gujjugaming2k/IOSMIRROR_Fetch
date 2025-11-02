import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleNetflix } from "./routes/netflix";
import {
  handleAmazonPrime,
  handleGetAmazonPrimePosters,
  handleRefreshAmazonPrimePosters,
  handleMarkAmazonPrimePosters,
} from "./routes/amazon-prime";
import { handleJioHotstar } from "./routes/jio-hotstar";
import {
  handleFetchCookie,
  handleCookieStatus,
  handleFetchToken,
} from "./routes/cookie";
import { handleEpisodes } from "./routes/episodes";
import {
  handleSaveStreaming,
  handleExportStreaming,
  handleDeleteStreaming,
  handleGenerateStrm,
  handleGenerateMovie,
} from "./routes/streaming";
import { handleGetSettings, handleUpdateSettings } from "./routes/settings";
import {
  handleGetCachedTop10,
  handleRefreshTop10,
  handleMarkTop10,
  handleGetAllPosters,
  handleRefreshAllPosters,
  handleMarkAllPosters,
} from "./routes/net51";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Cookie routes
  app.get("/api/fetch-cookie", handleFetchCookie);
  app.get("/api/cookie-status", handleCookieStatus);
  app.get("/api/fetch-token", handleFetchToken);

  // Streaming service routes
  app.get("/api/netflix", handleNetflix);
  app.get("/api/amazon-prime", handleAmazonPrime);
  app.get("/api/jio-hotstar", handleJioHotstar);
  app.get("/api/episodes", handleEpisodes);

  // Streaming details routes
  app.post("/api/save-streaming", handleSaveStreaming);
  app.post("/api/export-streaming", handleExportStreaming);
  app.post("/api/delete-streaming-files", handleDeleteStreaming);
  app.post("/api/generate-strm", handleGenerateStrm);
  app.post("/api/generate-movie", handleGenerateMovie);

  // Settings routes
  app.get("/api/settings", handleGetSettings);
  app.post("/api/settings", handleUpdateSettings);

  // Net51 top10 routes (cached)
  app.get("/api/netflix/top10", handleGetCachedTop10);
  app.post("/api/netflix/top10/refresh", handleRefreshTop10);
  app.post("/api/netflix/top10/mark", handleMarkTop10);

  // All posters routes
  app.get("/api/netflix/posters", handleGetAllPosters);
  app.post("/api/netflix/posters/refresh", handleRefreshAllPosters);
  app.post("/api/netflix/posters/mark", handleMarkAllPosters);

  // Amazon Prime posters (cached)
  app.get("/api/amazon-prime/posters", handleGetAmazonPrimePosters);
  app.post(
    "/api/amazon-prime/posters/refresh",
    handleRefreshAmazonPrimePosters,
  );
  app.post("/api/amazon-prime/posters/mark", handleMarkAmazonPrimePosters);

  return app;
}
