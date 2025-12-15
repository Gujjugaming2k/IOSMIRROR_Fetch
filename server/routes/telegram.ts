import type { RequestHandler } from "express";
import { getSettings } from "../utils/settings";

function decodeBase64(value?: string | null): string | null {
  if (!value) return null;
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export const handleTelegramNotify: RequestHandler = async (req, res) => {
  try {
    const { name, provider, image, message } = req.body || {};

    const settings = getSettings();
    const encodedToken =
      process.env.ENCODED_TOKEN ||
      process.env.ENCODED_TELEGRAM_TOKEN ||
      settings.telegramToken;
    const encodedChatId =
      process.env.ENCODED_CHANNEL_ID ||
      process.env.ENCODED_TELEGRAM_CHANNEL_ID ||
      settings.telegramChannelId;

    const botToken = decodeBase64(encodedToken);
    const chatId = decodeBase64(encodedChatId);

    if (!botToken || !chatId) {
      return res
        .status(500)
        .json({ success: false, error: "Telegram credentials missing" });
    }

    const caption =
      message || `${name || "Unknown"} - ${provider || "Provider"} added`;

    let tgResponse: Response;
    if (image && typeof image === "string" && image.trim().length > 0) {
      const body = new URLSearchParams();
      body.set("chat_id", chatId);
      body.set("photo", image);
      body.set("caption", caption);

      tgResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
      );
    } else {
      const body = new URLSearchParams();
      body.set("chat_id", chatId);
      body.set("text", caption);

      tgResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
      );
    }

    const json = await tgResponse.json().catch(() => ({}));
    if (!tgResponse.ok || json?.ok === false) {
      return res.status(500).json({
        success: false,
        error: "Failed to send Telegram message",
        details: json,
      });
    }

    res.json({ success: true, result: json });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Unexpected error sending Telegram message",
    });
  }
};
