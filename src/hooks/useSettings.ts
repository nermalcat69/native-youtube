import { useState, useEffect, useCallback } from "react";
import { api, type Settings } from "../lib/tauri";

const DEFAULT: Settings = {
  theme: "system",
  adblock_enabled: true,
  cosmetic_filtering_enabled: true,
  sponsorblock_enabled: true,
  sponsorblock_categories: ["sponsor", "selfpromo", "interaction", "intro", "outro"],
  auto_update: true,
  active_profile: "default",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await api.updateSettings(next);
  }, [settings]);

  return { settings, loading, update };
}
