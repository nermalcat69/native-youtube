import { useState } from "react";
import { useProfiles } from "../hooks/useProfiles";

export default function ProfilePicker() {
  const { profiles, active, switchProfile, createProfile } = useProfiles();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createProfile(name);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="flex flex-col gap-1 p-3">
      <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Profile</p>
      {profiles.map((p) => (
        <button
          key={p.name}
          onClick={() => switchProfile(p.name)}
          className={[
            "text-left px-3 py-1.5 rounded text-sm transition-colors",
            active === p.name
              ? "bg-red-600 text-white"
              : "text-neutral-300 hover:bg-neutral-700",
          ].join(" ")}
        >
          {p.name}
        </button>
      ))}
      {creating ? (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Profile name"
            className="flex-1 bg-neutral-700 text-sm text-white px-2 py-1 rounded outline-none"
          />
          <button
            onClick={handleCreate}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="text-xs text-neutral-500 hover:text-neutral-300 mt-1 text-left"
        >
          + New profile
        </button>
      )}
    </div>
  );
}
