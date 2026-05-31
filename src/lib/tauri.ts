import { invoke } from "@tauri-apps/api/core";

export interface Settings {
  theme: "dark" | "light" | "system";
  adblock_enabled: boolean;
  cosmetic_filtering_enabled: boolean;
  sponsorblock_enabled: boolean;
  sponsorblock_categories: string[];
  auto_update: boolean;
  active_profile: string;
}

export interface Profile {
  name: string;
  path: string;
}

export interface Download {
  id: string;
  video_id: string;
  title: string;
  url: string;
  file_path: string;
  format: string;
  status: string;
  progress: number;
  created_at: string;
}

export interface Segment {
  segment: [number, number];
  category: string;
  action_type: string;
  uuid: string;
  votes: number;
}

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (s: Settings) => invoke<void>("update_settings", { newSettings: s }),

  getProfiles: () => invoke<Profile[]>("get_profiles"),
  getActiveProfile: () => invoke<string>("get_active_profile"),
  setActiveProfile: (name: string) => invoke<void>("set_active_profile", { name }),
  createProfile: (name: string) => invoke<Profile>("create_profile", { name }),

  getDownloads: () => invoke<Download[]>("get_downloads"),
  downloadVideo: (args: { videoId: string; title: string; url: string; format: string }) =>
    invoke<string>("download_video", {
      videoId: args.videoId,
      title: args.title,
      url: args.url,
      format: args.format,
    }),

  fetchSponsorSegments: (videoId: string, categories: string[]) =>
    invoke<Segment[]>("fetch_sponsor_segments", { videoId, categories }),

  checkUrl: (url: string, source: string, resourceType: string) =>
    invoke<boolean>("check_url", { url, source, resourceType }),

  reloadFilters: () => invoke<void>("reload_filters"),

  checkForUpdate: () => invoke<boolean>("check_for_update"),
  installUpdate: () => invoke<void>("install_update"),
};
