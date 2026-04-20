import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WhiteboardCanvas } from "../canvas/WhiteboardCanvas";
import { ChatPanel } from "../components/ChatPanel";
import { CursorLayer } from "../components/CursorLayer";
import { Toolbar } from "../components/Toolbar";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { useBoardStore } from "../store/useBoardStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function CanvasPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    userId,
    socket,
    users,
    elements,
    messages,
    cursors,
    selectedTool,
    color,
    strokeWidth,
    setRoomId,
    setUsers,
    setMessages,
    addUser,
    addMessage,
    removeUser,
    setCursor,
    setSelectedTool,
    setColor,
    setElements,
    addOrUpdateElement,
    deleteElement,
    clearElements,
    undo,
    redo,
  } = useBoardStore();

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    setRoomId(roomId);
  }, [navigate, roomId, setRoomId]);

  useEffect(() => {
    async function bootstrap() {
      if (!roomId) {
        return;
      }

      const [roomResponse, canvasResponse] = await Promise.all([
        fetch(`${API_BASE}/room/${roomId}`),
        fetch(`${API_BASE}/canvas/${roomId}`),
      ]);

      if (roomResponse.ok) {
        const room = await roomResponse.json();
        setUsers(room.users || []);
        setMessages(room.chatMessages || []);
      }

      if (canvasResponse.ok) {
        const canvas = await canvasResponse.json();
        setElements(canvas.elements || [], { record: false });
      }
    }

    bootstrap();
  }, [roomId, setElements, setMessages, setUsers]);

  const handlers = useMemo(
    () => ({
      onUserJoined: ({ socketId }) => addUser(socketId),
      onUserLeft: ({ socketId }) => removeUser(socketId),
      onSyncDraw: ({ element, elements: incomingElements }) => {
        if (Array.isArray(incomingElements)) {
          setElements(incomingElements, { record: false });
          return;
        }

        if (element) {
          addOrUpdateElement(element, { record: false });
        }
      },
      onSyncUpdate: ({ element }) => {
        if (element) {
          addOrUpdateElement(element, { record: false });
        }
      },
      onSyncDelete: ({ elementId }) => {
        if (elementId) {
          deleteElement(elementId, { record: false });
        }
      },
      onSyncCursor: ({ socketId, cursor }) => {
        setCursor(socketId, cursor);
      },
      onSyncClear: () => {
        clearElements({ record: false });
      },
      onSyncChatHistory: ({ messages: incomingMessages }) => {
        if (Array.isArray(incomingMessages)) {
          setMessages(incomingMessages);
        }
      },
      onSyncChatMessage: ({ message }) => {
        if (message) {
          addMessage(message);
        }
      },
    }),
    [addMessage, addOrUpdateElement, addUser, clearElements, deleteElement, removeUser, setCursor, setElements, setMessages]
  );

  useRoomSocket(roomId, handlers);

  async function handleSave() {
    await fetch(`${API_BASE}/canvas/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, elements }),
    });
  }

  function handleUndo() {
    const next = undo();
    socket?.emit("UNDO", { roomId, elements: next });
  }

  function handleRedo() {
    const next = redo();
    socket?.emit("REDO", { roomId, elements: next });
  }

  function handleClear() {
    clearElements();
    socket?.emit("CLEAR_CANVAS", { roomId });
  }

  function handleSendMessage(text) {
    socket?.emit("SEND_CHAT_MESSAGE", {
      roomId,
      message: {
        id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        userId,
        text,
        createdAt: new Date().toISOString(),
      },
    });
  }

  return (
    <main className="min-h-screen bg-zinc-900 px-3 py-3 md:px-6 md:py-6">
      <section className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-zinc-300">
          <h1 className="font-['Space_Grotesk',sans-serif] text-xl font-semibold text-white md:text-2xl">CollabBoard Room</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded bg-zinc-800 px-2 py-1">Room: {roomId}</span>
            <span className="rounded bg-zinc-800 px-2 py-1">Users: {users.length + 1}</span>
            <span className="rounded bg-zinc-800 px-2 py-1">You: {userId}</span>
          </div>
        </div>

        <Toolbar
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          color={color}
          setColor={setColor}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSave={handleSave}
        />

        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <WhiteboardCanvas
              elements={elements}
              roomId={roomId}
              selectedTool={selectedTool}
              color={color}
              strokeWidth={strokeWidth}
              userId={userId}
              socket={socket}
              addOrUpdateElement={addOrUpdateElement}
              setElements={setElements}
              deleteElement={deleteElement}
            />
            <CursorLayer cursors={cursors} />
          </div>

          <ChatPanel userId={userId} messages={messages} onSendMessage={handleSendMessage} />
        </div>
      </section>
    </main>
  );
}
