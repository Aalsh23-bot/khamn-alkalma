import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Game } from "@/components/game/Game";
import { bootstrapNative } from "@/lib/native";

void bootstrapNative();

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");

createRoot(root).render(
  <StrictMode>
    <main className="min-h-dvh bg-bg">
      <Game />
    </main>
  </StrictMode>,
);
