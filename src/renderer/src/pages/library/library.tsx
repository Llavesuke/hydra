import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import VirtualList from "rc-virtual-list";
import { SearchIcon, FilterIcon, StackIcon } from "@primer/octicons-react";

import { GameCard } from "@renderer/components";
import { useLibrary } from "@renderer/hooks";
import { buildGameDetailsPath } from "@renderer/helpers";
import type { LibraryGame } from "@types";

import "./library.scss";

const CARD_HEIGHT = 180;
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
  const { library, updateLibrary } = useLibrary();

  const listContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCollectionsOnly, setShowCollectionsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listSize, setListSize] = useState({ width: 0, height: 0 });

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

  const filteredLibrary = useMemo(() => {
    return library
      .filter((game) => !showCollectionsOnly || game.favorite)
      .filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [library, searchQuery, showCollectionsOnly]);

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
    setSearchQuery(event.target.value);
  };

  const handleToggleCollections = () => {
    setShowCollectionsOnly((prev) => !prev);
  };

  const renderRow = (row: LibraryRow) => (
    <div
      className="library__grid-row"
      style={{
        gridTemplateColumns: `repeat(${row.columnCount}, minmax(0, 1fr))`,
      }}
    >
      {row.items.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onClick={() => handleGameClick(game)}
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

  const isEmpty = !isLoading && filteredLibrary.length === 0;
  const virtualListHeight = listSize.height || 600;

  return (
    <SkeletonTheme baseColor="#1c1c1c" highlightColor="#444">
      <section className="library">
        <div className="library__utility-bar">
          <div className="library__search-wrapper">
            <SearchIcon size={16} />
            <input
              type="text"
              className="library__search-input"
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="library__utility-actions">
            <button
              type="button"
              className="library__utility-button"
              title={t("filters")}
              aria-label={t("filters")}
            >
              <FilterIcon size={16} />
              <span>{t("filters")}</span>
            </button>

            <button
              type="button"
              className={`library__utility-button${showCollectionsOnly ? " library__utility-button--active" : ""}`}
              title={t("collections")}
              aria-pressed={showCollectionsOnly}
              aria-label={t("collections")}
              onClick={handleToggleCollections}
            >
              <StackIcon size={16} />
              <span>{t("collections")}</span>
            </button>
          </div>
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
