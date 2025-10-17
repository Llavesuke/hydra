import { registerEvent } from "../register-event";
import { collectionsSublevel } from "@main/level";

const getCollections = async () => {
  try {
    const collections = await collectionsSublevel.values().all();
    return collections;
  } catch (error) {
    console.error("Failed to get collections:", error);
    return [];
  }
};

registerEvent("getCollections", getCollections);
