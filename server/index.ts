import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleNetflix } from "./routes/netflix";
import { handleAmazonPrime } from "./routes/amazon-prime";
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

  return app;
}
