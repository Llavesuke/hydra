import { registerEvent } from "../register-event";
import { collectionsSublevel, levelKeys } from "@main/level";

const removeGameFromCollection = async (
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
      throw new Error("Cannot manually remove games from smart collections");
    }

    const updatedCollection = {
      ...collection,
      gameIds: collection.gameIds.filter((id) => id !== gameId),
      updatedAt: new Date(),
    };

    await collectionsSublevel.put(collectionKey, updatedCollection);
    return updatedCollection;
  } catch (error) {
    throw new Error(`Failed to remove game from collection: ${error}`);
  }
};

registerEvent("removeGameFromCollection", removeGameFromCollection);
