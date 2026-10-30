// The voice settings (GET /api/voice/settings: the services' keys, the spoken language, the speech-to-text models), read once and
// read again on reload(). The speech-to-text model itself is set up with the app's components (Set up, Settings › System).
import { useEffect, useState } from "react";
import { get } from "../api.js";

export function useVoiceSettings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = () => get("/api/voice/settings").then((d) => { setData(d); setError(null); }).catch(setError);
  useEffect(() => { reload(); }, []);
  return { data, error, reload };
}
