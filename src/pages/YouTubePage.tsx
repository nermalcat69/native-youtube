import { useCallback, useEffect } from "react";
import { type Settings } from "../lib/tauri";

// CSS injected into the native webview at runtime to hide ad DOM elements.
// In production Tauri calls webview.eval() with this string after each navigation.
export const COSMETIC_CSS = `
  .ytp-ad-module,
  .ytp-ad-player-overlay,
  .ytp-ad-player-overlay-instream-info,
  .ytp-ad-image-overlay,
  .ytp-ad-text-overlay,
  #ad-text,
  .ad-showing .ytp-chrome-bottom,
  .ytp-ad-skip-button-container,
  ytd-banner-promo-renderer,
  ytd-statement-banner-renderer,
  ytd-ad-slot-renderer,
  ytd-in-feed-ad-layout-renderer,
  tp-yt-paper-dialog:has(ytd-ad-slot-renderer),
  #masthead-ad,
  .ytd-display-ad-renderer,
  .video-ads { display: none !important; }
`;

interface Props {
  settings: Settings;
}

export default function YouTubePage({ settings }: Props) {
  const injectCosmeticCSS = useCallback(() => {
    if (!settings.cosmetic_filtering_enabled) return;
    // In Tauri production: window.__TAURI__.webview.getCurrent().eval(`
    //   const s = document.createElement('style');
    //   s.textContent = \`${COSMETIC_CSS}\`;
    //   document.head.appendChild(s);
    // `);
    // Cross-origin restrictions prevent injection from the dev iframe.
  }, [settings.cosmetic_filtering_enabled]);

  useEffect(() => {
    injectCosmeticCSS();
  }, [injectCosmeticCSS]);

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <span className="text-xs text-neutral-500 font-mono">youtube.com</span>
        {settings.adblock_enabled && (
          <span className="text-xs bg-green-900 text-green-400 px-1.5 py-0.5 rounded">
            Adblock ON
          </span>
        )}
        {settings.sponsorblock_enabled && (
          <span className="text-xs bg-blue-900 text-blue-400 px-1.5 py-0.5 rounded">
            SponsorBlock ON
          </span>
        )}
        {settings.cosmetic_filtering_enabled && (
          <span className="text-xs bg-purple-900 text-purple-400 px-1.5 py-0.5 rounded">
            Cosmetic ON
          </span>
        )}
      </div>

      {/* WebView placeholder — in production Tauri renders a native webview here */}
      <div className="flex-1 flex items-center justify-center bg-neutral-950">
        <div className="text-center text-neutral-600 space-y-4 max-w-sm px-6">
          <div className="text-6xl">▶</div>
          <h2 className="text-white text-xl font-semibold">Youtube</h2>
          <p className="text-sm leading-relaxed">
            In the compiled desktop app, YouTube loads here in a native system
            webview — fully ad-blocked, with SponsorBlock and cosmetic filtering
            active.
          </p>
          <p className="text-xs text-neutral-500">
            Run{" "}
            <code className="bg-neutral-800 px-1 rounded">
              npm run tauri dev
            </code>{" "}
            or{" "}
            <code className="bg-neutral-800 px-1 rounded">
              npm run tauri build
            </code>{" "}
            to launch the native app.
          </p>
        </div>
      </div>
    </div>
  );
}
