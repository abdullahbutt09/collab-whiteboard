import { create } from "zustand";

function updateHistory(set, get, nextElements) {
  const { elements, past } = get();
  set({
    past: [...past, elements],
    future: [],
    elements: nextElements,
  });
}

export const useBoardStore = create((set, get) => ({
  roomId: "",
  socket: null,
  userId: `user-${Math.random().toString(16).slice(2, 8)}`,
  users: [],
  cursors: {},
  elements: [],
  messages: [],
  past: [],
  future: [],
  selectedTool: "pencil",
  color: "#111111",
  strokeWidth: 2,

  setRoomId: (roomId) => set({ roomId }),
  setSocket: (socket) => set({ socket }),
  setUsers: (users) => set({ users }),
  addUser: (socketId) =>
    set((state) => ({
      users: state.users.includes(socketId) ? state.users : [...state.users, socketId],
    })),
  removeUser: (socketId) =>
    set((state) => {
      const nextCursors = { ...state.cursors };
      delete nextCursors[socketId];
      return {
        users: state.users.filter((user) => user !== socketId),
        cursors: nextCursors,
      };
    }),
  setCursor: (socketId, cursor) =>
    set((state) => ({
      cursors: {
        ...state.cursors,
        [socketId]: cursor,
      },
    })),
  setMessages: (messages) => set({ messages: messages.slice(-100) }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-100),
    })),

  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),

  setElements: (elements, options = { record: true }) => {
    if (options.record) {
      updateHistory(set, get, elements);
      return;
    }

    set({ elements });
  },

  addOrUpdateElement: (element, options = { record: true }) => {
    const current = get().elements;
    const index = current.findIndex((item) => item.id === element.id);
    const nextElements = index === -1 ? [...current, element] : current.map((item) => (item.id === element.id ? element : item));

    if (options.record) {
      updateHistory(set, get, nextElements);
      return;
    }

    set({ elements: nextElements });
  },

  deleteElement: (elementId, options = { record: true }) => {
    const nextElements = get().elements.filter((item) => item.id !== elementId);

    if (options.record) {
      updateHistory(set, get, nextElements);
      return;
    }

    set({ elements: nextElements });
  },

  clearElements: (options = { record: true }) => {
    if (options.record) {
      updateHistory(set, get, []);
      return;
    }

    set({ elements: [] });
  },

  undo: () => {
    const { past, elements, future } = get();
    if (past.length === 0) {
      return elements;
    }

    const previous = past[past.length - 1];
    set({
      elements: previous,
      past: past.slice(0, -1),
      future: [elements, ...future],
    });

    return previous;
  },

  redo: () => {
    const { future, elements, past } = get();
    if (future.length === 0) {
      return elements;
    }

    const next = future[0];
    set({
      elements: next,
      future: future.slice(1),
      past: [...past, elements],
    });

    return next;
  },
}));
