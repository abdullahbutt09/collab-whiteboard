import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function HomePage() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateRoom() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/room/create`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to create room");
      }

      const data = await response.json();
      navigate(`/room/${data.roomId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleJoinRoom(event) {
    event.preventDefault();

    if (!roomInput.trim()) {
      setError("Enter a room id to join.");
      return;
    }

    navigate(`/room/${roomInput.trim()}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-cyan-100 px-4 py-10 text-zinc-800">
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white/80 p-8 shadow-2xl backdrop-blur-md md:p-12">
        <p className="inline-block rounded-full bg-amber-200 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-900">
          CollabBoard
        </p>
        <h1 className="mt-4 font-['Space_Grotesk',sans-serif] text-4xl font-bold leading-tight text-zinc-900 md:text-6xl">
          Realtime ideas.
          <br />
          One shared board.
        </h1>
        <p className="mt-4 max-w-xl text-base text-zinc-600 md:text-lg">
          Create a room, share the URL, and draw together with live cursors, undo-redo history, and persistent canvas state.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </div>

        <form onSubmit={handleJoinRoom} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value)}
            placeholder="Enter room id"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none ring-orange-300 transition focus:ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-zinc-900 transition hover:bg-emerald-400"
          >
            Join Room
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
      </section>
    </main>
  );
}
