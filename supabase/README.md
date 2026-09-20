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

## الخطوة 2 — تطبيق الجداول (الآن)

1. من لوحة Supabase: القائمة ☰ → **SQL Editor**
2. **New query**
3. الصق محتوى الملف:
   [`migrations/20260320120000_init_game_schema.sql`](./migrations/20260320120000_init_game_schema.sql)
4. اضغط **Run**
5. تأكد من ظهور الجداول: ☰ → **Table Editor**  
   لازم تشوف: `profiles`, `words`, `daily_puzzles`, `challenges`, `game_results`, `leaderboard_scores`

## الخطوات

| # | ماذا | حالة |
|---|------|------|
| 1 | عميل Supabase + `.env` | ✅ كود / بانتظار anon في `.env` |
| 2 | جداول Postgres + RLS | ✅ ملف SQL جاهز — طبّقه من SQL Editor |
| 3 | Auth (حسابات) | قادم |
| 4 | Edge Functions (تحقق / anti-cheat) | قادم |
| 5 | ربط اللعبة + لوحة الصدارة | قادم |
