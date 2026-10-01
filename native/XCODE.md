# خمن الكلمة — نصوص المتجر وملخص الرفع

**الدليل الكامل خطوة بخطوة في الملف:** [`../خطوات-البناء.md`](../خطوات-البناء.md)

## ماذا تفتح

- **Xcode:** `ios/App/App.xcodeproj`
- **App Store Connect:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- **Android Studio:** مجلد `android`

## أوامر بعد تعديل الكود

```bash
npm install
npm run native:sync
npx cap open ios
```

---

## App Store Connect — خطوة ١: صفحة الإصدار 1.0

1. **My Apps** → **خمن الكلمة بالعربي** → **Distribution** → **iOS App** → **1.0 Prepare for Submission**
2. املأ الحقول التالية:

| الحقل | القيمة |
|--------|--------|
| الاسم (في المتجر) | **خمن الكلمة بالعربي** |
| العنوان الفرعي (Subtitle) | خمّن كلمة عربية في ٦ محاولات |
| الفئة الأساسية | Games |
| الفئة الفرعية | Word |
| العمر | 4+ |
| حقوق النشر | © 2026 Abdullah Alshammari |
| رابط سياسة الخصوصية | `https://aalsh23-bot.github.io/khamn-alkalma/privacy.html` |

> **تفعيل الرابط:** GitHub → repo **khamn-alkalma** → Settings → Pages → Source: **Deploy from branch** → Branch: **main** → Folder: **/docs** → Save. انتظر دقيقة ثم افتح الرابط في المتصفح.

### وصف قصير (Promotional Text — اختياري)
لغز عربي يومي + مراحل + تحدّي الأصدقاء. حساب اختياري ولوحة صدارة.

### وصف كامل (Description)
```
خمن الكلمة هي لعبة تخمين كلمات عربية فصحى من خمسة أحرف في ست محاولات.

• كلمة فصحى جديدة كل يوم
• مراحل متتالية تُفتح بالتدريج
• تحدّي الأصدقاء بنفس الكلمة عبر رابط
• حساب اختياري (بريد أو Sign in with Apple) ولوحة صدارة
• تلميح أو فرصة إضافية بعد إعلان مكافأة (اختياري)
• وضع صعب وإحصائيات وشارات

الأحرف: ا / أ / إ / آ حرف واحد. ه و ة حرفان مختلفان. ى و ي حرفان مختلفان.

اللعب الأساسي يعمل على الجهاز. الحساب ولوحة الصدارة والإعلانات تحتاج إنترنت.
```

### كلمات مفتاحية (Keywords)
```
خمن,الكلمة,عربي,تحدي,يوميا,حروف,لغز,فصحى,تخمين,مراحل,ورد,لعبة
```

### لقطات الشاشة (Screenshots)
**مطلوب:** iPhone 6.5" (1290 × 2796) — على الأقل 3 صور.

اقتراح المحتوى:
1. شاشة اللعب (لوحة + لوحة مفاتيح)
2. كلمة اليوم / الفوز
3. المراحل أو لوحة الصدارة
4. (اختياري) شاشة الحساب

**طريقة سريعة على الماك:** شغّل التطبيق على iPhone 15 Pro Max simulator → ⌘S لحفظ لقطة → ارفعها في App Store Connect.

---

## App Store Connect — خطوة ٢: App Privacy

**App Privacy** → **Get Started** → أجب تقريباً كالتالي:

| نوع البيانات | يُجمع؟ | مرتبط بالهوية؟ | للتتبع؟ | الغرض |
|--------------|--------|----------------|---------|--------|
| **Email Address** | نعم (اختياري) | نعم | لا | App Functionality (حساب) |
| **Name** | نعم (اختياري) | نعم | لا | App Functionality (اسم العرض) |
| **User ID** | نعم (اختياري) | نعم | لا | App Functionality |
| **Gameplay Content** | نعم (اختياري) | نعم | لا | App Functionality (نتائج لوحة الصدارة) |
| **Device ID** | نعم (AdMob) | لا | نعم | Advertising |
| **Product Interaction** | نعم (AdMob) | لا | نعم | Advertising / Analytics |

- **Do you or your third-party partners use data for tracking?** → **Yes** (AdMob)
- **Privacy Policy URL:** نفس الرابط أعلاه

---

## App Store Connect — خطوة ٣: اختر البناء وأرسل

1. في صفحة **1.0** → قسم **Build** → **+** → اختر **1.0.0 (2)** (أو آخر build مرفوع)
2. **App Review Information:**
   - Sign-in required? → **No** (الحساب اختياري)
   - Notes for reviewer (انسخ):
     ```
     Arabic Wordle-style word game (Capacitor). Core play works offline.
     Optional account: email/password or Sign in with Apple (no demo account needed — reviewer can play without login).
     Optional rewarded ads for hint/extra guess (AdMob). ATT prompt may appear for ad personalization.
     ```
3. **Export Compliance:** Uses encryption? → **No** (ITSAppUsesNonExemptEncryption = false في Info.plist)
4. **Content Rights / Advertising Identifier:** Yes — app displays ads (AdMob rewarded, optional)
5. **Submit for Review**

---

## Xcode — أرشفة build جديد (إن احتجت)

1. Signing & Capabilities → Automatically manage signing → Team **ABDULLAH ALSHAMMARI**
2. Bundle Identifier: `app.khamsa.game`
3. Version **1.0.0** — Build **3** (زد Build في كل رفع)
4. Destination: **Any iOS Device (arm64)**
5. Product → Archive → Distribute App → App Store Connect → Upload

---

## بعد الموافقة

1. **AdMob** → Apps → iOS app → Link to App Store (يزيل شارة Test mode)
2. **Pricing** → Free → جميع الدول أو السعودية + دول الخليج
3. **Release:** يدوي أو تلقائي بعد الموافقة

---

## أندرويد باختصار

- applicationId: `app.khamsa.game`
- versionCode: 1 / versionName: 1.0.0 (زد versionCode في كل رفع)
- Build → Generate Signed Bundle → Android App Bundle

## قائمة الإطلاق الكاملة

انظر: [`STORE-LAUNCH.md`](./STORE-LAUNCH.md)
