import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const emptyData = () => ({
  version: 1,
  users: [],
  sessions: [],
  keys: [],
  usage: [],
  conversations: [],
  passwordResets: [],
});

export class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = emptyData();
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      this.data = { ...emptyData(), ...parsed };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.persist();
    }
    return this;
  }

  async update(mutator) {
    const operation = this.writeQueue.then(async () => {
      const draft = structuredClone(this.data);
      const result = await mutator(draft);
      await this.persist(draft);
      this.data = draft;
      return result;
    });
    this.writeQueue = operation.then(() => { this.lastWriteError = null; }, (error) => { this.lastWriteError = error; });
    return operation;
  }

  async appendConversationMessages(userId, messages) {
    let result;
    await this.update((data) => {
      let stored = data.conversations.find((item) => item.userId === userId);
      if (!stored) {
        stored = { id: randomUUID(), userId, messages: [], createdAt: new Date().toISOString() };
        data.conversations.push(stored);
      }
      stored.messages.push(...messages);
      if (stored.messages.length > 100) stored.messages = stored.messages.slice(-100);
      stored.updatedAt = new Date().toISOString();
      result = stored;
    });
    return result;
  }

  async appendUsageEvent(event) {
    await this.update((data) => {
      data.usage.unshift(event);
      const retainedIds = new Set(
        data.usage
          .filter((item) => item.userId === event.userId)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 10000)
          .map((item) => item.id),
      );
      data.usage = data.usage.filter((item) => item.userId !== event.userId || retainedIds.has(item.id));
    });
  }

  async touchApiKey(id, timestamp = new Date().toISOString()) {
    await this.update((data) => {
      const key = data.keys.find((item) => item.id === id);
      if (key && (!key.lastUsedAt || Date.parse(key.lastUsedAt) <= Date.parse(timestamp) - 60_000)) key.lastUsedAt = timestamp;
    });
  }

  async revokeApiKey(id, userId, timestamp = new Date().toISOString()) {
    let revoked = false;
    await this.update((data) => {
      const key = data.keys.find((item) => item.id === id && item.userId === userId && !item.revokedAt);
      if (key) { key.revokedAt = timestamp; revoked = true; }
    });
    return revoked;
  }

  async deleteSession(id) {
    await this.update((data) => {
      data.sessions = data.sessions.filter((session) => session.id !== id);
    });
  }

  async createApiKey(key, now = Date.now()) {
    let created = false;
    await this.update((data) => {
      const active = data.keys.filter((item) => item.userId === key.userId && !item.revokedAt && (!item.expiresAt || Date.parse(item.expiresAt) > now));
      if (active.length >= 10) return;
      data.keys.push(key);
      created = true;
    });
    return created;
  }

  async persist(data = this.data) {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  async cleanExpiredSessions(now = Date.now()) {
    await this.update((data) => {
      data.sessions = data.sessions.filter((session) => Date.parse(session.expiresAt) > now);
    });
  }
}
