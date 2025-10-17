import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Downloader, getDownloadersForUri } from "@shared";
import type { GameRepack, LibraryGame, UserAchievement } from "@types";
import {
  GameOptionsModal,
  RepacksModal,
} from "@renderer/pages/game-details/modals";
import {
  useAppSelector,
  useDownload,
  useLibrary,
  useRepacks,
  useUserDetails,
} from "@renderer/hooks";

export interface GameModalsContextValue {
  openGameOptions: (game: LibraryGame) => void;
  openDownloadOptions: (game: LibraryGame) => void;
  closeAll: () => void;
}

const GameModalsContext = createContext<GameModalsContextValue>({
  openGameOptions: () => void 0,
  openDownloadOptions: () => void 0,
  closeAll: () => void 0,
});

export interface GameModalsProviderProps {
  children: React.ReactNode;
}

export function GameModalsProvider({ children }: GameModalsProviderProps) {
  const [activeGame, setActiveGame] = useState<LibraryGame | null>(null);
  const [repacks, setRepacks] = useState<GameRepack[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[] | null>(
    null
  );
  const [isGameOptionsVisible, setIsGameOptionsVisible] = useState(false);
  const [isRepacksVisible, setIsRepacksVisible] = useState(false);

  const userPreferences = useAppSelector(
    (state) => state.userPreferences.value
  );

  const { getRepacksForObjectId } = useRepacks();
  const { startDownload } = useDownload();
  const { userDetails } = useUserDetails();
  const { library } = useLibrary();

  const fetchGameDetails = useCallback(
    async (game: LibraryGame) => {
      const [freshGame, freshAchievements] = await Promise.all([
        window.electron
          .getGameByObjectId(game.shop, game.objectId)
          .catch(() => null),
        userDetails
          ? window.electron
              .getUnlockedAchievements(game.objectId, game.shop)
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const gameToUse = freshGame ?? game;

      setActiveGame(gameToUse);
      setRepacks(getRepacksForObjectId(game.objectId));
      setAchievements(freshAchievements);

      return gameToUse;
    },
    [getRepacksForObjectId, userDetails]
  );

  const updateActiveGame = useCallback(async () => {
    if (!activeGame) return;
    await fetchGameDetails(activeGame);
  }, [activeGame, fetchGameDetails]);

  const getDownloadsPath = useCallback(async () => {
    if (userPreferences?.downloadsPath) return userPreferences.downloadsPath;
    return window.electron.getDefaultDownloadsPath();
  }, [userPreferences?.downloadsPath]);

  const selectGameExecutable = useCallback(async () => {
    const defaultPath = await getDownloadsPath();

    const { filePaths } = await window.electron.showOpenDialog({
      properties: ["openFile"],
      defaultPath: defaultPath ?? activeGame?.executablePath ?? "",
      filters: [
        {
          name: "Game executable",
          extensions: ["exe", "lnk"],
        },
      ],
    });

    if (filePaths && filePaths.length > 0) {
      return filePaths[0];
    }

    return null;
  }, [getDownloadsPath, activeGame?.executablePath]);

  const closeAll = useCallback(() => {
    setIsGameOptionsVisible(false);
    setIsRepacksVisible(false);
    setActiveGame(null);
    setRepacks([]);
    setAchievements(null);
  }, []);

  const openGameOptions = useCallback(
    async (game: LibraryGame) => {
      const gameToUse = await fetchGameDetails(game);
      setActiveGame(gameToUse);
      setIsRepacksVisible(false);
      setIsGameOptionsVisible(true);
    },
    [fetchGameDetails]
  );

  const openDownloadOptions = useCallback(
    async (game: LibraryGame) => {
      const gameToUse = await fetchGameDetails(game);
      setActiveGame(gameToUse);
      setIsGameOptionsVisible(false);
      setIsRepacksVisible(true);
    },
    [fetchGameDetails]
  );

  const selectRepackUri = useCallback(
    (repack: GameRepack, downloader: Downloader) => {
      return repack.uris.find((uri) =>
        getDownloadersForUri(uri).includes(downloader)
      )!;
    },
    []
  );

  const handleStartDownload = useCallback(
    async (
      repack: GameRepack,
      downloader: Downloader,
      downloadPath: string,
      automaticallyExtract: boolean
    ) => {
      if (!activeGame) {
        return { ok: false, error: "NO_GAME" };
      }

      const response = await startDownload({
        repackId: repack.id,
        objectId: activeGame.objectId,
        title: activeGame.title,
        downloader,
        shop: activeGame.shop,
        downloadPath,
        uri: selectRepackUri(repack, downloader),
        automaticallyExtract,
      });

      if (response.ok) {
        await updateActiveGame();
        setIsRepacksVisible(false);
        setIsGameOptionsVisible(false);
      }

      return response;
    },
    [activeGame, selectRepackUri, startDownload, updateActiveGame]
  );

  const handleOpenDownloadOptionsFromGameOptions = useCallback(() => {
    if (!activeGame) return;
    void openDownloadOptions(activeGame);
  }, [activeGame, openDownloadOptions]);

  useEffect(() => {
    const handleOpenRepacks = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        objectId?: string;
        shop?: LibraryGame["shop"];
        suppressGlobal?: boolean;
      };

      if (!detail?.objectId || detail.suppressGlobal) return;

      const game = library.find(
        (libraryGame) =>
          libraryGame.objectId === detail.objectId &&
          (!detail.shop || libraryGame.shop === detail.shop)
      );

      if (game) {
        void openDownloadOptions(game);
      }
    };

    const handleOpenOptions = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        objectId?: string;
        shop?: LibraryGame["shop"];
        suppressGlobal?: boolean;
      };

      if (!detail?.objectId || detail.suppressGlobal) return;

      const game = library.find(
        (libraryGame) =>
          libraryGame.objectId === detail.objectId &&
          (!detail.shop || libraryGame.shop === detail.shop)
      );

      if (game) {
        void openGameOptions(game);
      }
    };

    window.addEventListener(
      "hydra:openRepacks",
      handleOpenRepacks as EventListener
    );
    window.addEventListener(
      "hydra:openGameOptions",
      handleOpenOptions as EventListener
    );

    return () => {
      window.removeEventListener(
        "hydra:openRepacks",
        handleOpenRepacks as EventListener
      );
      window.removeEventListener(
        "hydra:openGameOptions",
        handleOpenOptions as EventListener
      );
    };
  }, [library, openDownloadOptions, openGameOptions]);

  useEffect(() => {
    const handleGameUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        objectId?: string;
        shop?: LibraryGame["shop"];
      };

      if (
        activeGame &&
        detail?.objectId === activeGame.objectId &&
        (!detail.shop || detail.shop === activeGame.shop)
      ) {
        void updateActiveGame();
      }
    };

    const handleGameRemoved = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        objectId?: string;
        shop?: LibraryGame["shop"];
      };

      if (
        activeGame &&
        detail?.objectId === activeGame.objectId &&
        (!detail.shop || detail.shop === activeGame.shop)
      ) {
        closeAll();
      }
    };

    window.addEventListener(
      "hydra:game-favorite-toggled",
      handleGameUpdated as EventListener
    );
    window.addEventListener(
      "hydra:game-files-removed",
      handleGameUpdated as EventListener
    );
    window.addEventListener(
      "hydra:game-removed-from-library",
      handleGameRemoved as EventListener
    );

    return () => {
      window.removeEventListener(
        "hydra:game-favorite-toggled",
        handleGameUpdated as EventListener
      );
      window.removeEventListener(
        "hydra:game-files-removed",
        handleGameUpdated as EventListener
      );
      window.removeEventListener(
        "hydra:game-removed-from-library",
        handleGameRemoved as EventListener
      );
    };
  }, [activeGame, updateActiveGame, closeAll]);

  const value = useMemo(
    () => ({
      openGameOptions,
      openDownloadOptions,
      closeAll,
    }),
    [openGameOptions, openDownloadOptions, closeAll]
  );

  return (
    <GameModalsContext.Provider value={value}>
      {children}
      {activeGame && (
        <>
          <RepacksModal
            visible={isRepacksVisible}
            repacks={repacks}
            game={activeGame}
            startDownload={handleStartDownload}
            onClose={() => setIsRepacksVisible(false)}
          />

          <GameOptionsModal
            visible={isGameOptionsVisible}
            game={activeGame}
            repacks={repacks}
            achievements={achievements}
            onClose={() => setIsGameOptionsVisible(false)}
            updateGame={updateActiveGame}
            selectGameExecutable={selectGameExecutable}
            onOpenDownloadOptions={handleOpenDownloadOptionsFromGameOptions}
          />
        </>
      )}
    </GameModalsContext.Provider>
  );
}

export function useGameModals() {
  return useContext(GameModalsContext);
}
