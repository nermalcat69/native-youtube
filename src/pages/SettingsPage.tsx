import { useSettings } from "../hooks/useSettings";
import ProfilePicker from "../components/ProfilePicker";
import { api, type Settings } from "../lib/tauri";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-neutral-800 cursor-pointer">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors mt-0.5",
          checked ? "bg-red-500" : "bg-neutral-600",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

const SB_CATEGORIES = [
  { id: "sponsor", label: "Sponsors" },
  { id: "selfpromo", label: "Self-promotion" },
  { id: "interaction", label: "Interaction reminders" },
  { id: "intro", label: "Intro" },
  { id: "outro", label: "Outro" },
];

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-950 text-neutral-600 text-sm">
        Loading…
      </div>
    );
  }

  const toggleSbCategory = (id: string) => {
    const cats = settings.sponsorblock_categories;
    const next = cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id];
    update({ sponsorblock_categories: next });
  };

  return (
    <div className="h-full bg-neutral-950 text-white overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-6 space-y-8">
        <h1 className="text-lg font-semibold">Settings</h1>

        {/* Blocking */}
        <section>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Blocking</h2>
          <div className="bg-neutral-900 rounded-xl px-4">
            <Toggle
              label="Ad blocking"
              description="Block ad network requests using Brave's adblock-rust engine"
              checked={settings.adblock_enabled}
              onChange={(v) => update({ adblock_enabled: v })}
            />
            <Toggle
              label="Cosmetic filtering"
              description="Hide ad DOM elements via CSS injection"
              checked={settings.cosmetic_filtering_enabled}
              onChange={(v) => update({ cosmetic_filtering_enabled: v })}
            />
            <Toggle
              label="SponsorBlock"
              description="Auto-skip sponsored segments and intros"
              checked={settings.sponsorblock_enabled}
              onChange={(v) => update({ sponsorblock_enabled: v })}
            />
            {settings.sponsorblock_enabled && (
              <div className="py-3 border-b border-neutral-800">
                <p className="text-xs text-neutral-500 mb-2">Skip categories</p>
                <div className="flex flex-wrap gap-2">
                  {SB_CATEGORIES.map((cat) => {
                    const active = settings.sponsorblock_categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleSbCategory(cat.id)}
                        className={[
                          "text-xs px-2.5 py-1 rounded-full border transition-colors",
                          active
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-neutral-700 text-neutral-400 hover:border-neutral-500",
                        ].join(" ")}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Appearance</h2>
          <div className="bg-neutral-900 rounded-xl px-4">
            <div className="flex items-center justify-between py-3 border-b border-neutral-800">
              <p className="text-sm text-white">Theme</p>
              <div className="flex gap-1">
                {(["system", "dark", "light"] as Settings["theme"][]).map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    className={[
                      "text-xs px-3 py-1 rounded capitalize transition-colors",
                      settings.theme === t
                        ? "bg-neutral-700 text-white"
                        : "text-neutral-500 hover:text-neutral-300",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Updates */}
        <section>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Updates</h2>
          <div className="bg-neutral-900 rounded-xl px-4">
            <Toggle
              label="Auto update"
              description="Automatically install Youtube updates"
              checked={settings.auto_update}
              onChange={(v) => update({ auto_update: v })}
            />
            <div className="py-3">
              <button
                onClick={() => api.checkForUpdate()}
                className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Check for updates
              </button>
            </div>
          </div>
        </section>

        {/* Profiles */}
        <section>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Profiles</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <ProfilePicker />
          </div>
        </section>

        {/* Filter lists */}
        <section>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Filter lists</h2>
          <div className="bg-neutral-900 rounded-xl px-4 py-3">
            <p className="text-xs text-neutral-500 mb-2">
              EasyList · EasyPrivacy · Fanboy Annoyances · uBlock Origin filters
            </p>
            <button
              onClick={() => api.reloadFilters()}
              className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded transition-colors"
            >
              Reload filters
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
