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

function extractFirstImageSrc(html: string): string | null {
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    const img = div.querySelector("img");
    if (img && img.getAttribute("src")) {
      const src = img.getAttribute("src") as string;
      try {
        const u = new URL(src);
        if (u.protocol === "http:" || u.protocol === "https:") return src;
      } catch {
        // ignore invalid URL
      }
    }
    return null;
  } catch {
    return null;
  }
}

function preprocessSteamNewsHtml(html: string): string {
  let processed = html;

  // Replace Steam macro placeholders with absolute URLs
  processed = processed.replace(
    /\{STEAM_CLAN_IMAGE\}/g,
    "https://clan.cloudflare.steamstatic.com/images"
  );
  processed = processed.replace(
    /\{STEAM_APP_IMAGE\}/g,
    "https://cdn.cloudflare.steamstatic.com/steam/apps"
  );

  // Basic BBCode to HTML conversions (common in some Steam posts)
  processed = processed.replace(new RegExp("\\[img\\](.*?)\\[/img\\]", "gi"), '<img src="$1" />');
  processed = processed.replace(
    new RegExp("\\[url=(.*?)\\](.*?)\\[/url\\]", "gi"),
    '<a href="$1">$2</a>'
  );
  processed = processed.replace(new RegExp("\\[b\\](.*?)\\[/b\\]", "gi"), "<strong>$1</strong>");
  processed = processed.replace(new RegExp("\\[i\\](.*?)\\[/i\\]", "gi"), "<em>$1</em>");

  return processed;
}

function sanitizeNewsHtml(html: string): string {
  const allowedTags = new Set([
    "a",
    "b",
    "strong",
    "i",
    "em",
    "p",
    "ul",
    "ol",
    "li",
    "br",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "span",
  ]);

  const container = document.createElement("div");
  container.innerHTML = html;

  const isHttpUrl = (value: string): boolean => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const walk = (node: Element) => {
    // Remove disallowed elements like script/styles
    if (
      ["script", "style", "iframe", "object", "embed", "link", "meta"].includes(
        node.tagName.toLowerCase()
      )
    ) {
      node.remove();
      return;
    }

    // Sanitize attributes
    for (const el of Array.from(node.querySelectorAll("*"))) {
      const tag = el.tagName.toLowerCase();
      if (!allowedTags.has(tag)) {
        // unwrap element but keep its content
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

      // Restore safe attributes
      if (tag === "a") {
        const a = el as HTMLAnchorElement;
        const href = (
          a.getAttribute("href") ||
          (a as any).href ||
          ""
        ).toString();
        if (isHttpUrl(href)) {
          a.setAttribute("href", href);
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        }
      }

      if (tag === "img") {
        const img = el as HTMLImageElement;
        const src = (
          img.getAttribute("src") ||
          (img as any).src ||
          ""
        ).toString();
        if (isHttpUrl(src)) {
          img.setAttribute("src", src);
          img.setAttribute("loading", "lazy");
          img.removeAttribute("style");
        } else {
          img.remove();
        }
      }
    }
  };

  walk(container);

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
    if (!entry || !newsItem) return null;
    const fromContent = extractFirstImageSrc(
      preprocessSteamNewsHtml(newsItem.contents)
    );
    return fromContent || entry.libraryImageUrl || entry.coverImageUrl || null;
  }, [entry, newsItem]);

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
