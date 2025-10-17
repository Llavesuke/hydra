import { collectionsSublevel, levelKeys } from "@main/level";
import type { LibraryCollection } from "@types";

export const initializeSmartCollections = async () => {
  try {
    const existingCollections = await collectionsSublevel.values().all();
    
    const smartCollections: LibraryCollection[] = [
      {
        id: "favorites",
        name: "Favorites",
        gameIds: [],
        isSmartCollection: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "installed",
        name: "Installed",
        gameIds: [],
        isSmartCollection: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const smartCollection of smartCollections) {
      const exists = existingCollections.some(
        (c) => c.id === smartCollection.id
      );
      
      if (!exists) {
        await collectionsSublevel.put(
          levelKeys.collection(smartCollection.id),
          smartCollection
        );
      }
    }
  } catch (error) {
    console.error("Failed to initialize smart collections:", error);
  }
};
