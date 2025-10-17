import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { LibraryCollection } from "@types";

export interface CollectionsState {
  value: LibraryCollection[];
}

const initialState: CollectionsState = {
  value: [],
};

export const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    setCollections: (
      state,
      action: PayloadAction<CollectionsState["value"]>
    ) => {
      state.value = action.payload;
    },
    addCollection: (state, action: PayloadAction<LibraryCollection>) => {
      state.value.push(action.payload);
    },
    updateCollection: (state, action: PayloadAction<LibraryCollection>) => {
      const index = state.value.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.value[index] = action.payload;
      }
    },
    removeCollection: (state, action: PayloadAction<string>) => {
      state.value = state.value.filter((c) => c.id !== action.payload);
    },
  },
});

export const {
  setCollections,
  addCollection,
  updateCollection,
  removeCollection,
} = collectionsSlice.actions;
