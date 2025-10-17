import { registerEvent } from "../register-event";
import { collectionsSublevel, levelKeys } from "@main/level";

const renameCollection = async (
  _event: Electron.IpcMainInvokeEvent,
  collectionId: string,
  newName: string
) => {
  const collectionKey = levelKeys.collection(collectionId);

  try {
    const collection = await collectionsSublevel.get(collectionKey);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const updatedCollection = {
      ...collection,
      name: newName,
      updatedAt: new Date(),
    };

    await collectionsSublevel.put(collectionKey, updatedCollection);
    return updatedCollection;
  } catch (error) {
    throw new Error(`Failed to rename collection: ${error}`);
  }
};

registerEvent("renameCollection", renameCollection);
