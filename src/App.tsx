import { useState, Suspense, lazy } from "react";
import Sidebar from "./components/Sidebar";

const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

type Page = "downloads" | "settings";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-neutral-950 text-neutral-600 text-sm">
      Loading…
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("settings");

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          {page === "downloads" && <DownloadsPage />}
          {page === "settings" && <SettingsPage />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
