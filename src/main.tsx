import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Note: Splash screen is now managed by SplashScreen.tsx component
// which coordinates with CoupleContext loading state for stable reveal
