import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import VirtualList from "rc-virtual-list";
import { SearchIcon, StackIcon, PlusIcon } from "@primer/octicons-react";

import { GameCard } from "@renderer/components";
import { useLibrary, useCollections } from "@renderer/hooks";
import { buildGameDetailsPath } from "@renderer/helpers";
import type { LibraryGame } from "@types";
import { CreateCollectionModal } from "./modals/create-collection-modal";
import { ManageCollectionsModal } from "./modals/manage-collections-modal";

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
  const { collections, loadCollections } = useCollections();

  const listContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listSize, setListSize] = useState({ width: 0, height: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

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
    Promise.all([updateLibrary(), loadCollections()]).finally(() => {
      setIsLoading(false);
    });
  }, [updateLibrary, loadCollections]);

  const selectedCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, collections]);

  const filteredLibrary = useMemo(() => {
    let filtered = library;

    if (selectedCollection) {
      if (selectedCollection.isSmartCollection) {
        if (selectedCollection.id === "favorites") {
          filtered = filtered.filter((game) => game.favorite);
        } else if (selectedCollection.id === "installed") {
          filtered = filtered.filter((game) => game.executablePath);
        }
      } else {
        filtered = filtered.filter((game) =>
          selectedCollection.gameIds.includes(game.id)
        );
      }
    }

    if (searchQuery) {
      filtered = filtered.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [library, searchQuery, selectedCollection]);

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

  const handleCollectionSelect = useCallback((collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
  }, []);

  const handleCreateCollection = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleManageCollections = useCallback(() => {
    setShowManageModal(true);
  }, []);

  const handleCollectionCreated = useCallback(() => {
    loadCollections();
  }, [loadCollections]);

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
            <div className="library__collection-selector">
              <select
                value={selectedCollectionId || "all"}
                onChange={(e) =>
                  handleCollectionSelect(
                    e.target.value === "all" ? null : e.target.value
                  )
                }
                className="library__collection-select"
              >
                <option value="all">{t("all_games")}</option>
                <option value="favorites">{t("favorites")}</option>
                <option value="installed">{t("installed")}</option>
                {collections
                  .filter((c) => !c.isSmartCollection)
                  .map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              className="library__utility-button"
              title={t("create_collection")}
              aria-label={t("create_collection")}
              onClick={handleCreateCollection}
            >
              <PlusIcon size={16} />
              <span>{t("create_collection")}</span>
            </button>

            <button
              type="button"
              className="library__utility-button"
              title={t("manage_collections")}
              aria-label={t("manage_collections")}
              onClick={handleManageCollections}
            >
              <StackIcon size={16} />
              <span>{t("manage_collections")}</span>
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
