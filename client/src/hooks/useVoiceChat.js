import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoiceChat({ roomId, socket, userId }) {
  const [isJoining, setIsJoining] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [remotePeers, setRemotePeers] = useState([]);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState([]);

  const localStreamRef = useRef(null);
  const isInVoiceRef = useRef(false);
  const peersRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const speakingIntervalRef = useRef(null);
  const lastSpeakingSentRef = useRef(false);
  const speakerTimersRef = useRef(new Map());

  useEffect(() => {
    isInVoiceRef.current = isInVoice;
  }, [isInVoice]);

  const createPeerConnection = useCallback(
    (targetSocketId) => {
      let peer = peersRef.current.get(targetSocketId);
      if (peer) {
        return peer;
      }

      peer = new RTCPeerConnection(RTC_CONFIG);

      const localStream = localStreamRef.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peer.addTrack(track, localStream);
        });
      }

      peer.onicecandidate = (event) => {
        if (!event.candidate || !socket) {
          return;
        }

        socket.emit("VOICE_SIGNAL", {
          roomId,
          targetSocketId,
          signal: { candidate: event.candidate },
        });
      };

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) {
          return;
        }

        remoteStreamsRef.current.set(targetSocketId, stream);
        setRemotePeers(Array.from(remoteStreamsRef.current.entries()).map(([socketId, mediaStream]) => ({ socketId, stream: mediaStream })));
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        if (state === "failed" || state === "disconnected" || state === "closed") {
          peer.close();
          peersRef.current.delete(targetSocketId);
          remoteStreamsRef.current.delete(targetSocketId);
          setRemotePeers(Array.from(remoteStreamsRef.current.entries()).map(([socketId, mediaStream]) => ({ socketId, stream: mediaStream })));
        }
      };

      peersRef.current.set(targetSocketId, peer);
      return peer;
    },
    [roomId, socket]
  );

  const leaveVoice = useCallback(() => {
    if (socket && roomId && isInVoiceRef.current) {
      socket.emit("VOICE_LEAVE", { roomId });
    }

    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    speakerTimersRef.current.forEach((timer) => clearTimeout(timer));
    speakerTimersRef.current.clear();

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    lastSpeakingSentRef.current = false;

    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();

    remoteStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    remoteStreamsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setRemotePeers([]);
    setIsInVoice(false);
    setIsMuted(false);
    setIsSpeaking(false);
    setActiveSpeakerIds([]);
    setError("");
  }, [roomId, socket]);

  const joinVoice = useCallback(async () => {
    if (!socket || !roomId || isJoining || isInVoice) {
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const audioContext = new window.AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;

      setIsInVoice(true);
      socket.emit("VOICE_JOIN", { roomId, userId });
    } catch (joinError) {
      setError("Microphone access failed. Please allow microphone permission.");
      setIsInVoice(false);
    } finally {
      setIsJoining(false);
    }
  }, [isInVoice, isJoining, roomId, socket, userId]);

  const toggleMute = useCallback(() => {
    const localStream = localStreamRef.current;
    if (!localStream) {
      return;
    }

    const nextMuted = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    if (!socket || !roomId || !isInVoice) {
      return undefined;
    }

    const analyser = analyserRef.current;
    if (!analyser) {
      return undefined;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    speakingIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) {
        return;
      }

      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i += 1) {
        const centered = (dataArray[i] - 128) / 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / dataArray.length);
      const speakingNow = !isMuted && rms > 0.045;

      if (speakingNow !== lastSpeakingSentRef.current) {
        lastSpeakingSentRef.current = speakingNow;
        setIsSpeaking(speakingNow);
        socket.emit("VOICE_ACTIVITY", { roomId, isSpeaking: speakingNow });
      }
    }, 160);

    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }
    };
  }, [isInVoice, isMuted, roomId, socket]);

  useEffect(() => {
    if (!socket || !roomId) {
      return undefined;
    }

    async function handleVoiceParticipants({ participants }) {
      if (!Array.isArray(participants) || !localStreamRef.current) {
        return;
      }

      for (const targetSocketId of participants) {
        const peer = createPeerConnection(targetSocketId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("VOICE_SIGNAL", {
          roomId,
          targetSocketId,
          signal: { description: peer.localDescription },
        });
      }
    }

    function handleVoiceUserJoined({ socketId }) {
      if (!socketId || !localStreamRef.current) {
        return;
      }

      createPeerConnection(socketId);
    }

    async function handleVoiceSignal({ fromSocketId, signal }) {
      if (!fromSocketId || !signal || !localStreamRef.current) {
        return;
      }

      const peer = createPeerConnection(fromSocketId);

      if (signal.description) {
        const remoteDescription = new RTCSessionDescription(signal.description);
        await peer.setRemoteDescription(remoteDescription);

        if (signal.description.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit("VOICE_SIGNAL", {
            roomId,
            targetSocketId: fromSocketId,
            signal: { description: peer.localDescription },
          });
        }
      }

      if (signal.candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // Ignore transient candidate timing races.
        }
      }
    }

    function handleVoiceUserLeft({ socketId }) {
      if (!socketId) {
        return;
      }

      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.close();
      }

      peersRef.current.delete(socketId);
      remoteStreamsRef.current.delete(socketId);
      setRemotePeers(Array.from(remoteStreamsRef.current.entries()).map(([peerSocketId, stream]) => ({ socketId: peerSocketId, stream })));

      const timer = speakerTimersRef.current.get(socketId);
      if (timer) {
        clearTimeout(timer);
        speakerTimersRef.current.delete(socketId);
      }

      setActiveSpeakerIds((current) => current.filter((id) => id !== socketId));
    }

    function handleVoiceActivity({ socketId, isSpeaking: remoteSpeaking }) {
      if (!socketId || typeof remoteSpeaking !== "boolean") {
        return;
      }

      if (!remoteSpeaking) {
        const timer = speakerTimersRef.current.get(socketId);
        if (timer) {
          clearTimeout(timer);
          speakerTimersRef.current.delete(socketId);
        }
        setActiveSpeakerIds((current) => current.filter((id) => id !== socketId));
        return;
      }

      setActiveSpeakerIds((current) => (current.includes(socketId) ? current : [...current, socketId]));

      const existingTimer = speakerTimersRef.current.get(socketId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timeoutId = setTimeout(() => {
        setActiveSpeakerIds((current) => current.filter((id) => id !== socketId));
        speakerTimersRef.current.delete(socketId);
      }, 1500);

      speakerTimersRef.current.set(socketId, timeoutId);
    }

    socket.on("VOICE_PARTICIPANTS", handleVoiceParticipants);
    socket.on("VOICE_USER_JOINED", handleVoiceUserJoined);
    socket.on("VOICE_SIGNAL", handleVoiceSignal);
    socket.on("VOICE_USER_LEFT", handleVoiceUserLeft);
    socket.on("VOICE_ACTIVITY", handleVoiceActivity);

    return () => {
      socket.off("VOICE_PARTICIPANTS", handleVoiceParticipants);
      socket.off("VOICE_USER_JOINED", handleVoiceUserJoined);
      socket.off("VOICE_SIGNAL", handleVoiceSignal);
      socket.off("VOICE_USER_LEFT", handleVoiceUserLeft);
      socket.off("VOICE_ACTIVITY", handleVoiceActivity);
    };
  }, [createPeerConnection, roomId, socket]);

  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  const participantCount = useMemo(() => remotePeers.length + (isInVoice ? 1 : 0), [isInVoice, remotePeers.length]);

  return {
    joinVoice,
    leaveVoice,
    toggleMute,
    isJoining,
    isInVoice,
    isMuted,
    isSpeaking,
    activeSpeakerIds,
    participantCount,
    remotePeers,
    error,
  };
}
