# Supabase — خمن الكلمة

الهيكل المستهدف:

```
React + Vite + Capacitor  →  Supabase
                              ├── PostgreSQL   (كلمات، نتائج، Daily، Leaderboard)
                              ├── Edge Functions (تحقق، anti-cheat، منطق يومي)
                              └── Auth         (حسابات اللاعبين)
```

## الخطوة 1 — إنشاء المشروع (أنت)

1. افتح [https://supabase.com/dashboard](https://supabase.com/dashboard) وسجّل دخولك.
2. **New project** → اختر منظمة → اسم مثل `khamn-alkalma` → كلمة مرور قوية لقاعدة البيانات → Region قريبة (مثلاً `eu-central-1`).
3. بعد ما يجهز المشروع:
   - **Project Settings → API**
   - انسخ **Project URL** → `VITE_SUPABASE_URL`
   - انسخ **anon public** → `VITE_SUPABASE_ANON_KEY`
4. في جذر المشروع محلياً:

```bash
cp .env.example .env
# عدّل .env بالقيم المنسوخة
```

5. أرسل لي تأكيد إنك خلصت (أو الصق الـ Project URL فقط بدون المفاتيح السرية) عشان نكمل **الخطوة 2: جداول Postgres**.

> لا ترسل **service_role** في الشات. نستخدمه لاحقاً فقط في Edge Functions.

## الخطوات التالية (الكود)

| # | ماذا | حالة |
|---|------|------|
| 1 | عميل Supabase + `.env` | هذا المجلد / `src/lib/supabase` |
| 2 | جداول: profiles, words, daily_puzzles, game_results, leaderboard | قادم |
| 3 | Auth (حسابات) | قادم |
| 4 | Edge Functions (تحقق / anti-cheat) | قادم |
| 5 | ربط اللعبة + لوحة الصدارة | قادم |
