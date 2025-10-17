import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import VirtualList from "rc-virtual-list";
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  ChevronDownIcon,
} from "@primer/octicons-react";

import { LibraryGameCard } from "@renderer/components";
import { useLibrary } from "@renderer/hooks";
import { useAppDispatch, useAppSelector } from "@renderer/hooks/redux";
import {
  setSearchText,
  toggleCategory,
  clearCategories,
  setSortBy,
  toggleQuickFilter,
  clearLibraryFilters,
  selectFilteredAndSortedGames,
  selectAvailableCategories,
  type SortBy,
  type QuickFilter,
} from "@renderer/features";
import { buildGameDetailsPath } from "@renderer/helpers";
import type { LibraryGame } from "@types";

import "./library.scss";

const CARD_HEIGHT = 320;
const CARD_GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + CARD_GAP;

interface LibraryRow {
  key: string;
  items: LibraryGame[];
  columnCount: number;
}

export default function Library() {
  const { t } = useTranslation("library");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { library, updateLibrary } = useLibrary();

  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [localSearchText, setLocalSearchText] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [listSize, setListSize] = useState({ width: 0, height: 0 });

  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const filteredLibrary = useAppSelector(selectFilteredAndSortedGames);
  const availableCategories = useAppSelector(selectAvailableCategories);
  const selectedCategories = useAppSelector(
    (state) => state.libraryFilters.selectedCategories
  );
  const sortBy = useAppSelector((state) => state.libraryFilters.sortBy);
  const activeQuickFilters = useAppSelector(
    (state) => state.libraryFilters.activeQuickFilters
  );

  const getColumnsCount = useCallback((width: number) => {
    if (width >= 1600) return 4;
    if (width >= 1250) return 3;
    if (width >= 768) return 2;
    return 1;
  }, []);

  useEffect(() => {
    const element = listContainerRef.current;
    if (!element) return;

    const updateSize = () => {
      setListSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    updateLibrary().finally(() => {
      setIsLoading(false);
    });
  }, [updateLibrary]);

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
          // Update library games with categories
          // This would ideally update the Redux state but for simplicity
          // we'll handle it through a library refresh pattern
          Object.keys(categoriesMap).forEach((gameId) => {
            const game = library.find((g) => g.id === gameId);
            if (game) {
              game.categories = categoriesMap[gameId];
            }
          });
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

  const columnCount = useMemo(() => {
    return Math.max(getColumnsCount(listSize.width), 1);
  }, [listSize.width, getColumnsCount]);

  const rows = useMemo<LibraryRow[]>(() => {
    const chunkSize = Math.max(columnCount, 1);
    const chunks: LibraryRow[] = [];

    for (let i = 0; i < filteredLibrary.length; i += chunkSize) {
      const items = filteredLibrary.slice(i, i + chunkSize);
      const key = items.map((game) => game.id).join("-") || `row-${i}`;

      chunks.push({
        key,
        items,
        columnCount: chunkSize,
      });
    }

    return chunks;
  }, [filteredLibrary, columnCount]);

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

  const handleQuickFilterToggle = (filter: QuickFilter) => {
    dispatch(toggleQuickFilter(filter));
  };

  const handleClearAllFilters = () => {
    setLocalSearchText("");
    dispatch(clearLibraryFilters());
  };

  const renderRow = (row: LibraryRow) => (
    <div
      className="library__grid-row"
      style={{
        gridTemplateColumns: `repeat(${row.columnCount}, minmax(0, 1fr))`,
      }}
    >
      {row.items.map((game) => (
        <LibraryGameCard
          key={game.id}
          game={game}
          onNavigate={() => handleGameClick(game)}
        />
      ))}
      {row.items.length < row.columnCount &&
        Array.from({ length: row.columnCount - row.items.length }).map(
          (_, index) => (
            <div
              key={`placeholder-${row.key}-${index}`}
              className="library__grid-placeholder"
            />
          )
        )}
    </div>
  );

  const hasActiveFilters =
    localSearchText ||
    selectedCategories.length > 0 ||
    activeQuickFilters.length > 0;

  const isEmpty = !isLoading && filteredLibrary.length === 0;
  const virtualListHeight = listSize.height || 600;

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
          </div>
        </div>

        <div className="library__quick-filters">
          <span className="library__quick-filters-label">
            {t("quick_filters")}:
          </span>
          <button
            type="button"
            className={`library__chip${activeQuickFilters.includes("favorites") ? " library__chip--active" : ""}`}
            onClick={() => handleQuickFilterToggle("favorites")}
          >
            {t("filter_favorites")}
          </button>
          <button
            type="button"
            className={`library__chip${activeQuickFilters.includes("installed") ? " library__chip--active" : ""}`}
            onClick={() => handleQuickFilterToggle("installed")}
          >
            {t("filter_installed")}
          </button>
          <button
            type="button"
            className={`library__chip${activeQuickFilters.includes("backlog") ? " library__chip--active" : ""}`}
            onClick={() => handleQuickFilterToggle("backlog")}
          >
            {t("filter_backlog")}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="library__chip library__chip--clear"
              onClick={handleClearAllFilters}
            >
              <XIcon size={14} />
              {t("clear_filters")}
            </button>
          )}
        </div>

        <div
          className="library__news-section"
          data-library-news-slot
          role="complementary"
          aria-label={t("news")}
        />

        <div className="library__content">
          <div ref={listContainerRef} className="library__list-container">
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
            ) : listSize.height > 0 ? (
              <VirtualList
                data={rows}
                height={virtualListHeight}
                itemHeight={ROW_HEIGHT}
                itemKey="key"
                className="library__virtual-list"
              >
                {renderRow}
              </VirtualList>
            ) : null}
          </div>
        </div>
      </section>
    </SkeletonTheme>
  );
}
