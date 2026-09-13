# خمن الكلمة — نصوص المتجر وملخص الرفع

**الدليل الكامل خطوة بخطوة في الملف:** [`../خطوات-البناء.md`](../خطوات-البناء.md)

## ماذا تفتح

- **Xcode:** `ios/App/App.xcodeproj`
- **Android Studio:** مجلد `android`

## أوامر بعد تعديل الكود

```bash
npm install
npm run native:sync
npx cap open ios
npx cap open android
```

## Xcode باختصار

1. Signing & Capabilities → Automatically manage signing → Team.
2. Bundle Identifier: `app.khamsa.game` (أو معرّفك إن كان محجوزاً).
3. Display Name: `خمن الكلمة` — Version `1.0.0` — Build `1` — Portrait.
4. Destination: Any iOS Device (arm64).
5. Product → Archive → Distribute App → App Store Connect → Upload.

## App Store Connect — انسخ هذا

- الاسم: **خمن الكلمة**
- الفئة: Games → Word / Puzzle
- العمر: 4+
- تشفير: لا يوجد تشفير خاص

### وصف قصير
خمن كلمة عربية فصحى من خمسة أحرف في ست محاولات. كلمة اليوم أو مائة مرحلة.

### وصف كامل
خمن الكلمة هي نسخة عربية من لعبة تخمين الكلمات.

• خمس خانات وست محاولات  
• كلمة فصحى جديدة كل يوم  
• مائة مرحلة متتالية  
• تلميح واحد لكل جولة  
• وضع صعب  
• إحصائيات وسلسلة انتصارات  
• مشاركة النتيجة كشبكة ملوّنة  

الأحرف: ا / أ / إ / آ حرف واحد. ه و ة حرفان مختلفان. ى و ي حرفان مختلفان.

تعمل دون إنترنت بعد التثبيت. لا حسابات ولا إعلانات ولا تتبّع.

### كلمات مفتاحية
خمن,الكلمة,ورذل,عربي,تحدي,يوميا,حروف,لغز,فصحى,تخمين,مراحل

## أندرويد باختصار

- applicationId: `app.khamsa.game`
- versionCode: 1 / versionName: 1.0.0 (زد versionCode في كل رفع)
- Build → Generate Signed Bundle → Android App Bundle
- احفظ ملف `.jks` في مكان آمن

## إن سألت أبل أثناء المراجعة

التطبيق حزمة ويب محلية (ليست موقعاً خارجياً) مع اهتزاز أصلي ومشاركة أصلية وشاشة إقلاع. يعمل دون شبكة. لعبة كلمات عربية: كلمة يومية + مراحل.
