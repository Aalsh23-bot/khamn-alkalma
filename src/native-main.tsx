import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Game } from "@/components/game/Game";
import { bootstrapNative } from "@/lib/native";

void bootstrapNative();

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");

class BootErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "خطأ غير معروف" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[khamsa boot]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            background: "#F3EEE4",
            color: "#1c1917",
            fontFamily: "system-ui, sans-serif",
            direction: "rtl",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>تعذّر فتح اللعبة</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(root).render(
  <StrictMode>
    <BootErrorBoundary>
      <main className="min-h-dvh bg-bg">
        <Game />
      </main>
    </BootErrorBoundary>
  </StrictMode>,
);
