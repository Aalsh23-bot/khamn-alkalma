import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

function Privacy() {
  return (
    <main
      dir="rtl"
      className="mx-auto min-h-dvh max-w-lg bg-bg px-5 py-8 text-fg"
    >
      <p className="text-sm text-muted">
        <Link to="/" className="text-accent">
          → خمن الكلمة
        </Link>
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted">آخر تحديث: ٢٩ أغسطس ٢٠٢٦</p>

      <div className="mt-6 space-y-5 text-[15px] leading-7">
        <section>
          <h2 className="mb-1 font-semibold">ماذا نجمع؟</h2>
          <p>
            خمن الكلمة لعبة تُلعب على جهازك. لا نطلب حساباً، ولا نجمع بريداً أو اسماً، ولا
            نستخدم أدوات تتبع أو إعلانات.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">ما الذي يُحفظ على الجهاز؟</h2>
          <p>
            الإحصائيات، السلسلة، إعدادات الوضع الصعب والصوت، ولغز اليوم الحالي
            تُحفظ محلياً في المتصفح أو في تخزين التطبيق. لا تُرفع إلى خادم.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">المشاركة</h2>
          <p>
            زر المشاركة يفتح ورقة المشاركة في النظام لنسخ شبكة النتيجة كرموز
            إيموجي. لا نرسل النتيجة نيابة عنك.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">الأطفال</h2>
          <p>
            اللعبة مناسبة لجميع الأعمار ولا تجمع بيانات من الأطفال. لا يوجد شات
            أو محتوى من مستخدمين آخرين.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold">التواصل</h2>
          <p>للاستفسار عن الخصوصية راسل مطوّر التطبيق من صفحة المتجر.</p>
        </section>
      </div>
    </main>
  );
}
