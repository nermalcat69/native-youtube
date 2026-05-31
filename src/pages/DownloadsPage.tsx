import { useDownloads } from "../hooks/useDownloads";
import { type Download } from "../lib/tauri";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-900 text-yellow-400",
    downloading: "bg-blue-900 text-blue-400",
    complete: "bg-green-900 text-green-400",
    error: "bg-red-900 text-red-400",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[status] ?? "bg-neutral-800 text-neutral-400"}`}>
      {status}
    </span>
  );
}

function DownloadRow({ d }: { d: Download }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate font-medium">{d.title}</p>
        <p className="text-xs text-neutral-500 truncate mt-0.5">{d.file_path}</p>
        {d.status === "downloading" && (
          <div className="mt-1.5 h-1 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${d.progress * 100}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <StatusBadge status={d.status} />
        <span className="text-xs text-neutral-600">{d.format}</span>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  const { downloads, refresh } = useDownloads();

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <h1 className="text-base font-semibold">Downloads</h1>
        <button
          onClick={refresh}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-600">
            <span className="text-4xl">⬇</span>
            <p className="text-sm">No downloads yet</p>
          </div>
        ) : (
          downloads.map((d) => <DownloadRow key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}
