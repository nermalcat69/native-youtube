type Page = "downloads" | "settings";

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

const items: { id: Page; label: string; icon: string }[] = [
  { id: "downloads", label: "Downloads", icon: "⬇" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ current, onChange }: Props) {
  return (
    <aside className="flex flex-col w-14 shrink-0 bg-neutral-900 border-r border-neutral-800 py-3 gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          title={item.label}
          onClick={() => onChange(item.id)}
          className={[
            "flex flex-col items-center justify-center h-12 w-full text-lg transition-colors",
            current === item.id
              ? "text-red-500"
              : "text-neutral-400 hover:text-white",
          ].join(" ")}
        >
          <span>{item.icon}</span>
        </button>
      ))}
    </aside>
  );
}
