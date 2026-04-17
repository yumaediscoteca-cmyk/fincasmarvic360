import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
// Oculta el splash de index.html en cuanto React pinta (sin esperar 4.5s fijos)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("marvic-app-ready"));
  });
});
