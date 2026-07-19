export interface UserMeta {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
}

export interface UserRecord extends UserMeta {}

const globalUserStore = globalThis as typeof globalThis & {
  __docUsers?: UserRecord[];
};

// Route handlers can load this module in separate bundles during development.
// Keep one registry for the process so auth and mention search see the same users.
const USER_INFO = (globalUserStore.__docUsers ??= []);

function stripSensitiveFields(user: UserRecord) {
  return { ...user };
}

export function getUser(id: string) {
  const user = USER_INFO.find((u) => u.id === id);
  return user ? stripSensitiveFields(user) : null;
}

export function getUserRecord(id: string) {
  return USER_INFO.find((u) => u.id === id) || null;
}

export function getUserByUsername(username: string) {
  return USER_INFO.find((u) => u.id.toLowerCase() === username.toLowerCase()) || null;
}

export function updateUserAvatar(id: string, avatar: string) {
  const user = USER_INFO.find((u) => u.id === id);
  if (!user) {
    return null;
  }

  user.info.avatar = avatar;
  return stripSensitiveFields(user);
}

export function getUsers() {
  return USER_INFO.map(stripSensitiveFields);
}

export function addUser(user: UserRecord) {
  USER_INFO.push(user);
  return user;
}

export function upsertUser(user: UserRecord) {
  const existing = getUserRecord(user.id);
  if (existing) {
    existing.info = { ...existing.info, ...user.info };
    return stripSensitiveFields(existing);
  }

  return addUser(user);
}
