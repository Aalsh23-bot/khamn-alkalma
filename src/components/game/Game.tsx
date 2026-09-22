import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./Board";
import { Header } from "./Header";
import { HomeScreen } from "./HomeScreen";
import { Keyboard } from "./Keyboard";
import { StagesSelect } from "./StagesSelect";
import {
  BadgeModal,
  ChallengeInviteModal,
  HelpModal,
  InstallModal,
  PrivacyModal,
  ResultModal,
  SettingsModal,
  StatsModal,
} from "./Modals";
import { AuthModal } from "./AuthModal";
import { unlockAudio } from "@/lib/game/audio";
import { achievementById } from "@/lib/game/achievements";
import { buildKeyMap } from "@/lib/game/evaluate";
import { isArabicLetter } from "@/lib/game/normalize";
import { useGame } from "@/lib/game/store";
import { STAGE_COUNT } from "@/lib/game/words";
import { isNativeApp } from "@/lib/native";
import { showRewardedAd } from "@/lib/ads/ads";
import { useSupabaseAuth } from "@/lib/supabase/use-auth";
import { RewardedAdOverlay } from "./RewardedAdOverlay";

export function Game() {
  const hydrated = useGame((s) => s.hydrated);
  const hydrate = useGame((s) => s.hydrate);
  const screen = useGame((s) => s.screen);
  const mode = useGame((s) => s.mode);
  const stageLevel = useGame((s) => s.stageLevel);
  const goHome = useGame((s) => s.goHome);
  const openStages = useGame((s) => s.openStages);
  const startDaily = useGame((s) => s.startDaily);
  const startStage = useGame((s) => s.startStage);
  const startChallenge = useGame((s) => s.startChallenge);
  const newChallenge = useGame((s) => s.newChallenge);
  const nextStage = useGame((s) => s.nextStage);
  const retryStage = useGame((s) => s.retryStage);
  const reviveAfterLoss = useGame((s) => s.reviveAfterLoss);
  const retryStageNewWord = useGame((s) => s.retryStageNewWord);
  const guesses = useGame((s) => s.guesses);
  const evaluations = useGame((s) => s.evaluations);
  const current = useGame((s) => s.current);
  const answer = useGame((s) => s.answer);
  const status = useGame((s) => s.status);
  const revealing = useGame((s) => s.revealing);
  const shake = useGame((s) => s.shake);
  const hintedCols = useGame((s) => s.hintedCols);
  const hintUsed = useGame((s) => s.hintUsed);
  const toast = useGame((s) => s.toast);
  const modal = useGame((s) => s.modal);
  const settings = useGame((s) => s.settings);
  const stats = useGame((s) => s.stats);
  const stages = useGame((s) => s.stages);
  const achievements = useGame((s) => s.achievements);
  const challengeCode = useGame((s) => s.challengeCode);
  const puzzleNum = useGame((s) => s.puzzleNum);
  const dateKey = useGame((s) => s.dateKey);
  const typeLetter = useGame((s) => s.typeLetter);
  const backspace = useGame((s) => s.backspace);
  const submit = useGame((s) => s.submit);
  const finishReveal = useGame((s) => s.finishReveal);
  const useHint = useGame((s) => s.useHint);
  const setToast = useGame((s) => s.setToast);
  const setModal = useGame((s) => s.setModal);
  const dismissBadge = useGame((s) => s.dismissBadge);
  const setHardMode = useGame((s) => s.setHardMode);
  const setSound = useGame((s) => s.setSound);

  const [adBusy, setAdBusy] = useState(false);
  const auth = useSupabaseAuth();
  const authLabel = auth.user?.displayName || auth.user?.email || null;

  const pendingBadge = achievements.pending[0]
    ? achievementById(achievements.pending[0])
    : null;

  const keyMap = useMemo(
    () => buildKeyMap(guesses, evaluations, hintedCols, answer),
    [guesses, evaluations, hintedCols, answer],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => useGame.setState({ shake: false }), 480);
    return () => window.clearTimeout(id);
  }, [shake]);

  const finishRef = useRef(finishReveal);
  finishRef.current = finishReveal;

  useEffect(() => {
    if (!revealing) return;
    const total = 5 * 300 + 520;
    const id = window.setTimeout(() => finishRef.current(), total);
    const failsafe = window.setTimeout(() => finishRef.current(), total + 800);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(failsafe);
    };
  }, [revealing, guesses.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      unlockAudio();
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key.length === 1 && isArabicLetter(e.key)) {
        e.preventDefault();
        typeLetter(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, backspace, typeLetter]);

  const inputLocked = !hydrated || status !== "playing" || revealing;

  const modals = (
    <>
      <HelpModal open={modal === "help"} onClose={() => setModal(null)} />
      <StatsModal
        open={modal === "stats"}
        onClose={() => setModal(null)}
        stats={stats}
        achievements={achievements}
        currentUserId={auth.user?.id}
        onAuth={() => setModal("auth")}
      />
      <SettingsModal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        settings={settings}
        onHardMode={setHardMode}
        onSound={setSound}
        onInstall={() => setModal("install")}
        onPrivacy={() => setModal("privacy")}
        onAuth={() => setModal("auth")}
        authLabel={authLabel}
        isNative={isNativeApp()}
      />
      <AuthModal
        open={modal === "auth"}
        onClose={() => setModal(null)}
        configured={auth.configured}
        ready={auth.ready}
        busy={auth.busy}
        error={auth.error}
        user={auth.user}
        clearError={auth.clearError}
        signIn={auth.signIn}
        signUp={auth.signUp}
        signInWithApple={auth.signInWithApple}
        signOut={auth.signOut}
      />
      <ResultModal
        open={modal === "result"}
        onClose={() => setModal(null)}
        mode={mode}
        status={status}
        answer={answer}
        guesses={guesses}
        evaluations={evaluations}
        puzzleNum={puzzleNum}
        dateKey={dateKey}
        stageLevel={stageLevel}
        hardMode={settings.hardMode}
        challengeCode={challengeCode}
        adBusy={adBusy}
        onWatchAdRevive={() => {
          void (async () => {
            if (adBusy) return;
            setAdBusy(true);
            // Close ResultModal first — Radix modal dialogs trap pointer events
            // and block the rewarded overlay even when it paints above them.
            setModal(null);
            try {
              const result = await showRewardedAd("revive");
              if (result === "rewarded") {
                reviveAfterLoss();
              } else {
                if (result === "dismissed") {
                  setToast("شاهِد الإعلان للنهاية لاستعادة المحاولة");
                } else {
                  setToast("الإعلان غير متاح الآن");
                }
                if (useGame.getState().status === "lost") setModal("result");
              }
            } finally {
              setAdBusy(false);
            }
          })();
        }}
        onRetryNewWord={() => retryStageNewWord()}
        onNewChallenge={() => newChallenge()}
        onAgain={() => {
          if (mode === "stages") {
            if (status === "won") {
              if (stageLevel >= STAGE_COUNT) openStages();
              else nextStage();
            } else retryStageNewWord();
          } else if (mode === "challenge") {
            newChallenge();
          } else {
            goHome();
          }
        }}
        onMap={openStages}
        onHome={goHome}
        onStats={() => setModal("stats")}
      />
      <BadgeModal
        open={modal === "badge" && Boolean(pendingBadge)}
        title={pendingBadge?.title ?? ""}
        hint={pendingBadge?.hint ?? ""}
        onClose={dismissBadge}
      />
      <ChallengeInviteModal
        open={modal === "challengeInvite" && Boolean(challengeCode)}
        code={challengeCode ?? ""}
        onClose={() => setModal(null)}
        onPlay={() => setModal(null)}
      />
      <InstallModal open={modal === "install"} onClose={() => setModal(null)} />
      <PrivacyModal open={modal === "privacy"} onClose={() => setModal(null)} />
    </>
  );

  if (!hydrated) {
    return <div className="min-h-dvh bg-bg" />;
  }

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          stats={stats}
          stages={stages}
          onDaily={startDaily}
          onStages={openStages}
          onChallenge={() => startChallenge()}
          onHelp={() => setModal("help")}
          onStats={() => setModal("stats")}
          onSettings={() => setModal("settings")}
          onAuth={() => setModal("auth")}
          authLabel={authLabel}
        />
        {modals}
        <RewardedAdOverlay />
      </>
    );
  }

  if (screen === "stages") {
    return (
      <>
        <StagesSelect stages={stages} onBack={goHome} onPick={startStage} />
        {modals}
        <RewardedAdOverlay />
      </>
    );
  }

  return (
    <div
      className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      onPointerDown={unlockAudio}
    >
      <Header
        mode={mode}
        stageLevel={stageLevel}
        onHome={goHome}
        onHelp={() => setModal("help")}
        onStats={() => setModal("stats")}
        onSettings={() => setModal("settings")}
        onShareChallenge={
          mode === "challenge" && challengeCode
            ? () => setModal("challengeInvite")
            : undefined
        }
        onHint={() => {
          void (async () => {
            if (adBusy || hintUsed || inputLocked) return;
            setAdBusy(true);
            try {
              const result = await showRewardedAd("hint");
              if (result === "rewarded") useHint();
              else if (result === "dismissed") setToast("شاهِد الإعلان للنهاية لكشف حرف");
              else setToast("الإعلان غير متاح الآن");
            } finally {
              setAdBusy(false);
            }
          })();
        }}
        hintUsed={hintUsed}
        hintDisabled={inputLocked || hintUsed || adBusy}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {toast && (
          <div className="game-toast pointer-events-none absolute top-3 left-1/2 z-20 rounded-lg bg-fg px-3 py-2 text-sm font-medium text-bg-elevated">
            {toast}
          </div>
        )}

        <div
          className="flex flex-1 items-center justify-center px-3 py-3"
          style={{ ["--tile" as string]: "clamp(48px, 14vmin, 64px)" }}
        >
          <Board
            guesses={guesses}
            evaluations={evaluations}
            current={current}
            answer={answer}
            status={status}
            revealing={revealing}
            shake={shake}
            hintedCols={hintedCols}
          />
        </div>

        <div className="px-1 pb-3">
          <Keyboard
            keyMap={keyMap}
            onLetter={typeLetter}
            onEnter={submit}
            onDelete={backspace}
            disabled={inputLocked}
          />
        </div>
      </div>

      {modals}
      <RewardedAdOverlay />
    </div>
  );
}
