import { useEffect, useRef } from "react";

function RemoteAudio({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.srcObject = stream;
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export function VoiceControls({
  isJoining,
  isInVoice,
  isMuted,
  isSpeaking,
  activeSpeakerIds,
  participantCount,
  onJoin,
  onLeave,
  onToggleMute,
  remotePeers,
  error,
}) {
  return (
    <>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isInVoice ? (
          <button
            type="button"
            onClick={onJoin}
            disabled={isJoining}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining ? "Joining voice..." : "Join Voice"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white hover:bg-rose-400"
            >
              Leave Voice
            </button>
          </>
        )}

        <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
          Voice participants: {participantCount}
        </span>
      </div>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <div className="hidden">
        {remotePeers.map((peer) => (
          <RemoteAudio key={peer.socketId} stream={peer.stream} />
        ))}
      </div>
      </div>

      {(isSpeaking || activeSpeakerIds.length > 0) && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[260px] flex-col gap-2">
          {isSpeaking ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-lg">
              You are speaking
            </span>
          ) : null}
          {activeSpeakerIds.map((socketId) => (
            <span
              key={socketId}
              className="rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 shadow-lg"
            >
              {`User ${socketId.slice(0, 6)} speaking`}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
