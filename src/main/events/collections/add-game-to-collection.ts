import { registerEvent } from "../register-event";
import { collectionsSublevel, levelKeys } from "@main/level";

const addGameToCollection = async (
  _event: Electron.IpcMainInvokeEvent,
  collectionId: string,
  gameId: string
) => {
  const collectionKey = levelKeys.collection(collectionId);

  try {
    const collection = await collectionsSublevel.get(collectionKey);
    if (!collection) {
      throw new Error("Collection not found");
    }

    if (collection.isSmartCollection) {
      throw new Error("Cannot manually add games to smart collections");
    }

    if (!collection.gameIds.includes(gameId)) {
      const updatedCollection = {
        ...collection,
        gameIds: [...collection.gameIds, gameId],
        updatedAt: new Date(),
      };

      await collectionsSublevel.put(collectionKey, updatedCollection);
      return updatedCollection;
    }

    return collection;
  } catch (error) {
    throw new Error(`Failed to add game to collection: ${error}`);
  }
};

registerEvent("addGameToCollection", addGameToCollection);
