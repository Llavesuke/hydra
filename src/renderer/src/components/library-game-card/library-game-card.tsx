import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartIcon,
  HeartFillIcon,
  PlayIcon,
  DownloadIcon,
  KebabHorizontalIcon,
  FoldIcon,
  GearIcon,
  XIcon,
} from "@primer/octicons-react";
import { Tooltip } from "react-tooltip";
import type { LibraryGame } from "@types";
import { useGameActions } from "@renderer/components";

import "./library-game-card.scss";

export interface LibraryGameCardProps {
  game: LibraryGame;
  onNavigate?: () => void;
}

export function LibraryGameCard({ game, onNavigate }: LibraryGameCardProps) {
  const { t } = useTranslation("library");
  const {
    canPlay,
    isDeleting,
    isGameDownloading,
    isGameRunning,
    handlePlayGame,
    handleCloseGame,
    handleToggleFavorite,
    handleOpenFolder,
    handleOpenDownloadOptions,
    handleOpenGameOptions,
  } = useGameActions(game);

  const [showMenu, setShowMenu] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        optionsButtonRef.current &&
        !optionsButtonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingFavorite(true);
    try {
      await handleToggleFavorite();
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handlePrimaryAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGameRunning) {
      await handleCloseGame();
    } else {
      await handlePlayGame();
    }
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleMenuItemClick = (
    e: React.MouseEvent,
    action: () => void | Promise<void>
  ) => {
    e.stopPropagation();
    setShowMenu(false);
    action();
  };

  const getPrimaryButtonContent = () => {
    if (isGameRunning) {
      return (
        <>
          <XIcon size={16} />
          {t("close", { ns: "game_details" })}
        </>
      );
    }
    if (canPlay) {
      return (
        <>
          <PlayIcon size={16} />
          {t("play", { ns: "game_details" })}
        </>
      );
    }
    return (
      <>
        <DownloadIcon size={16} />
        {t("download", { ns: "game_details" })}
      </>
    );
  };

  const tooltipId = `library-game-card-${game.id}`;

  const imageUrl = game.coverImageUrl || game.libraryImageUrl || game.iconUrl;
  const displayTitle = (game.title || "").replace(/_/g, " ");

  const handleCardClick = () => {
    if (onNavigate) onNavigate();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onNavigate) {
      e.preventDefault();
      onNavigate();
    }
  };

  return (
    <div
      className="library-game-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="library-game-card__image-container">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="library-game-card__image"
            loading="lazy"
          />
        )}
        <div className="library-game-card__overlay">
          <div className="library-game-card__actions-top">
            <button
              type="button"
              className="library-game-card__icon-button"
              onClick={handleFavoriteClick}
              disabled={isDeleting || isTogglingFavorite}
              data-tooltip-id={tooltipId}
              data-tooltip-content={
                game.favorite
                  ? t("remove_from_favorites", { ns: "game_details" })
                  : t("add_to_favorites", { ns: "game_details" })
              }
              aria-label={
                game.favorite
                  ? t("remove_from_favorites", { ns: "game_details" })
                  : t("add_to_favorites", { ns: "game_details" })
              }
            >
              {game.favorite ? (
                <HeartFillIcon size={16} />
              ) : (
                <HeartIcon size={16} />
              )}
            </button>

            <div className="library-game-card__options-container">
              <button
                ref={optionsButtonRef}
                type="button"
                className="library-game-card__icon-button"
                onClick={handleOptionsClick}
                disabled={isDeleting}
                data-tooltip-id={tooltipId}
                data-tooltip-content={t("options", { ns: "game_details" })}
                aria-label={t("options", { ns: "game_details" })}
              >
                <KebabHorizontalIcon size={16} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    ref={menuRef}
                    className="library-game-card__menu"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {game.executablePath && (
                      <button
                        type="button"
                        className="library-game-card__menu-item"
                        onClick={(e) =>
                          handleMenuItemClick(e, handleOpenFolder)
                        }
                        disabled={isDeleting}
                      >
                        <FoldIcon size={14} />
                        {t("open_folder", { ns: "game_details" })}
                      </button>
                    )}

                    <button
                      type="button"
                      className="library-game-card__menu-item"
                      onClick={(e) =>
                        handleMenuItemClick(e, handleOpenDownloadOptions)
                      }
                      disabled={isDeleting || isGameDownloading}
                    >
                      <DownloadIcon size={14} />
                      {t("open_download_options", { ns: "game_details" })}
                    </button>

                    <button
                      type="button"
                      className="library-game-card__menu-item"
                      onClick={(e) =>
                        handleMenuItemClick(e, handleOpenGameOptions)
                      }
                      disabled={isDeleting}
                    >
                      <GearIcon size={14} />
                      {t("properties", { ns: "game_details" })}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="library-game-card__actions-bottom">
            <button
              type="button"
              className="library-game-card__primary-button"
              onClick={handlePrimaryAction}
              disabled={isDeleting}
            >
              {getPrimaryButtonContent()}
            </button>
          </div>
        </div>
      </div>

      <h3 className="library-game-card__title">{displayTitle}</h3>
      {Array.isArray(game.categories) && game.categories.length > 0 && (
        <div className="library-game-card__categories">
          {game.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="library-game-card__category">
              {cat}
            </span>
          ))}
        </div>
      )}

      <Tooltip
        id={tooltipId}
        style={{ zIndex: 9999 }}
        openOnClick={false}
        place="top"
      />
    </div>
  );
}
