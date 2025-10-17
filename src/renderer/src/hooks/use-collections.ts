import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  setCollections,
  addCollection,
  updateCollection,
  removeCollection,
} from "@renderer/features";

export function useCollections() {
  const dispatch = useAppDispatch();
  const collections = useAppSelector((state) => state.collections.value);

  const loadCollections = useCallback(async () => {
    const collections = await window.electron.getCollections();
    dispatch(setCollections(collections));
  }, [dispatch]);

  const createCollection = useCallback(
    async (name: string) => {
      const collection = await window.electron.createCollection(name);
      dispatch(addCollection(collection));
      return collection;
    },
    [dispatch]
  );

  const renameCollection = useCallback(
    async (collectionId: string, newName: string) => {
      const collection = await window.electron.renameCollection(
        collectionId,
        newName
      );
      dispatch(updateCollection(collection));
      return collection;
    },
    [dispatch]
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      await window.electron.deleteCollection(collectionId);
      dispatch(removeCollection(collectionId));
    },
    [dispatch]
  );

  const addGameToCollection = useCallback(
    async (collectionId: string, gameId: string) => {
      const collection = await window.electron.addGameToCollection(
        collectionId,
        gameId
      );
      dispatch(updateCollection(collection));
      return collection;
    },
    [dispatch]
  );

  const removeGameFromCollection = useCallback(
    async (collectionId: string, gameId: string) => {
      const collection = await window.electron.removeGameFromCollection(
        collectionId,
        gameId
      );
      dispatch(updateCollection(collection));
      return collection;
    },
    [dispatch]
  );

  return {
    collections,
    loadCollections,
    createCollection,
    renameCollection,
    deleteCollection,
    addGameToCollection,
    removeGameFromCollection,
  };
}
