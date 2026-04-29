import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, loadStoredTheme } from "@/lib/themes";

// Apply theme synchronously before first render to avoid flash
applyTheme(loadStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
