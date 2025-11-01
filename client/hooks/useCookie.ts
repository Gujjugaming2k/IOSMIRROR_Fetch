import { useState, useEffect, useCallback } from "react";

const COOKIE_STORAGE_KEY = "t_hash_cookie";

export function useCookie() {
  const [tHash, setTHash] = useState<string | null>(() => {
    // Load from localStorage on init
    if (typeof window !== "undefined") {
      return localStorage.getItem(COOKIE_STORAGE_KEY);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCookie = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fetch-cookie");
      const data = await response.json();

      if (data.success && data.setCookieHeader) {
        setTHash(data.setCookieHeader);
        localStorage.setItem(COOKIE_STORAGE_KEY, data.setCookieHeader);
        return true;
      } else {
        const errorMsg = data.error || "Failed to fetch cookie";
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch cookie";
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCookie = useCallback(() => {
    setTHash(null);
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    setError(null);
  }, []);

  return {
    tHash,
    loading,
    error,
    fetchCookie,
    clearCookie,
    hasCookie: !!tHash,
  };
}
