# إعداد المشتريات — 1.0.2

قبل ما الشراء يشتغل على الجهاز الحقيقي لازم تكمل هالخطوات (مرة واحدة):

## 1) App Store Connect (أنت)
1. Agreements → **Paid Apps Agreement** + ضريبة W-8BEN + بنك
2. DSA: صفة **Trader** + إثبات العنوان (للتوزيع في أوروبا)
3. المزايا → In-App Purchases → أنشئ 3 منتجات **Consumable**:
   - `hints_5` — 5 تلميحات — $0.99
   - `hints_20` — 20 تلميح — $2.99 (الأكثر طلباً)
   - `hints_60` — 60 تلميح — $6.99 (أفضل قيمة)
4. أرفق لقطة شاشة للمتجر + وصف عربي
5. App Privacy → أضف **Purchases ← Purchase History** (غير مربوط بالهوية، بدون تتبع، App Functionality)

## 2) RevenueCat
1. أنشئ مشروع واربط App Store Connect API key
2. أضف منتجات `hints_5` / `hints_20` / `hints_60`
3. Offering افتراضي فيه الـ 3 packages
4. انسخ **Public iOS API key** إلى `.env`:
   ```
   VITE_REVENUECAT_IOS_API_KEY=appl_...
   ```
5. (اختياري للتحقق من السيرفر) Secret key → Supabase secret `REVENUECAT_SECRET_KEY`

## 3) Supabase
1. نفّذ الهجرتين:
   - `20261015120000_analytics_and_ad_reports.sql`
   - `20261015140000_hint_balances_iap.sql`
2. انشر Functions:
   - `ad-report-notify` (+ `RESEND_API_KEY`)
   - `credit-hint-purchase`

## 4) البناء
```bash
git pull
npm install
npm run native:sync
```
ثم Archive لـ **1.0.2** من Xcode وأرسل مع المنتجات.

## اختبار القبول
Sandbox Apple ID على جهاز حقيقي → اشترِ باقة → الرصيد يزيد مرة وحدة → أعد التثبيت (نفس device id / أو حساب) والرصيد يرجع من السيرفر بعد المزامنة.
