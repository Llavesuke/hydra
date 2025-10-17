import { Modal } from "@renderer/components/modal/modal";
import { TextField } from "@renderer/components/text-field/text-field";
import { Button } from "@renderer/components/button/button";
import { useTranslation } from "react-i18next";
import { useCallback, useState, useMemo } from "react";
import { useCollections } from "@renderer/hooks";
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from "@primer/octicons-react";
import type { LibraryCollection, LibraryGame } from "@types";

import "./modals.scss";

interface ManageCollectionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedGame?: LibraryGame;
  library?: LibraryGame[];
}

export function ManageCollectionsModal({
  visible,
  onClose,
  selectedGame,
}: Readonly<ManageCollectionsModalProps>) {
  const { t } = useTranslation("library");
  const {
    collections,
    renameCollection,
    deleteCollection,
    addGameToCollection,
    removeGameFromCollection,
  } = useCollections();

  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null
  );
  const [editingName, setEditingName] = useState("");
  const [processingCollectionId, setProcessingCollectionId] = useState<
    string | null
  >(null);

  const customCollections = useMemo(
    () => collections.filter((c) => !c.isSmartCollection),
    [collections]
  );

  const handleStartEdit = useCallback((collection: LibraryCollection) => {
    setEditingCollectionId(collection.id);
    setEditingName(collection.name);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCollectionId(null);
    setEditingName("");
  }, []);

  const handleSaveEdit = useCallback(
    async (collectionId: string) => {
      if (!editingName.trim()) return;

      try {
        await renameCollection(collectionId, editingName.trim());
        setEditingCollectionId(null);
        setEditingName("");
      } catch (error) {
        console.error("Failed to rename collection:", error);
      }
    },
    [editingName, renameCollection]
  );

  const handleDelete = useCallback(
    async (collectionId: string) => {
      if (confirm(t("confirm_delete_collection"))) {
        try {
          await deleteCollection(collectionId);
        } catch (error) {
          console.error("Failed to delete collection:", error);
        }
      }
    },
    [deleteCollection, t]
  );

  const handleRemoveGameFromCollection = useCallback(
    async (collectionId: string, gameId: string) => {
      try {
        await removeGameFromCollection(collectionId, gameId);
      } catch (error) {
        console.error("Failed to remove game from collection:", error);
      }
    },
    [removeGameFromCollection]
  );

  const handleToggleGameInCollection = useCallback(
    async (collection: LibraryCollection, gameId: string) => {
      const isInCollection = collection.gameIds.includes(gameId);
      if (isInCollection) {
        await handleRemoveGameFromCollection(collection.id, gameId);
      } else {
        setProcessingCollectionId(collection.id);
        try {
          await addGameToCollection(collection.id, gameId);
        } catch (error) {
          console.error("Failed to toggle game in collection:", error);
        } finally {
          setProcessingCollectionId(null);
        }
      }
    },
    [addGameToCollection, handleRemoveGameFromCollection]
  );

  return (
    <Modal
      visible={visible}
      title={
        selectedGame
          ? t("manage_game_collections_title", { title: selectedGame.title })
          : t("manage_collections_title")
      }
      description={
        selectedGame
          ? t("manage_game_collections_description")
          : t("manage_collections_description")
      }
      onClose={onClose}
      large
    >
      <div className="manage-collections-modal">
        {customCollections.length === 0 ? (
          <div className="manage-collections-modal__empty">
            <p>{t("no_collections_yet")}</p>
          </div>
        ) : selectedGame ? (
          <div className="manage-collections-modal__list">
            {customCollections.map((collection) => {
              const isInCollection = collection.gameIds.includes(
                selectedGame.id
              );
              const isProcessing = processingCollectionId === collection.id;

              return (
                <div
                  key={collection.id}
                  className="manage-collections-modal__item"
                >
                  <label className="manage-collections-modal__checkbox-label">
                    <input
                      type="checkbox"
                      checked={isInCollection}
                      disabled={isProcessing}
                      onChange={() =>
                        handleToggleGameInCollection(collection, selectedGame.id)
                      }
                    />
                    <span>{collection.name}</span>
                  </label>
                  <span className="manage-collections-modal__game-count">
                    {collection.gameIds.length}{" "}
                    {t("games_count", { count: collection.gameIds.length })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="manage-collections-modal__list">
            {customCollections.map((collection) => (
              <div
                key={collection.id}
                className="manage-collections-modal__item"
              >
                {editingCollectionId === collection.id ? (
                  <div className="manage-collections-modal__edit-form">
                    <TextField
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <div className="manage-collections-modal__edit-actions">
                      <Button
                        theme="primary"
                        onClick={() => handleSaveEdit(collection.id)}
                        disabled={!editingName.trim()}
                      >
                        <CheckIcon size={16} />
                      </Button>
                      <Button theme="outline" onClick={handleCancelEdit}>
                        <XIcon size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="manage-collections-modal__info">
                      <span className="manage-collections-modal__name">
                        {collection.name}
                      </span>
                      <span className="manage-collections-modal__game-count">
                        {collection.gameIds.length}{" "}
                        {t("games_count", { count: collection.gameIds.length })}
                      </span>
                    </div>
                    <div className="manage-collections-modal__actions">
                      <button
                        type="button"
                        className="manage-collections-modal__action-button"
                        onClick={() => handleStartEdit(collection)}
                        aria-label={t("rename_collection")}
                      >
                        <PencilIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="manage-collections-modal__action-button manage-collections-modal__action-button--danger"
                        onClick={() => handleDelete(collection.id)}
                        aria-label={t("delete_collection")}
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
