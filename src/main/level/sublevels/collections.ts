import type { LibraryCollection } from "@types";

import { db } from "../level";
import { levelKeys } from "./keys";

export const collectionsSublevel = db.sublevel<string, LibraryCollection>(
  levelKeys.collections,
  {
    valueEncoding: "json",
  }
);
