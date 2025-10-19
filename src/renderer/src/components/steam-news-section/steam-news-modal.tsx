import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SteamNewsEntry, SteamNewsItem } from "@types";
import { Modal } from "@renderer/components";

import "./steam-news-modal.scss";

export interface SteamNewsModalProps {
  visible: boolean;
  entry: SteamNewsEntry | null;
  newsItem: SteamNewsItem | null;
  onClose: () => void;
}



function preprocessSteamNewsHtml(html: string): string {
  let processed = html ?? "";

  // Replace Steam macro placeholders with absolute URLs
  processed = processed.replace(
    /\{STEAM_CLAN_IMAGE\}/g,
    "https://clan.cloudflare.steamstatic.com/images"
  );
  processed = processed.replace(
    /\{STEAM_APP_IMAGE\}/g,
    "https://cdn.cloudflare.steamstatic.com/steam/apps"
  );

  // Protocol-relative URLs -> https
  processed = processed.replace(/src=\"\/\//g, 'src="https://');
  processed = processed.replace(/href=\"\/\//g, 'href="https://');

  // Basic BBCode to HTML conversions (common in some Steam posts)
  processed = processed.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" />');
  processed = processed.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1">$2<\/a>');
  processed = processed.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1<\/strong>');
  processed = processed.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1<\/em>');
  processed = processed.replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1<\/u>');
  processed = processed.replace(/\[s\](.*?)\[\/s\]/gi, '<s>$1<\/s>');
  processed = processed.replace(/\[list\](.*?)\[\/list\]/gis, '<ul>$1<\/ul>');
  processed = processed.replace(/\[\*\](.*?)(?=(\[\*\]|$))/gis, '<li>$1<\/li>');

  // Convert plain new lines to <br> when inside text-only posts
  if (!/<(?:p|br|div|img|ul|ol|h\d|blockquote|table|figure)/i.test(processed)) {
    processed = processed.replace(/\n/g, '<br />');
  }

  return processed;
}

function sanitizeNewsHtml(html: string): string {
  const allowedTags = new Set([
    "a",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "p",
    "div",
    "ul",
    "ol",
    "li",
    "br",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "code",
    "pre",
    "span",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    "figure",
    "figcaption",
    "video",
    "source",
    "hr",
    "small",
    "sup",
    "sub",
  ]);

  const container = document.createElement("div");
  container.innerHTML = html ?? "";

  const absolutizeUrl = (value: string): string => {
    if (value.startsWith("//")) return `https:${value}`;
    return value;
  };

  const isHttpUrl = (value: string): boolean => {
    try {
      const u = new URL(absolutizeUrl(value));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Remove disallowed wrapper elements entirely
  for (const bad of Array.from(
    container.querySelectorAll("script,style,iframe,object,embed,link,meta")
  )) {
    bad.remove();
  }

  // Sanitize descendants
  for (const el of Array.from(container.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();

    if (!allowedTags.has(tag)) {
      const parent = el.parentNode;
      if (!parent) {
        el.remove();
      } else {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
      }
      continue;
    }

    // Remove all attributes first
    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }

    if (tag === "a") {
      const a = el as HTMLAnchorElement;
      const href = absolutizeUrl(
        (a.getAttribute("href") || (a as any).href || "").toString()
      );
      if (isHttpUrl(href)) {
        a.setAttribute("href", href);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (tag === "img") {
      const img = el as HTMLImageElement;
      const src = absolutizeUrl(
        (img.getAttribute("src") || (img as any).src || "").toString()
      );
      if (isHttpUrl(src)) {
        img.setAttribute("src", src);
        img.setAttribute("loading", "lazy");
      } else {
        img.remove();
      }
    }

    if (tag === "video") {
      const video = el as HTMLVideoElement;
      const src = video.getAttribute("src");
      if (src && isHttpUrl(src)) {
        video.setAttribute("src", absolutizeUrl(src));
        video.setAttribute("controls", "true");
      }
      // Sanitize <source> children
      for (const source of Array.from(video.querySelectorAll("source"))) {
        const s = source.getAttribute("src");
        if (s && isHttpUrl(s)) source.setAttribute("src", absolutizeUrl(s));
        else source.remove();
      }
    }

    if (tag === "table") {
      (el as HTMLTableElement).setAttribute("border", "0");
      (el as HTMLTableElement).removeAttribute("style");
    }
  }

  return container.innerHTML;
}

export function SteamNewsModal({
  visible,
  entry,
  newsItem,
  onClose,
}: SteamNewsModalProps) {
  const { t } = useTranslation("library");

  const headerImage = useMemo(() => {
    if (!entry) return null;
    // Use the game's banner (library image) as the hero background
    return entry.libraryImageUrl || entry.coverImageUrl || null;
  }, [entry]);

  const sanitizedHtml = useMemo(() => {
    if (!newsItem) return "";
    // Preprocess to expand Steam placeholders and simple BBCode, then sanitize
    const preprocessed = preprocessSteamNewsHtml(newsItem.contents);
    return sanitizeNewsHtml(preprocessed);
  }, [newsItem]);

  const publishedAt = useMemo(() => {
    if (!newsItem) return "";
    return new Date(newsItem.date * 1000).toLocaleString();
  }, [newsItem]);

  const handleOpenExternal = () => {
    if (newsItem?.url) window.electron.openExternal(newsItem.url);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={entry?.gameTitle || ""}
      large
    >
      <div className="steam-news-modal">
        {headerImage && (
          <div
            className="steam-news-modal__hero"
            style={{ backgroundImage: `url(${headerImage})` }}
          />
        )}
        <div className="steam-news-modal__header">
          <h2 className="steam-news-modal__title">{newsItem?.title}</h2>
          <div className="steam-news-modal__meta">
            <span>{publishedAt}</span>
            <button
              className="steam-news-modal__open"
              onClick={handleOpenExternal}
            >
              {t("news_read_more")}
            </button>
          </div>
        </div>
        <div
          className="steam-news-modal__content"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </Modal>
  );
}
