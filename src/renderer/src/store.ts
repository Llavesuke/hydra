import { configureStore } from "@reduxjs/toolkit";
import {
  downloadSlice,
  windowSlice,
  librarySlice,
  libraryFiltersSlice,
  userPreferencesSlice,
  toastSlice,
  userDetailsSlice,
  gameRunningSlice,
  subscriptionSlice,
  repacksSlice,
  downloadSourcesSlice,
  catalogueSearchSlice,
} from "@renderer/features";

export const store = configureStore({
  reducer: {
    window: windowSlice.reducer,
    library: librarySlice.reducer,
    libraryFilters: libraryFiltersSlice.reducer,
    userPreferences: userPreferencesSlice.reducer,
    download: downloadSlice.reducer,
    toast: toastSlice.reducer,
    userDetails: userDetailsSlice.reducer,
    gameRunning: gameRunningSlice.reducer,
    subscription: subscriptionSlice.reducer,
    repacks: repacksSlice.reducer,
    downloadSources: downloadSourcesSlice.reducer,
    catalogueSearch: catalogueSearchSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
