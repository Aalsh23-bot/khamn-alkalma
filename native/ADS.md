# الإعلانات (AdMob)

اللعبة تدعم إعلانات مكافأة اختيارية:

1. **كشف حرف** من زر المصباح أثناء اللعب (بعد مشاهدة إعلان)
2. **استعادة آخر محاولة** بعد الخسارة (بعد مشاهدة إعلان)
3. **إعادة المرحلة بكلمة جديدة** بدون إعلان (بديل بعد الخسارة في وضع المراحل)

## التطوير الآن
على المتصفح يظهر إعلان تجريبي داخل اللعبة (محاكاة) حتى تربط AdMob على الجهاز.

## قبل الرفع للمتاجر
1. أنشئ تطبيقين في [AdMob](https://admob.google.com) (iOS + Android)
2. أنشئ وحدتين من نوع **Rewarded**
3. الصق المعرفات في `src/lib/ads/config.ts` وفعّل `useProductionIds: true`
4. أضف App ID في الملفات الأصلية:
   - Android: `android/app/src/main/AndroidManifest.xml` داخل `<application>`:
     ```xml
     <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-xxxxxxxx~yyyyyyyy"/>
     ```
   - iOS: `ios/App/App/Info.plist`:
     ```xml
     <key>GADApplicationIdentifier</key>
     <string>ca-app-pub-xxxxxxxx~yyyyyyyy</string>
     ```
5. نفّذ `npm run native:sync` ثم ابنِ من Xcode / Android Studio

الحزمة المستخدمة: `@capacitor-community/admob`
