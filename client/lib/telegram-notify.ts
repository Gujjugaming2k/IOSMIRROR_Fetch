import { toast } from "@/hooks/use-toast";

interface TelegramNotifyParams {
  name: string;
  provider: "netflix" | "prime";
  image?: string;
  message?: string;
}

export const sendTelegramNotification = async (
  params: TelegramNotifyParams
) => {
  try {
    const response = await fetch("/api/notify/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
        provider: params.provider,
        image: params.image || "",
        message:
          params.message ||
          `${params.name} - ${params.provider === "netflix" ? "Netflix" : "Prime"} added`,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("Telegram notification failed:", result.error);
      return false;
    }

    // Show success toast that auto-disappears
    toast({
      title: "Added ✓",
      description: `${params.name} added to ${params.provider === "netflix" ? "Netflix" : "Prime"}`,
    });

    return true;
  } catch (error) {
    console.error("Error sending telegram notification:", error);
    toast({
      title: "Error",
      description: "Failed to send notification",
    });
    return false;
  }
};
