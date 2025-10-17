import type { GameShop, UserPreferences } from "@types";
import { registerEvent } from "../register-event";
import { getSteamAppCategories } from "@main/services/steam";
import { db, levelKeys } from "@main/level";

interface GameCategoriesMap {
  [gameId: string]: string[];
}

const getLibraryCategories = async (
  _event: Electron.IpcMainInvokeEvent,
  games: Array<{ id: string; shop: GameShop; objectId: string }>
): Promise<GameCategoriesMap> => {
  const result: GameCategoriesMap = {};

  // Get user language preference
  const userPreferences = await db
    .get<string, UserPreferences | null>(levelKeys.userPreferences, {
      valueEncoding: "json",
    })
    .catch(() => null);
  const language = userPreferences?.language || "english";

  // Fetch categories for Steam games
  const steamGames = games.filter((game) => game.shop === "steam");

  await Promise.all(
    steamGames.map(async (game) => {
      try {
        const categories = await getSteamAppCategories(game.objectId, language);
        if (categories.length > 0) {
          result[game.id] = categories;
        }
      } catch (error) {
        // Silently fail for individual games
      }
    })
  );

  return result;
};

registerEvent("getLibraryCategories", getLibraryCategories);
