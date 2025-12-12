import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Remove splash screen after React mounts with fade-out
const splash = document.getElementById('splash');
if (splash) {
  splash.style.transition = 'opacity 0.3s ease-out';
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 300);
}
