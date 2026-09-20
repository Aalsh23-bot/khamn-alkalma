# Supabase — خمن الكلمة

المشروع: **khamn-alkalma**  
URL: `https://eqxaivexuowngyigmqwl.supabase.co`

```
React + Vite + Capacitor  →  Supabase
                              ├── PostgreSQL   (كلمات، نتائج، Daily، Leaderboard)
                              ├── Edge Functions (تحقق، anti-cheat، منطق يومي)
                              └── Auth         (حسابات اللاعبين)
```

## الخطوة 1 — المفاتيح ✅ (جزئياً)

1. Project URL: جاهز أعلاه.
2. من **Project Settings → API Keys** انسخ **anon (public)** بزر Copy.
3. محلياً:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://eqxaivexuowngyigmqwl.supabase.co
VITE_SUPABASE_ANON_KEY=الصق_المفتاح_هنا
```

لا ترسل **service_role** في الشات.

## الخطوة 2 — الجداول ✅

طُبّقت الجداول على المشروع وتحققنا عبر الـ API.
إصلاح `daily_puzzles_public` طُبّق أيضاً.

## الخطوة 3 — Auth (الحسابات) ✅

زر الحساب في الرئيسية + Email/Password.
تأكيد البريد تلقائي عبر trigger (ما تحتاج تدور Authentication في الموبايل).

مستخدمون (اختياري):
https://supabase.com/dashboard/project/eqxaivexuowngyigmqwl/auth/users

## الخطوة 4 — منطق السيرفر / Anti-cheat ✅

طُبّق مباشرة على Postgres (RPC) بدون الحاجة لـ Access Token:

| RPC | الوظيفة |
|-----|---------|
| `get_daily_meta` | رقم لغز اليوم بدون كشف الإجابة |
| `submit_daily_result` | تحقق + Anti-cheat + نتائج + Leaderboard |
| `create_friend_challenge` | تحدّي صديق على السيرفر |
| `get_leaderboard` | لوحة الصدارة |
| `evaluate_guess` | تقييم تخمين (Wordle) |

- بُذرت **1000** كلمة إجابة مع التصنيفات
- Edge Function جاهزة للنشر لاحقاً: `supabase/functions/game-api`
- اللعبة ترسل نتيجة كلمة اليوم للسيرفر تلقائياً إذا اللاعب مسجّل

## الخطوة 5 — لوحة الصدارة + الربط ✅

- لوحة الصدارة داخل الإحصائيات
- تحدّي الأصدقاء يستخدم السيرفر عند تسجيل الدخول (مع fallback محلي)
- نتائج كلمة اليوم تُزامَن للسيرفر تلقائياً

## الخطوات

| # | ماذا | حالة |
|---|------|------|
| 1 | عميل Supabase + `.env` | ✅ |
| 2 | جداول Postgres + RLS | ✅ |
| 3 | Auth (حسابات) | ✅ |
| 4 | تحقق / anti-cheat / daily | ✅ |
| 5 | UI لوحة الصدارة + ربط اللعبة | ✅ |
