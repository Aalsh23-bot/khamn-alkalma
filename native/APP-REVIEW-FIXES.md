# إصلاح رفض App Review (١.٠)

أبل رفضت البناء **1.0.0 (3)** لسببين. هذا الفرع يعالجهما + إصلاح حفظ المراحل.

## 1) Guideline 5.1.2(i) — App Tracking Transparency

- عند التشغيل على iOS يُطلب إذن ATT قبل تهيئة AdMob.
- `NSUserTrackingUsageDescription` موجود في Info.plist.
- Privacy Manifest: `NSPrivacyTracking = true`.

## 2) Guideline 5.1.1(v) — حذف الحساب

- في التطبيق: **الحساب → حذف الحساب → تأكيد الحذف**
- يحتاج دالة Supabase (مرة واحدة):

افتح [SQL Editor](https://supabase.com/dashboard) ونفّذ محتوى الملف:
`supabase/migrations/20261009120000_delete_own_account.sql`

## 3) حفظ المراحل

إصلاح مفتاح التخزين المتصادم + Capacitor Preferences (كان التقدّم يُمسح عند إغلاق التطبيق).

---

## على الماك — رفع Build جديد

```bash
cd /Users/abdullahalshammri/Desktop/khamn-alkalma
git pull origin main   # بعد دمج الـ PR
npm install
npm run native:sync
npx cap open ios
```

1. نفّذ SQL حذف الحساب في Supabase (فوق)
2. Xcode → Version `1.0.0` → Build **4** (أو أعلى)
3. Archive → Upload
4. App Store Connect → 1.0 → اختر البناء الجديد
5. في **App Review Notes** اكتب:

```
Fixes for rejection:
1) ATT: App Tracking Transparency prompt is shown on launch before AdMob.
2) Account deletion: Sign in → Account → "حذف الحساب" → confirm. Deletes Supabase auth user + leaderboard data.

Demo: create any email/password account in-app, or use Sign in with Apple. Account is optional for core play.

Also fixed stages progress persistence across app restarts.
```

6. سجّل فيديو قصير (شاشة الآيفون): إنشاء حساب → حذف الحساب من البداية للنهاية — وأرفقه في App Review إن طُلب، أو ارفعه كرد على رسالة الرفض.
7. **Submit for Review**
