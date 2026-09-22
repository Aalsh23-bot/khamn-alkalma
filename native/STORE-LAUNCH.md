# تجهيز الرفع للمتاجر — خمن الكلمة

هذا الملف يكمّل [`خطوات-البناء.md`](../خطوات-البناء.md).  
الكود والـ sync جاهزين من جهة المشروع؛ الباقي حسابات ماك/أبل/غوغل عندك.

## ما جهّزناه في المشروع ✅

| البند | الحالة |
|--------|--------|
| Capacitor iOS + Android | موجود |
| `appId` | `app.khamsa.game` |
| الإصدار | iOS `1.0.0` (build 1) · Android `1.0.0` (versionCode 1) |
| بناء الويب الأصلي `dist-native` | يُحدَّث بـ `npm run native:sync` |
| Supabase في البناء | من ملف `.env` في جذر المشروع |
| AdMob App ID (اختبار غوغل) | مضبوط في AndroidManifest + Info.plist |
| وحدات الإعلان | تجريبية في `src/lib/ads/config.ts` |

---

## أ) على جهازك (مرة واحدة)

### 1) انسخ المشروع وحدّثه
```bash
cd ~/khamsa   # أو مسار المشروع عندك
git pull origin main
cp .env.example .env
```

ضع في `.env`:
```env
VITE_SUPABASE_URL=https://eqxaivexuowngyigmqwl.supabase.co
VITE_SUPABASE_ANON_KEY=مفتاح_anon_عندك
```

### 2) ابنِ وانسخ للمنصتين
```bash
npm install
npm run native:sync
```

### 3) افتح الأدوات
```bash
npx cap open ios      # يحتاج ماك + Xcode
npx cap open android  # Android Studio
```

---

## ب) آيفون / App Store (على الماك)

1. Xcode → `ios/App/App.xcodeproj`
2. Signing & Capabilities → Team (حساب المطوّر)
3. Bundle ID: `app.khamsa.game`
4. شغّل على محاكي أو جهاز للتأكد
5. Product → Archive → Distribute → App Store Connect
6. في App Store Connect انسخ نصوص [`XCODE.md`](./XCODE.md)

**لازم عندك:** ماك + Xcode + اشتراك Apple Developer (99$/سنة)

---

## ج) أندرويد / Google Play

1. Android Studio → افتح مجلد `android/`
2. Build → Generate Signed App Bundle
3. أنشئ keystore واحفظه في مكان آمن (مرة واحدة)
4. ارفع ملف `.aab` إلى Play Console

**لازم عندك:** Android Studio + حساب Play Console

---

## د) قبل الرفع النهائي (مهم)

### AdMob إنتاجي
1. أنشئ تطبيقات iOS + Android في [AdMob](https://admob.google.com)
2. أنشئ وحدتَي Rewarded (hint + revive)
3. حدّث:
   - `src/lib/ads/config.ts` → `useProductionIds: true` + المعرفات
   - `android/.../strings.xml` → `admob_app_id`
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier`
4. `npm run native:sync` ثم أعد الأرشفة

### نصوص المتجر
حدّثنا الوصف ليشمل: كلمة اليوم، المراحل، تحدّي الأصدقاء، حساب اختياري، لوحة صدارة، إعلان مكافأة اختياري.

### خصوصية
التطبيق يطلب إنترنت لـ: الحساب / لوحة الصدارة / الإعلانات.  
اللعب الأساسي (كلمة اليوم والمراحل) يشتغل محلياً بعد التحميل.

---

## ترتيب التنفيذ المقترح

1. `git pull` + `.env` + `npm run native:sync`
2. جرّب على المحاكي (iOS أو Android)
3. ارفع نسخة اختبار (TestFlight / Internal testing)
4. بدّل مفاتيح AdMob الإنتاجية
5. ارفع نسخة المتجر 1.0.0

إذا علقت في خطوة توقيع أو رفع، أرسل السكرين وأكمّل معك.
