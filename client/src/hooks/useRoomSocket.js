import { useEffect } from "react";
import { createSocket } from "../socket/client";
import { useBoardStore } from "../store/useBoardStore";

export function useRoomSocket(roomId, handlers) {
  const setSocket = useBoardStore((state) => state.setSocket);
  const userId = useBoardStore((state) => state.userId);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = createSocket();
    setSocket(socket);

    socket.emit("JOIN_ROOM", { roomId, userId });

    socket.on("USER_JOINED", handlers.onUserJoined);
    socket.on("USER_LEFT", handlers.onUserLeft);
    socket.on("SYNC_DRAW", handlers.onSyncDraw);
    socket.on("SYNC_UPDATE", handlers.onSyncUpdate);
    socket.on("SYNC_DELETE", handlers.onSyncDelete);
    socket.on("SYNC_CURSOR", handlers.onSyncCursor);
    socket.on("SYNC_CLEAR", handlers.onSyncClear);
    socket.on("SYNC_SCENE", handlers.onSyncScene);
    socket.on("SYNC_CHAT_HISTORY", handlers.onSyncChatHistory);
    socket.on("SYNC_CHAT_MESSAGE", handlers.onSyncChatMessage);

    return () => {
      socket.off("USER_JOINED", handlers.onUserJoined);
      socket.off("USER_LEFT", handlers.onUserLeft);
      socket.off("SYNC_DRAW", handlers.onSyncDraw);
      socket.off("SYNC_UPDATE", handlers.onSyncUpdate);
      socket.off("SYNC_DELETE", handlers.onSyncDelete);
      socket.off("SYNC_CURSOR", handlers.onSyncCursor);
      socket.off("SYNC_CLEAR", handlers.onSyncClear);
      socket.off("SYNC_SCENE", handlers.onSyncScene);
      socket.off("SYNC_CHAT_HISTORY", handlers.onSyncChatHistory);
      socket.off("SYNC_CHAT_MESSAGE", handlers.onSyncChatMessage);
      socket.disconnect();
      setSocket(null);
    };
  }, [handlers, roomId, setSocket, userId]);
}
