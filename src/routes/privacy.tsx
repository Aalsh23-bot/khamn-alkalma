import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
} from "@/lib/privacy-content";

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
      <p className="mt-2 text-sm text-muted">آخر تحديث: {PRIVACY_LAST_UPDATED}</p>

      <div className="mt-6 space-y-5 text-[15px] leading-7">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-1 font-semibold">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
