import { useState, useRef, useEffect } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, ChevronLeftIcon } from "@primer/octicons-react";
import type { SteamNewsEntry, SteamNewsItem } from "@types";
import { useSteamNews, useDate } from "@renderer/hooks";

import "./steam-news-section.scss";
import { SteamNewsModal } from "./steam-news-modal";

interface NewsCardProps {
  entry: SteamNewsEntry;
  newsItem: SteamNewsItem;
  onOpen: (entry: SteamNewsEntry, item: SteamNewsItem) => void;
}

function preprocessSteamNewsHtml(html: string): string {
  return (html ?? "")
    .replace(/\{STEAM_CLAN_IMAGE\}/g, "https://clan.cloudflare.steamstatic.com/images")
    .replace(/\{STEAM_APP_IMAGE\}/g, "https://cdn.cloudflare.steamstatic.com/steam/apps")
    .replace(/src=\"\/\//g, 'src="https://')
    .replace(/href=\"\/\//g, 'href="https://');
}

function extractFirstImageSrc(html: string): string | null {
  try {
    const div = document.createElement("div");
    div.innerHTML = preprocessSteamNewsHtml(html);
    const img = div.querySelector("img");
    if (!img) return null;
    const src = img.getAttribute("src") || (img as any).src || "";
    try {
      const u = new URL(src);
      if (u.protocol === "http:" || u.protocol === "https:") return src;
    } catch {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

const NewsCard = ({ entry, newsItem, onOpen }: NewsCardProps) => {
  const { t } = useTranslation("library");
  const { formatRelativeTime } = useDate();

  const handleClick = () => {
    onOpen(entry, newsItem);
  };

  const newsCover = extractFirstImageSrc(newsItem.contents) || entry.libraryImageUrl || entry.coverImageUrl || null;

  return (
    <div
      className="steam-news-card"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="steam-news-card__image-container">
        {newsCover ? (
          <img
            src={newsCover}
            alt={entry.gameTitle}
            className="steam-news-card__image"
          />
        ) : (
          <div className="steam-news-card__image-placeholder" />
        )}
        <div className="steam-news-card__game-badge">{entry.gameTitle}</div>
      </div>
      <div className="steam-news-card__content">
        <h3 className="steam-news-card__title">{newsItem.title}</h3>
        <p className="steam-news-card__excerpt">{newsItem.excerpt}</p>
        <div className="steam-news-card__footer">
          <span className="steam-news-card__date">
            {t("news_published", {
              time: formatRelativeTime(new Date(newsItem.date * 1000)),
            })}
          </span>
          <span className="steam-news-card__read-more">
            {t("news_read_more")} →
          </span>
        </div>
      </div>
    </div>
  );
};

export default function SteamNewsSection() {
  const { t } = useTranslation("library");
  const { news, isLoading, error, refetch } = useSteamNews();
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<SteamNewsEntry | null>(
    null
  );
  const [selectedItem, setSelectedItem] = useState<SteamNewsItem | null>(null);

  const displayedNews = isExpanded ? news : news.slice(0, 3);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
      return () => {
        scrollContainer.removeEventListener("scroll", checkScrollButtons);
        window.removeEventListener("resize", checkScrollButtons);
      };
    }
    return undefined;
  }, [news, isExpanded]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // If vertical scroll is intended, translate it into horizontal scroll for the carousel
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollBy({ left: e.deltaY, behavior: "smooth" });
    }
  };

  const openModal = (entry: SteamNewsEntry, item: SteamNewsItem) => {
    setSelectedEntry(entry);
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedEntry(null);
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <div className="steam-news-section">
        <div className="steam-news-section__header">
          <h2 className="steam-news-section__title">
            {t("news_section_title")}
          </h2>
        </div>
        <div className="steam-news-section__loading">{t("news_loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="steam-news-section">
        <div className="steam-news-section__header">
          <h2 className="steam-news-section__title">
            {t("news_section_title")}
          </h2>
        </div>
        <div className="steam-news-section__error">
          <p>{t("news_error")}</p>
          <button
            className="steam-news-section__retry-button"
            onClick={refetch}
          >
            {t("news_retry")}
          </button>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="steam-news-section">
        <div className="steam-news-section__header">
          <h2 className="steam-news-section__title">
            {t("news_section_title")}
          </h2>
        </div>
        <div className="steam-news-section__empty">
          <p className="steam-news-section__empty-title">{t("news_empty")}</p>
          <p className="steam-news-section__empty-description">
            {t("news_empty_description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="steam-news-section">
      <div className="steam-news-section__header">
        <h2 className="steam-news-section__title">{t("news_section_title")}</h2>
        {news.length > 3 && (
          <button
            className="steam-news-section__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? t("news_see_less") : t("news_see_more")}
          </button>
        )}
      </div>
      <div className="steam-news-section__carousel">
        {canScrollLeft && (
          <button
            className="steam-news-section__scroll-button steam-news-section__scroll-button--left"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon size={24} />
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="steam-news-section__cards-container"
          onWheel={handleWheel}
        >
          {displayedNews.map((entry) =>
            entry.newsItems.map((newsItem) => (
              <NewsCard
                key={`${entry.appId}-${newsItem.gid}`}
                entry={entry}
                newsItem={newsItem}
                onOpen={openModal}
              />
            ))
          )}
        </div>
        {canScrollRight && (
          <button
            className="steam-news-section__scroll-button steam-news-section__scroll-button--right"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRightIcon size={24} />
          </button>
        )}
      </div>

      <SteamNewsModal
        visible={Boolean(selectedEntry && selectedItem)}
        entry={selectedEntry}
        newsItem={selectedItem}
        onClose={closeModal}
      />
    </div>
  );
}
