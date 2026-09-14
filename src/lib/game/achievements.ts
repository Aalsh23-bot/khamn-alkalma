export type AchievementId =
  | "first_win"
  | "streak_3"
  | "streak_7"
  | "stage_50"
  | "stage_100"
  | "first_try";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  hint: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_win", title: "أول فوز", hint: "اربح أي لغز مرة واحدة" },
  { id: "streak_3", title: "سلسلة 3", hint: "ثلاث أيام متتالية في كلمة اليوم" },
  { id: "streak_7", title: "سلسلة 7", hint: "أسبوع كامل من كلمة اليوم" },
  { id: "stage_50", title: "مرحلة 50", hint: "افتح أو أنجز المرحلة 50" },
  { id: "stage_100", title: "مرحلة 100", hint: "افتح أو أنجز المرحلة 100" },
  { id: "first_try", title: "من أول محاولة", hint: "اربح لغزاً من التخمين الأول" },
];

export interface AchievementsSave {
  version: number;
  unlocked: Partial<Record<AchievementId, string>>;
  /** Newly unlocked ids waiting for celebration popup */
  pending: AchievementId[];
}

export const defaultAchievements = (): AchievementsSave => ({
  version: 1,
  unlocked: {},
  pending: [],
});

export function achievementById(id: AchievementId): AchievementDef {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? ACHIEVEMENTS[0]!;
}
