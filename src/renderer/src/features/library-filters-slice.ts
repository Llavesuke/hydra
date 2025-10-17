import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { LibraryGame } from "@types";
import type { RootState } from "@renderer/store";

export type SortBy =
  | "title"
  | "addedDate"
  | "recentPlaytime"
  | "lastPlayed"
  | "default";

export type QuickFilter = "favorites" | "installed" | "backlog";

export interface LibraryFiltersState {
  searchText: string;
  selectedCategories: string[];
  sortBy: SortBy;
  activeQuickFilters: QuickFilter[];
}

const initialState: LibraryFiltersState = {
  searchText: "",
  selectedCategories: [],
  sortBy: "default",
  activeQuickFilters: [],
};

export const libraryFiltersSlice = createSlice({
  name: "libraryFilters",
  initialState,
  reducers: {
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },
    toggleCategory: (state, action: PayloadAction<string>) => {
      const category = action.payload;
      const index = state.selectedCategories.indexOf(category);
      if (index > -1) {
        state.selectedCategories.splice(index, 1);
      } else {
        state.selectedCategories.push(category);
      }
    },
    clearCategories: (state) => {
      state.selectedCategories = [];
    },
    setSortBy: (state, action: PayloadAction<SortBy>) => {
      state.sortBy = action.payload;
    },
    toggleQuickFilter: (state, action: PayloadAction<QuickFilter>) => {
      const filter = action.payload;
      const index = state.activeQuickFilters.indexOf(filter);
      if (index > -1) {
        state.activeQuickFilters.splice(index, 1);
      } else {
        state.activeQuickFilters.push(filter);
      }
    },
    clearLibraryFilters: (state) => {
      state.searchText = "";
      state.selectedCategories = [];
      state.activeQuickFilters = [];
    },
  },
});

export const {
  setSearchText,
  toggleCategory,
  clearCategories,
  setSortBy,
  toggleQuickFilter,
  clearLibraryFilters,
} = libraryFiltersSlice.actions;

// Selectors
const selectLibraryGames = (state: RootState) => state.library.value;
const selectSearchText = (state: RootState) =>
  state.libraryFilters.searchText.toLowerCase();
const selectSelectedCategories = (state: RootState) =>
  state.libraryFilters.selectedCategories;
const selectSortBy = (state: RootState) => state.libraryFilters.sortBy;
const selectActiveQuickFilters = (state: RootState) =>
  state.libraryFilters.activeQuickFilters;

// Memoized selector for available categories
export const selectAvailableCategories = createSelector(
  [selectLibraryGames],
  (games) => {
    const categoriesSet = new Set<string>();
    games.forEach((game) => {
      if (game.categories) {
        game.categories.forEach((category) => categoriesSet.add(category));
      }
    });
    return Array.from(categoriesSet).sort();
  }
);

// Helper to check if game matches quick filters
const matchesQuickFilters = (
  game: LibraryGame,
  quickFilters: QuickFilter[]
): boolean => {
  if (quickFilters.length === 0) return true;

  return quickFilters.every((filter) => {
    switch (filter) {
      case "favorites":
        return game.favorite === true;
      case "installed":
        return game.executablePath != null && game.executablePath !== "";
      case "backlog":
        // Games not played yet or played very little (less than 5 minutes)
        return (
          game.lastTimePlayed === null ||
          game.playTimeInMilliseconds < 5 * 60 * 1000
        );
      default:
        return true;
    }
  });
};

// Helper for smart suggestions priority
const calculateSmartPriority = (game: LibraryGame): number => {
  let priority = 0;

  // Recent downloads get high priority
  if (game.download?.timestamp) {
    const daysSinceDownload =
      (Date.now() - game.download.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceDownload < 7) priority += 100;
    else if (daysSinceDownload < 30) priority += 50;
  }

  // Recently played gets priority
  if (game.lastTimePlayed) {
    const lastPlayed = new Date(game.lastTimePlayed).getTime();
    const daysSincePlayed = (Date.now() - lastPlayed) / (1000 * 60 * 60 * 24);
    if (daysSincePlayed < 7) priority += 80;
    else if (daysSincePlayed < 30) priority += 40;
  }

  // Installed but not played much gets priority (backlog)
  if (
    game.executablePath &&
    game.playTimeInMilliseconds < 30 * 60 * 1000 &&
    game.playTimeInMilliseconds > 0
  ) {
    priority += 60;
  }

  // Downloaded but never played gets high priority
  if (
    game.executablePath &&
    (!game.lastTimePlayed || game.playTimeInMilliseconds === 0)
  ) {
    priority += 70;
  }

  return priority;
};

// Memoized selector for filtered and sorted games
export const selectFilteredAndSortedGames = createSelector(
  [
    selectLibraryGames,
    selectSearchText,
    selectSelectedCategories,
    selectSortBy,
    selectActiveQuickFilters,
  ],
  (games, searchText, categories, sortBy, quickFilters) => {
    // Filter by search text
    let filtered = games.filter((game) => {
      if (searchText && !game.title.toLowerCase().includes(searchText)) {
        return false;
      }
      return true;
    });

    // Filter by categories
    if (categories.length > 0) {
      filtered = filtered.filter((game) => {
        if (!game.categories || game.categories.length === 0) return false;
        return categories.some((cat) => game.categories?.includes(cat));
      });
    }

    // Filter by quick filters
    filtered = filtered.filter((game) =>
      matchesQuickFilters(game, quickFilters)
    );

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);

        case "addedDate": {
          // Use download timestamp or fallback to 0
          const aTime = a.download?.timestamp || 0;
          const bTime = b.download?.timestamp || 0;
          return bTime - aTime; // Most recent first
        }

        case "recentPlaytime": {
          const aPlaytime = a.playTimeInMilliseconds || 0;
          const bPlaytime = b.playTimeInMilliseconds || 0;
          return bPlaytime - aPlaytime; // Most played first
        }

        case "lastPlayed": {
          const aTime = a.lastTimePlayed
            ? new Date(a.lastTimePlayed).getTime()
            : 0;
          const bTime = b.lastTimePlayed
            ? new Date(b.lastTimePlayed).getTime()
            : 0;
          return bTime - aTime; // Most recent first
        }

        case "default":
        default: {
          // Smart suggestions: priority based on recent activity
          const aPriority = calculateSmartPriority(a);
          const bPriority = calculateSmartPriority(b);
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          // Fallback to title
          return a.title.localeCompare(b.title);
        }
      }
    });

    return sorted;
  }
);

// Selector for smart suggestions (top games by priority)
export const selectSmartSuggestions = createSelector(
  [selectLibraryGames],
  (games) => {
    const withPriority = games.map((game) => ({
      game,
      priority: calculateSmartPriority(game),
    }));

    return withPriority
      .filter((item) => item.priority > 50) // Only show games with significant priority
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5) // Top 5 suggestions
      .map((item) => item.game);
  }
);
