import {
  DownloadIcon,
  GearIcon,
  HeartFillIcon,
  HeartIcon,
  PinIcon,
  PinSlashIcon,
  PlayIcon,
  PlusCircleIcon,
} from "@primer/octicons-react";
import { Button, useGameActions } from "@renderer/components";
import { useLibrary, useToast, useUserDetails } from "@renderer/hooks";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { gameDetailsContext } from "@renderer/context";
import type { GameRepack, LibraryGame, UserDetails } from "@types";

import "./hero-panel-actions.scss";

interface HeroPanelGameActionsProps {
  game: LibraryGame;
  repacks: GameRepack[];
  userDetails: UserDetails | null;
  onToggleGamePinned: () => Promise<void>;
  onOpenGameOptions: () => void;
  onOpenDownloadOptions: () => void;
  updateGame: () => Promise<void>;
  toggleLibraryGameDisabled: boolean;
  setToggleLibraryGameDisabled: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

function HeroPanelGameActions({
  game,
  repacks,
  userDetails,
  onToggleGamePinned,
  onOpenGameOptions,
  onOpenDownloadOptions,
  updateGame,
  toggleLibraryGameDisabled,
  setToggleLibraryGameDisabled,
}: Readonly<HeroPanelGameActionsProps>) {
  const { t } = useTranslation("game_details");

  const {
    canPlay,
    isDeleting,
    isGameDownloading,
    isGameRunning,
    handlePlayGame,
    handleCloseGame,
    handleToggleFavorite,
    handleOpenDownloadOptions,
    handleOpenGameOptions,
  } = useGameActions(game, {
    onOpenDownloadOptions,
    onOpenGameOptions,
    onGameUpdated: updateGame,
  });

  const disableActions = isDeleting || toggleLibraryGameDisabled;

  const handleFavoriteClick = async () => {
    setToggleLibraryGameDisabled(true);

    try {
      await handleToggleFavorite();
    } finally {
      setToggleLibraryGameDisabled(false);
    }
  };

  const renderPrimaryAction = () => {
    if (isGameRunning) {
      return (
        <Button
          onClick={() => {
            void handleCloseGame();
          }}
          theme="outline"
          disabled={disableActions}
          className="hero-panel-actions__action"
        >
          {t("close")}
        </Button>
      );
    }

    if (canPlay) {
      return (
        <Button
          onClick={() => {
            void handlePlayGame();
          }}
          theme="outline"
          disabled={disableActions}
          className="hero-panel-actions__action"
        >
          <PlayIcon />
          {t("play")}
        </Button>
      );
    }

    const downloadDisabled =
      disableActions || isGameDownloading || repacks.length === 0;

    return (
      <Button
        onClick={handleOpenDownloadOptions}
        theme="outline"
        disabled={downloadDisabled}
        className={`hero-panel-actions__action ${
          repacks.length === 0 ? "hero-panel-actions__action--disabled" : ""
        }`}
      >
        <DownloadIcon />
        {t("download")}
      </Button>
    );
  };

  return (
    <div className="hero-panel-actions__container">
      {renderPrimaryAction()}
      <div className="hero-panel-actions__separator" />
      <Button
        onClick={() => {
          void handleFavoriteClick();
        }}
        theme="outline"
        disabled={disableActions}
        className="hero-panel-actions__action"
      >
        {game.favorite ? <HeartFillIcon /> : <HeartIcon />}
      </Button>

      {userDetails && game.shop !== "custom" && (
        <Button
          onClick={() => {
            void onToggleGamePinned();
          }}
          theme="outline"
          disabled={disableActions}
          className="hero-panel-actions__action"
        >
          {game.isPinned ? <PinSlashIcon /> : <PinIcon />}
        </Button>
      )}

      <Button
        onClick={handleOpenGameOptions}
        theme="outline"
        disabled={disableActions}
        className="hero-panel-actions__action"
      >
        <GearIcon />
        {t("options")}
      </Button>
    </div>
  );
}

export function HeroPanelActions() {
  const [toggleLibraryGameDisabled, setToggleLibraryGameDisabled] =
    useState(false);

  const { userDetails } = useUserDetails();

  const {
    game,
    repacks,
    shop,
    objectId,
    gameTitle,
    setShowGameOptionsModal,
    setShowRepacksModal,
    updateGame,
  } = useContext(gameDetailsContext);

  const { updateLibrary } = useLibrary();

  const { showSuccessToast } = useToast();

  const { t } = useTranslation("game_details");

  useEffect(() => {
    const onFavoriteToggled = () => {
      updateLibrary();
      updateGame();
    };

    const onGameRemoved = () => {
      updateLibrary();
      updateGame();
    };

    const onFilesRemoved = () => {
      updateLibrary();
      updateGame();
    };

    window.addEventListener(
      "hydra:game-favorite-toggled",
      onFavoriteToggled as EventListener
    );
    window.addEventListener(
      "hydra:game-removed-from-library",
      onGameRemoved as EventListener
    );
    window.addEventListener(
      "hydra:game-files-removed",
      onFilesRemoved as EventListener
    );

    return () => {
      window.removeEventListener(
        "hydra:game-favorite-toggled",
        onFavoriteToggled as EventListener
      );
      window.removeEventListener(
        "hydra:game-removed-from-library",
        onGameRemoved as EventListener
      );
      window.removeEventListener(
        "hydra:game-files-removed",
        onFilesRemoved as EventListener
      );
    };
  }, [updateLibrary, updateGame]);

  const addGameToLibrary = async () => {
    setToggleLibraryGameDisabled(true);

    try {
      await window.electron.addGameToLibrary(shop, objectId!, gameTitle);

      updateLibrary();
      updateGame();
    } finally {
      setToggleLibraryGameDisabled(false);
    }
  };

  const toggleGamePinned = async () => {
    setToggleLibraryGameDisabled(true);

    try {
      if (game?.isPinned && objectId) {
        await window.electron.toggleGamePin(shop, objectId, false).then(() => {
          showSuccessToast(t("game_removed_from_pinned"));
        });
      } else {
        if (!objectId) return;

        await window.electron.toggleGamePin(shop, objectId, true).then(() => {
          showSuccessToast(t("game_added_to_pinned"));
        });
      }

      updateLibrary();
      updateGame();
    } finally {
      setToggleLibraryGameDisabled(false);
    }
  };

  const addGameToLibraryButton = (
    <Button
      theme="outline"
      disabled={toggleLibraryGameDisabled}
      onClick={addGameToLibrary}
      className="hero-panel-actions__action"
    >
      <PlusCircleIcon />
      {t("add_to_library")}
    </Button>
  );

  const showDownloadOptionsButton = (
    <Button
      onClick={() => setShowRepacksModal(true)}
      theme="outline"
      disabled={toggleLibraryGameDisabled}
      className="hero-panel-actions__action"
    >
      {t("open_download_options")}
    </Button>
  );

  if (repacks.length && !game) {
    return (
      <>
        {addGameToLibraryButton}
        {showDownloadOptionsButton}
      </>
    );
  }

  if (!game) {
    return addGameToLibraryButton;
  }

  return (
    <HeroPanelGameActions
      game={game}
      repacks={repacks}
      userDetails={userDetails}
      onToggleGamePinned={toggleGamePinned}
      onOpenGameOptions={() => setShowGameOptionsModal(true)}
      onOpenDownloadOptions={() => setShowRepacksModal(true)}
      updateGame={updateGame}
      toggleLibraryGameDisabled={toggleLibraryGameDisabled}
      setToggleLibraryGameDisabled={setToggleLibraryGameDisabled}
    />
  );
}
