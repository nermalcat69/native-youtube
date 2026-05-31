import { useState, useEffect, useCallback } from "react";
import { api, type Profile } from "../lib/tauri";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState("default");

  const refresh = useCallback(async () => {
    const [list, cur] = await Promise.all([api.getProfiles(), api.getActiveProfile()]);
    setProfiles(list);
    setActive(cur);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const switchProfile = useCallback(async (name: string) => {
    await api.setActiveProfile(name);
    setActive(name);
  }, []);

  const createProfile = useCallback(async (name: string) => {
    const p = await api.createProfile(name);
    setProfiles((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
    return p;
  }, []);

  return { profiles, active, switchProfile, createProfile, refresh };
}
