import type { SteamNewsEntry } from "@types";
import { registerEvent } from "../register-event";
import { getSteamNewsForLibrary } from "@main/services";

const getSteamNews = async (
  _event: Electron.IpcMainInvokeEvent,
  language: string
): Promise<SteamNewsEntry[]> => {
  return getSteamNewsForLibrary(language);
};

registerEvent("getSteamNews", getSteamNews);
