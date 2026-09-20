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

## الخطوة 3 — Auth (الحسابات)

في التطبيق: زر الحساب في الرئيسية + من الإعدادات.
Email / Password عبر Supabase Auth.

**وين Authentication في اللوحة؟**
افتح مباشرة:
https://supabase.com/dashboard/project/eqxaivexuowngyigmqwl/auth/users

أو من القائمة ☰ ابحث عن **Authentication** / **Users** (مو داخل Settings).

ملاحظة: عطّلنا الحاجة لتأكيد البريد عبر trigger في قاعدة البيانات، فما تحتاج تغيّر إعداد Confirm email.

## الخطوات

| # | ماذا | حالة |
|---|------|------|
| 1 | عميل Supabase + `.env` | ✅ |
| 2 | جداول Postgres + RLS | ✅ |
| 3 | Auth (حسابات) | ✅ كود — عطّل Confirm email إن حاب |
| 4 | Edge Functions (تحقق / anti-cheat) | قادم |
| 5 | ربط اللعبة + لوحة الصدارة | قادم |
