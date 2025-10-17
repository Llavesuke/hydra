import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LibraryGame, ShortcutLocation } from "@types";
import { useDownload, useLibrary, useToast } from "@renderer/hooks";
import { useGameModals } from "@renderer/context";
import { logger } from "@renderer/logger";

export interface UseGameActionsOptions {
  onOpenDownloadOptions?: () => void;
  onOpenGameOptions?: () => void;
  onGameUpdated?: () => void | Promise<void>;
}

export function useGameActions(
  game: LibraryGame,
  options?: UseGameActionsOptions
) {
  const { t } = useTranslation("game_details");
  const { showSuccessToast, showErrorToast } = useToast();
  const { updateLibrary } = useLibrary();
  const { openDownloadOptions, openGameOptions, closeAll } = useGameModals();
  const {
    removeGameInstaller,
    removeGameFromLibrary,
    isGameDeleting,
    lastPacket,
    cancelDownload,
  } = useDownload();

  const [creatingSteamShortcut, setCreatingSteamShortcut] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);

  const canPlay = Boolean(game.executablePath);
  const isDeleting = isGameDeleting(game.id);
  const isGameDownloading =
    game.download?.status === "active" && lastPacket?.gameId === game.id;
  const hasRepacks = true;
  const shouldShowCreateStartMenuShortcut =
    window.electron.platform === "win32";

  useEffect(() => {
    const unsubscribe = window.electron.onGamesRunning((gamesIds) => {
      const updatedIsGameRunning =
        !!game?.id &&
        !!gamesIds.find((gameRunning) => gameRunning.id == game.id);

      setIsGameRunning(updatedIsGameRunning);
    });

    return () => {
      unsubscribe();
    };
  }, [game?.id]);

  const triggerDownloadOptions = () => {
    if (options?.onOpenDownloadOptions) {
      options.onOpenDownloadOptions();
      try {
        window.dispatchEvent(
          new CustomEvent("hydra:openRepacks", {
            detail: {
              shop: game.shop,
              objectId: game.objectId,
              suppressGlobal: true,
            },
          })
        );
      } catch (e) {
        void e;
      }
      return;
    }

    openDownloadOptions(game);
  };

  const triggerGameOptions = () => {
    if (options?.onOpenGameOptions) {
      options.onOpenGameOptions();
      try {
        window.dispatchEvent(
          new CustomEvent("hydra:openGameOptions", {
            detail: {
              shop: game.shop,
              objectId: game.objectId,
              suppressGlobal: true,
            },
          })
        );
      } catch (e) {
        void e;
      }
      return;
    }

    openGameOptions(game);
  };

  const handlePlayGame = async () => {
    if (!canPlay) {
      triggerDownloadOptions();
      return;
    }

    try {
      await window.electron.openGame(
        game.shop,
        game.objectId,
        game.executablePath!,
        game.launchOptions
      );
    } catch (error) {
      showErrorToast("Failed to start game");
      logger.error("Failed to start game", error);
    }
  };

  const handleCloseGame = async () => {
    try {
      await window.electron.closeGame(game.shop, game.objectId);
    } catch (error) {
      showErrorToast("Failed to close game");
      logger.error("Failed to close game", error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (game.favorite) {
        await window.electron.removeGameFromFavorites(game.shop, game.objectId);
        showSuccessToast(t("game_removed_from_favorites"));
      } else {
        await window.electron.addGameToFavorites(game.shop, game.objectId);
        showSuccessToast(t("game_added_to_favorites"));
      }
      await updateLibrary();
      try {
        window.dispatchEvent(
          new CustomEvent("hydra:game-favorite-toggled", {
            detail: { shop: game.shop, objectId: game.objectId },
          })
        );
      } catch (e) {
        void e;
      }

      await options?.onGameUpdated?.();
    } catch (error) {
      showErrorToast(t("failed_update_favorites"));
      logger.error("Failed to toggle favorite", error);
    }
  };

  const handleCreateShortcut = async (location: ShortcutLocation) => {
    try {
      const success = await window.electron.createGameShortcut(
        game.shop,
        game.objectId,
        location
      );

      if (success) {
        showSuccessToast(t("create_shortcut_success"));
      } else {
        showErrorToast(t("create_shortcut_error"));
      }
    } catch (error) {
      showErrorToast(t("create_shortcut_error"));
      logger.error("Failed to create shortcut", error);
    }
  };

  const handleCreateSteamShortcut = async () => {
    try {
      setCreatingSteamShortcut(true);
      await window.electron.createSteamShortcut(game.shop, game.objectId);

      showSuccessToast(
        t("create_shortcut_success"),
        t("you_might_need_to_restart_steam")
      );
    } catch (error) {
      logger.error("Failed to create Steam shortcut", error);
      showErrorToast(t("create_shortcut_error"));
    } finally {
      setCreatingSteamShortcut(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await window.electron.openGameExecutablePath(game.shop, game.objectId);
    } catch (error) {
      showErrorToast("Failed to open folder");
      logger.error("Failed to open folder", error);
    }
  };

  const handleOpenDownloadOptions = () => {
    triggerDownloadOptions();
  };

  const handleOpenGameOptions = () => {
    triggerGameOptions();
  };

  const handleOpenDownloadLocation = async () => {
    try {
      await window.electron.openGameInstallerPath(game.shop, game.objectId);
    } catch (error) {
      showErrorToast("Failed to open download location");
      logger.error("Failed to open download location", error);
    }
  };

  const handleRemoveFromLibrary = async () => {
    try {
      if (isGameDownloading) {
        await cancelDownload(game.shop, game.objectId);
      }

      await removeGameFromLibrary(game.shop, game.objectId);
      await updateLibrary();
      showSuccessToast(t("game_removed_from_library"));
      try {
        window.dispatchEvent(
          new CustomEvent("hydra:game-removed-from-library", {
            detail: { shop: game.shop, objectId: game.objectId },
          })
        );
      } catch (e) {
        void e;
      }

      await options?.onGameUpdated?.();
      closeAll();
    } catch (error) {
      showErrorToast(t("failed_remove_from_library"));
      logger.error("Failed to remove from library", error);
    }
  };

  const handleRemoveFiles = async () => {
    try {
      await removeGameInstaller(game.shop, game.objectId);
      await updateLibrary();
      showSuccessToast(t("files_removed_success"));
      try {
        window.dispatchEvent(
          new CustomEvent("hydra:game-files-removed", {
            detail: { shop: game.shop, objectId: game.objectId },
          })
        );
      } catch (e) {
        void e;
      }

      await options?.onGameUpdated?.();
    } catch (error) {
      showErrorToast(t("failed_remove_files"));
      logger.error("Failed to remove files", error);
    }
  };

  return {
    canPlay,
    isDeleting,
    isGameDownloading,
    isGameRunning,
    hasRepacks,
    shouldShowCreateStartMenuShortcut,
    creatingSteamShortcut,
    handlePlayGame,
    handleCloseGame,
    handleToggleFavorite,
    handleCreateShortcut,
    handleCreateSteamShortcut,
    handleOpenFolder,
    handleOpenDownloadOptions,
    handleOpenDownloadLocation,
    handleRemoveFromLibrary,
    handleRemoveFiles,
    handleOpenGameOptions,
  };
}
