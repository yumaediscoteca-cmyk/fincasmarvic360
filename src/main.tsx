import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Notificar que la app está lista para ocultar el splash screen
requestAnimationFrame(() => {
  window.dispatchEvent(new CustomEvent('marcvic-app-ready'));
});
