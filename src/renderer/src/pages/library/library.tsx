import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  ChevronDownIcon,
} from "@primer/octicons-react";

import { LibraryGameCard, SteamNewsSection } from "@renderer/components";
import { useLibrary, useCollections } from "@renderer/hooks";
import { useAppDispatch, useAppSelector } from "@renderer/hooks/redux";
import {
  setSearchText,
  toggleCategory,
  clearCategories,
  setSortBy,
  clearLibraryFilters,
  selectFilteredAndSortedGames,
  selectAvailableCategories,
  setLibrary,
  type SortBy,
} from "@renderer/features";
import { buildGameDetailsPath } from "@renderer/helpers";
import type { LibraryGame } from "@types";
import { CreateCollectionModal } from "./modals/create-collection-modal";
import { ManageCollectionsModal } from "./modals/manage-collections-modal";

import "./library.scss";

export default function Library() {
  const { t } = useTranslation("library");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { library, updateLibrary } = useLibrary();
  const { loadCollections } = useCollections();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [localSearchText, setLocalSearchText] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const filteredLibrary = useAppSelector(selectFilteredAndSortedGames);
  const availableCategories = useAppSelector(selectAvailableCategories);
  const selectedCategories = useAppSelector(
    (state) => state.libraryFilters.selectedCategories
  );
  const sortBy = useAppSelector((state) => state.libraryFilters.sortBy);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([updateLibrary(), loadCollections()]).finally(() => {
      setIsLoading(false);
    });
  }, [updateLibrary, loadCollections]);

  // Load categories after library is loaded
  useEffect(() => {
    if (library.length > 0 && !isLoadingCategories) {
      setIsLoadingCategories(true);
      const gamesData = library.map((game) => ({
        id: game.id,
        shop: game.shop,
        objectId: game.objectId,
      }));

      window.electron
        .getLibraryCategories(gamesData)
        .then((categoriesMap) => {
          Object.keys(categoriesMap).forEach((gameId) => {
            const game = library.find((g) => g.id === gameId);
            if (game) {
              game.categories = categoriesMap[gameId];
            }
          });

          dispatch(setLibrary([...library]));
        })
        .catch((err) => {
          console.error("Failed to load categories:", err);
        })
        .finally(() => {
          setIsLoadingCategories(false);
        });
    }
  }, [library.length]);

  useEffect(() => {
    const onFavoriteToggled = () => {
      updateLibrary();
    };

    const onGameRemoved = () => {
      updateLibrary();
    };

    const onFilesRemoved = () => {
      updateLibrary();
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
  }, [updateLibrary]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      dispatch(setSearchText(localSearchText));
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localSearchText, dispatch]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setShowCategoryMenu(false);
      }
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGameClick = useCallback(
    (game: LibraryGame) => {
      const path = buildGameDetailsPath({
        ...game,
        objectId: game.objectId,
      });
      navigate(path);
    },
    [navigate]
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchText(event.target.value);
  };

  const handleClearSearch = () => {
    setLocalSearchText("");
    dispatch(setSearchText(""));
    searchInputRef.current?.focus();
  };

  const handleToggleCategory = (category: string) => {
    dispatch(toggleCategory(category));
  };

  const handleClearCategories = () => {
    dispatch(clearCategories());
  };

  const handleSortChange = (newSortBy: SortBy) => {
    dispatch(setSortBy(newSortBy));
    setShowSortMenu(false);
  };

  const handleClearAllFilters = () => {
    setLocalSearchText("");
    dispatch(clearLibraryFilters());
  };

  const handleCollectionCreated = useCallback(() => {
    loadCollections();
  }, [loadCollections]);

  const isEmpty = !isLoading && filteredLibrary.length === 0;
  const hasActiveFilters = useMemo(() => {
    return Boolean(localSearchText || selectedCategories.length > 0);
  }, [localSearchText, selectedCategories.length]);

  return (
    <SkeletonTheme baseColor="#1c1c1c" highlightColor="#444">
      <section className="library">
        <div className="library__utility-bar">
          <div className="library__search-wrapper">
            <SearchIcon size={16} />
            <input
              ref={searchInputRef}
              type="text"
              className="library__search-input"
              placeholder={t("search_placeholder")}
              value={localSearchText}
              onChange={handleSearchChange}
            />
            {localSearchText && (
              <button
                type="button"
                className="library__clear-search"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>

          <div className="library__utility-actions">
            <div className="library__filter-group" ref={sortMenuRef}>
              <button
                type="button"
                className="library__utility-button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                aria-label={t("sort_by")}
              >
                <span>{t("sort_by")}</span>
                <ChevronDownIcon size={16} />
              </button>

              {showSortMenu && (
                <div className="library__dropdown-menu">
                  <button
                    type="button"
                    className={`library__menu-item${sortBy === "default" ? " library__menu-item--active" : ""}`}
                    onClick={() => handleSortChange("default")}
                    title={t("smart_suggestions_tooltip")}
                  >
                    {t("sort_smart")}
                  </button>
                  <button
                    type="button"
                    className={`library__menu-item${sortBy === "title" ? " library__menu-item--active" : ""}`}
                    onClick={() => handleSortChange("title")}
                  >
                    {t("sort_title")}
                  </button>
                  <button
                    type="button"
                    className={`library__menu-item${sortBy === "addedDate" ? " library__menu-item--active" : ""}`}
                    onClick={() => handleSortChange("addedDate")}
                  >
                    {t("sort_added_date")}
                  </button>
                  <button
                    type="button"
                    className={`library__menu-item${sortBy === "recentPlaytime" ? " library__menu-item--active" : ""}`}
                    onClick={() => handleSortChange("recentPlaytime")}
                  >
                    {t("sort_playtime")}
                  </button>
                  <button
                    type="button"
                    className={`library__menu-item${sortBy === "lastPlayed" ? " library__menu-item--active" : ""}`}
                    onClick={() => handleSortChange("lastPlayed")}
                  >
                    {t("sort_last_played")}
                  </button>
                </div>
              )}
            </div>

            <div className="library__filter-group" ref={categoryMenuRef}>
              <button
                type="button"
                className={`library__utility-button${selectedCategories.length > 0 ? " library__utility-button--active" : ""}`}
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                aria-label={t("categories")}
              >
                <FilterIcon size={16} />
                <span>
                  {t("categories")}
                  {selectedCategories.length > 0 &&
                    ` (${selectedCategories.length})`}
                </span>
              </button>

              {showCategoryMenu && (
                <div className="library__dropdown-menu library__dropdown-menu--scrollable">
                  {availableCategories.length > 0 ? (
                    <>
                      {selectedCategories.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="library__menu-item library__menu-item--clear"
                            onClick={handleClearCategories}
                          >
                            <XIcon size={14} />
                            {t("clear_filters")}
                          </button>
                          <div className="library__menu-divider" />
                        </>
                      )}
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={`library__menu-item library__menu-item--checkbox${selectedCategories.includes(category) ? " library__menu-item--active" : ""}`}
                          onClick={() => handleToggleCategory(category)}
                        >
                          <span className="library__checkbox">
                            {selectedCategories.includes(category) && "✓"}
                          </span>
                          {category}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="library__menu-item library__menu-item--disabled">
                      {t("no_categories")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="library__utility-button"
              onClick={() => setShowCreateModal(true)}
            >
              {t("create_collection")}
            </button>

            <button
              type="button"
              className="library__utility-button"
              onClick={() => setShowManageModal(true)}
            >
              {t("manage_collections")}
            </button>
          </div>
        </div>

        <div
          className="library__news-section"
          data-library-news-slot
          role="complementary"
          aria-label={t("news")}
        >
          <SteamNewsSection />
        </div>

        <div className="library__content">
          {isLoading ? (
            <div className="library__grid">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="library__skeleton" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="library__empty-state">
              <h2>{t("empty_title")}</h2>
              <p>{t("empty_description")}</p>
            </div>
          ) : (
            <div className="library__grid">
              <AnimatePresence>
                {filteredLibrary.map((game, idx) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{
                      duration: 0.2,
                      delay: Math.min(idx * 0.02, 0.2),
                    }}
                  >
                    <LibraryGameCard
                      game={game}
                      onNavigate={() => handleGameClick(game)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {hasActiveFilters && (
            <div className="library__filters-footer">
              <button
                type="button"
                className="library__chip library__chip--clear"
                onClick={handleClearAllFilters}
              >
                <XIcon size={14} />
                {t("clear_filters")}
              </button>
            </div>
          )}
        </div>

        <CreateCollectionModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCollectionCreated={handleCollectionCreated}
        />

        <ManageCollectionsModal
          visible={showManageModal}
          onClose={() => setShowManageModal(false)}
        />
      </section>
    </SkeletonTheme>
  );
}
