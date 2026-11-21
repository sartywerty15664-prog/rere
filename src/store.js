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
