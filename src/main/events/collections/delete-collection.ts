import { registerEvent } from "../register-event";
import { collectionsSublevel, levelKeys } from "@main/level";

const deleteCollection = async (
  _event: Electron.IpcMainInvokeEvent,
  collectionId: string
) => {
  const collectionKey = levelKeys.collection(collectionId);

  try {
    await collectionsSublevel.del(collectionKey);
  } catch (error) {
    throw new Error(`Failed to delete collection: ${error}`);
  }
};

registerEvent("deleteCollection", deleteCollection);
