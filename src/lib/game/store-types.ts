import type { LetterStatus } from "./evaluate";
import type { AchievementsSave } from "./achievements";
import type {
  ChallengeStatsSave,
  Mode,
  Screen,
  SettingsSave,
  StagesSave,
  StatsSave,
} from "./storage";
import type { ChallengeLobby } from "@/lib/supabase/api";

export type { Mode, Screen };

export interface GameStore {
  hydrated: boolean;
  screen: Screen;
  mode: Mode;
  stageLevel: number;
  dateKey: string;
  puzzleNum: number;
  answer: string;
  guesses: string[];
  evaluations: LetterStatus[][];
  current: string;
  status: "playing" | "won" | "lost";
  hintUsed: boolean;
  hintCount: number;
  hintAwaitingGuess: boolean;
  hintedCols: number[];
  revealing: boolean;
  shake: boolean;
  toast: string | null;
  settings: SettingsSave;
  stats: StatsSave;
  stages: StagesSave;
  achievements: AchievementsSave;
  challengeStats: ChallengeStatsSave;
  challengeCode: string | null;
  challengeRole: "host" | "guest" | null;
  challengeExpiresAt: string | null;
  challengeLobby: ChallengeLobby | null;
  modal:
    | "help"
    | "stats"
    | "settings"
    | "result"
    | "install"
    | "privacy"
    | "badge"
    | "challengeInvite"
    | "challengeHub"
    | "challengeJoin"
    | "auth"
    | "wordsAdmin"
    | null;
  hydrate: () => void;
  goHome: () => void;
  openStages: () => void;
  startDaily: () => void;
  startStage: (level: number) => void;
  startChallenge: (code?: string) => void;
  openChallengeHub: () => void;
  joinChallengeWithCode: (code: string) => void;
  createOnlineChallenge: () => void;
  refreshChallengeLobby: () => void;
  nextStage: () => void;
  retryStage: () => void;
  reviveAfterLoss: () => void;
  retryStageNewWord: () => void;
  newChallenge: () => void;
  rematchChallenge: () => void;
  typeLetter: (ch: string) => void;
  backspace: () => void;
  submit: () => void;
  finishReveal: () => void;
  useHint: () => void;
  setToast: (msg: string | null) => void;
  setModal: (modal: GameStore["modal"]) => void;
  dismissBadge: () => void;
  setHardMode: (on: boolean) => void;
  setSound: (on: boolean) => void;
}
