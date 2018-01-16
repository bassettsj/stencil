import { InMemoryFileSystem } from '../util/in-memory-fs';
import { Path } from '../util/interfaces';


export class Cache {

  constructor(private fs: InMemoryFileSystem, private path: Path, private tmpDir: string) {}

  async get(key: string) {
    let result: string;
    try {
      result = await this.fs.readFile(this.cacheKey(key));
    } catch (e) {
      result = null;
    }
    return result;
  }

  async put(key: string, value: string) {
    let result: boolean;
    try {
      await this.fs.writeFile(this.cacheKey(key), value);
      result = true;
    } catch (e) {
      result = false;
    }
    return result;
  }

  commit() {
    return this.fs.commit();
  }

  private cacheKey(key: string) {
    return this.path.join(this.tmpDir, key);
  }

}
