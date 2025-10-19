export interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  contents: string; // full HTML content as provided by Steam
  excerpt: string; // plain text excerpt for previews
  date: number;
  feedlabel: string;
  feedname: string;
  appid: string;
  author?: string;
}

export interface SteamNewsEntry {
  appId: string;
  gameTitle: string;
  newsItems: SteamNewsItem[];
  coverImageUrl?: string | null;
  libraryImageUrl?: string | null;
  isFavorite: boolean;
  isInstalled: boolean;
  lastPlayed?: Date | null;
}

export interface SteamNewsResponse {
  appnews: {
    appid: number;
    newsitems: Omit<SteamNewsItem, "excerpt">[];
    count: number;
  };
}
