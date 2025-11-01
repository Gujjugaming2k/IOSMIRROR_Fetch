import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleNetflix } from "./routes/netflix";
import { handleAmazonPrime } from "./routes/amazon-prime";
import { handleJioHotstar } from "./routes/jio-hotstar";
import { handleFetchCookie, handleCookieStatus } from "./routes/cookie";
import { handleEpisodes } from "./routes/episodes";

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

  // Streaming service routes
  app.get("/api/netflix", handleNetflix);
  app.get("/api/amazon-prime", handleAmazonPrime);
  app.get("/api/jio-hotstar", handleJioHotstar);
  app.get("/api/episodes", handleEpisodes);

  return app;
}
