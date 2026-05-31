import { useState, useEffect, useCallback } from "react";
import { api, type Download } from "../lib/tauri";

export function useDownloads() {
  const [downloads, setDownloads] = useState<Download[]>([]);

  const refresh = useCallback(async () => {
    const list = await api.getDownloads();
    setDownloads(list);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const queueDownload = useCallback(async (
    videoId: string,
    title: string,
    url: string,
    format: "video" | "audio"
  ) => {
    const id = await api.downloadVideo({ videoId, title, url, format });
    await refresh();
    return id;
  }, [refresh]);

  return { downloads, queueDownload, refresh };
}
