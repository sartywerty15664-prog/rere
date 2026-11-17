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
      const result = await mutator(this.data);
      await this.persist();
      return result;
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async persist() {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  cleanExpiredSessions(now = Date.now()) {
    this.data.sessions = this.data.sessions.filter((session) => Date.parse(session.expiresAt) > now);
  }
}
