# تجهيز الرفع للمتاجر — خمن الكلمة

هذا الملف يكمّل [`خطوات-البناء.md`](../خطوات-البناء.md).

## ما جهّزناه في المشروع ✅

| البند | الحالة |
|--------|--------|
| Capacitor iOS + Android | موجود |
| `appId` | `app.khamsa.game` |
| TestFlight build | **1.0.0 (2)** — AdMob إنتاجي iOS |
| Sign in with Apple | يعمل على الجهاز |
| Supabase | مفاتيح مدمجة + auth |
| AdMob iOS | إنتاجي (`useProductionIds: true`) |
| سياسة الخصوصية | `docs/privacy.html` + نص محدّث في التطبيق |
| نصوص App Store | [`XCODE.md`](./XCODE.md) |

---

## الآن: Submit for Review (iOS)

اتبع [`XCODE.md`](./XCODE.md) بالترتيب:

1. **فعّل GitHub Pages** لرابط سياسة الخصوصية (مرة واحدة)
2. **App Store Connect** → Distribution → 1.0 → املأ الوصف والكلمات المفتاحية
3. **Screenshots** — iPhone 6.5" (3 على الأقل)
4. **App Privacy** — أجب حسب الجدول في XCODE.md
5. **اختر build 1.0.0 (2)** → Submit for Review

---

## على الماك (تحديث الكود)

```bash
cd /Users/abdullahalshammri/Desktop/khamn-alkalma
git pull origin main
npm install
npm run native:sync
```

---

## AdMob — بعد نشر App Store

1. [AdMob](https://admob.google.com) → Apps → iOS → **Link to App Store**
2. هذا يزيل شارة **Test mode** من الإعلانات

---

## أندرويد (لاحقاً)

- AdMob Android ما زال test IDs — أنشئ تطبيق Android في AdMob قبل Play Store
- Android Studio → Signed Bundle → Play Console

---

## إذا علقت

أرسل سكرين من App Store Connect أو Xcode وأكمّل معك الخطوة التالية.
