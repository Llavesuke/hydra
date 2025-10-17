import { registerEvent } from "../register-event";
import { collectionsSublevel, levelKeys } from "@main/level";
import type { LibraryCollection } from "@types";

const createCollection = async (
  _event: Electron.IpcMainInvokeEvent,
  name: string
) => {
  const id = `collection-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const collection: LibraryCollection = {
    id,
    name,
    gameIds: [],
    isSmartCollection: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await collectionsSublevel.put(levelKeys.collection(id), collection);
    return collection;
  } catch (error) {
    throw new Error(`Failed to create collection: ${error}`);
  }
};

registerEvent("createCollection", createCollection);
