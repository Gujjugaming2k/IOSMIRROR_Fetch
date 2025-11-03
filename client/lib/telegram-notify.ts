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

    let result: any = {};
    try {
      result = await response.json();
    } catch (parseError) {
      console.warn("Failed to parse telegram response:", parseError);
    }

    if (!response.ok) {
      console.warn("Telegram notification returned non-200 status:", response.status);
      // Don't show error toast for failed notification - it's not critical
      return false;
    }

    if (result?.success === false) {
      console.warn("Telegram notification failed:", result.error);
      return false;
    }

    // Show success toast that auto-disappears
    toast({
      title: "Added ✓",
      description: `${params.name} added to ${params.provider === "netflix" ? "Netflix" : "Prime"}`,
    });

    return true;
  } catch (error) {
    console.warn("Error sending telegram notification:", error);
    // Don't show toast on error - notification failure is not critical
    return false;
  }
};
