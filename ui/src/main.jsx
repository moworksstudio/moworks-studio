import { createRoot } from "react-dom/client";
import "./tokens.css";
import "./app.css";
import "./editor.css";
import "./library.css";
import "./production.css";
import App from "./App.jsx";
import { LangProvider } from "./i18n.jsx";
import { applyStored } from "./theme.jsx";
import { loadPrefs, mirrorPrefs } from "./prefs-sync.js";
import "./motion.js";
import "./studio-shell.css";          // The Studio (data-theme="studio"): after every other stylesheet (App pulls workflow.css and co.), so it wins over The Desk's unscoped rules; every selector is scoped
import "./studio-editor.css";

// the settings kept on this computer first (the port, and so this window's storage, is new at every start), then the first paint
loadPrefs().finally(() => {
  mirrorPrefs();
  applyStored();
  createRoot(document.getElementById("root")).render(<LangProvider><App /></LangProvider>);
});
