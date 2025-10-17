import axios from "axios";
import type { SteamNewsEntry, SteamNewsItem, SteamNewsResponse } from "@types";
import { gamesSublevel, gamesShopAssetsSublevel } from "@main/level";
import { logger } from "./logger";

interface CachedNewsEntry {
  news: SteamNewsEntry[];
  timestamp: number;
}

const NEWS_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_NEWS_ITEMS_PER_GAME = 3;
const MAX_GAMES_WITH_NEWS = 10;
const NEWS_REQUEST_TIMEOUT_MS = 5000;

let newsCache: CachedNewsEntry | null = null;

const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, "").trim();
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

const fetchSteamNews = async (
  appId: string,
  language: string = "english"
): Promise<SteamNewsItem[]> => {
  try {
    const languageCode = language.toLowerCase().includes("en")
      ? "english"
      : language.toLowerCase();

    const response = await axios.get<SteamNewsResponse>(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/`,
      {
        params: {
          appid: appId,
          count: MAX_NEWS_ITEMS_PER_GAME,
          maxlength: 300,
          format: "json",
        },
        timeout: NEWS_REQUEST_TIMEOUT_MS,
      }
    );

    if (response.data?.appnews?.newsitems) {
      return response.data.appnews.newsitems.map((item) => ({
        ...item,
        appid: appId,
        contents: truncateText(stripHtmlTags(item.contents), 200),
      }));
    }

    if (languageCode !== "english") {
      const fallbackResponse = await axios.get<SteamNewsResponse>(
        `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/`,
        {
          params: {
            appid: appId,
            count: MAX_NEWS_ITEMS_PER_GAME,
            maxlength: 300,
            format: "json",
          },
          timeout: NEWS_REQUEST_TIMEOUT_MS,
        }
      );

      if (fallbackResponse.data?.appnews?.newsitems) {
        return fallbackResponse.data.appnews.newsitems.map((item) => ({
          ...item,
          appid: appId,
          contents: truncateText(stripHtmlTags(item.contents), 200),
        }));
      }
    }

    return [];
  } catch (error) {
    logger.error(`Error fetching Steam news for appId ${appId}:`, error);
    return [];
  }
};

const calculateRelevanceScore = (
  game: {
    isFavorite?: boolean;
    executablePath?: string | null;
    lastTimePlayed?: Date | null;
  },
  hasNews: boolean
): number => {
  let score = 0;

  if (!hasNews) return -1;

  if (game.isFavorite) {
    score += 100;
  }

  if (game.executablePath) {
    score += 50;
  }

  if (game.lastTimePlayed) {
    const daysSincePlay =
      (Date.now() - new Date(game.lastTimePlayed).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSincePlay <= 7) {
      score += 40;
    } else if (daysSincePlay <= 30) {
      score += 20;
    } else if (daysSincePlay <= 90) {
      score += 10;
    }
  }

  return score;
};

export const getSteamNewsForLibrary = async (
  language: string = "english"
): Promise<SteamNewsEntry[]> => {
  if (newsCache && Date.now() - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    logger.log("Returning cached Steam news");
    return newsCache.news;
  }

  try {
    const games = await gamesSublevel
      .iterator()
      .all()
      .then((results) => results.filter(([_key, game]) => !game.isDeleted));

    const steamGames = games.filter(
      ([_key, game]) => game.shop === "steam" && game.objectId
    );

    const newsPromises = steamGames.map(async ([key, game]) => {
      const newsItems = await fetchSteamNews(game.objectId, language);
      const gameAssets = await gamesShopAssetsSublevel
        .get(key)
        .catch(() => null);

      const relevanceScore = calculateRelevanceScore(
        {
          isFavorite: game.favorite,
          executablePath: game.executablePath,
          lastTimePlayed: game.lastTimePlayed,
        },
        newsItems.length > 0
      );

      return {
        appId: game.objectId,
        gameTitle: game.title,
        newsItems,
        coverImageUrl: gameAssets?.coverImageUrl || null,
        libraryImageUrl: gameAssets?.libraryImageUrl || null,
        isFavorite: game.favorite || false,
        isInstalled: Boolean(game.executablePath),
        lastPlayed: game.lastTimePlayed || null,
        relevanceScore,
      };
    });

    const newsResults = await Promise.all(newsPromises);

    const filteredNews = newsResults
      .filter((entry) => entry.newsItems.length > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MAX_GAMES_WITH_NEWS)
      .map((entry) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { relevanceScore, ...rest } = entry;
        return rest;
      });

    newsCache = {
      news: filteredNews,
      timestamp: Date.now(),
    };

    logger.log(`Fetched Steam news for ${filteredNews.length} games`);

    return filteredNews;
  } catch (error) {
    logger.error("Error fetching Steam news for library:", error);
    return [];
  }
};

export const clearSteamNewsCache = () => {
  newsCache = null;
  logger.log("Steam news cache cleared");
};
