declare global {
  interface Liveblocks {
    Presence: Record<string, never>;
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
    Storage: {
      title: string;
    };
  }
}

export {};
