import { useCallback, useEffect, useState } from "react";
import type { SteamNewsEntry } from "@types";
import { useTranslation } from "react-i18next";

interface UseSteamNewsResult {
  news: SteamNewsEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSteamNews(): UseSteamNewsResult {
  const { i18n } = useTranslation();
  const [news, setNews] = useState<SteamNewsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const language = i18n.language || "english";
      const newsData = await window.electron.getSteamNews(language);
      setNews(newsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news,
    isLoading,
    error,
    refetch: fetchNews,
  };
}
