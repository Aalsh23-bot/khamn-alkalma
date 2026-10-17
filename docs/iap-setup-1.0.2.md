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
5. **Secret API key** → Supabase Edge secret باسم **`REVENUECAT_SECRET_KEY`**
   (مطلوب لـ `credit-hint-purchase` — بدونها الشراء يُرفض)
6. Webhook → `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization = قيمة سر **`REVENUECAT_WEBHOOK_SECRET`**
   - فعّل حدث `NON_RENEWING_PURCHASE`

## 3) Supabase
1. Auth → فعّل **Anonymous Sign-Ins** (الشراء يعمل بدون تسجيل إجباري عبر جلسة مجهولة؛ `auth.uid()` يبقى موجوداً)
2. نفّذ الهجرات بالترتيب:
   1. `20261015120000_analytics_and_ad_reports.sql`
   2. `20261015140000_hint_balances_iap.sql`
   3. `20261017120000_app_config_hint_packs_flag.sql`
   4. `20261017130000_hint_balance_user_scoped.sql`
   5. `20261017140000_ad_report_rate_limit.sql`
   6. `20261017150000_secure_hint_credit_and_ad_reports.sql`  
      (يسحب `credit_hint_purchase` من العملاء، يقفل `for_user` على service_role، يصلح upsert على `user_id`، يحذف insert المباشر على `ad_reports`)
3. أسرار Edge:
   - `REVENUECAT_SECRET_KEY`
   - `REVENUECAT_WEBHOOK_SECRET`
   - `RESEND_API_KEY` (+ اختياري `AD_REPORT_DEVICE_HMAC`)
4. انشر Functions:
   - `ad-report-notify`
   - `credit-hint-purchase`
   - `revenuecat-webhook`
5. اترك `app_config.hint_packs_enabled = false` إلى أن تكون المنتجات جاهزة، ثم:
   ```sql
   update public.app_config
   set value = 'true'::jsonb
   where key = 'hint_packs_enabled';
   ```
   مع العلم: العميل **لا يشغّل RevenueCat** أصلاً إذا كانت القيمة `false`.

## 4) البناء
```bash
git pull
npm install
npm run native:sync
```
ثم Archive لـ **1.0.2** من Xcode وأرسل مع المنتجات.

## اختبار القبول
Sandbox Apple ID على جهاز حقيقي → اشترِ باقة (بدون تسجيل دخول إجباري) → الرصيد يزيد مرة وحدة → أعد التثبيت / جهاز ثاني → **استعادة المشتريات** أو Webhook يضيف أي عملية ناقصة → نفس `transaction_id` لا يُحسب مرتين.
