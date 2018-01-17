import { Config } from '../util/interfaces';
import { InMemoryFileSystem } from '../util/in-memory-fs';


export class Cache {
  private failedGets = 0;

  constructor(private config: Config, private cacheFs: InMemoryFileSystem, private tmpDir: string) {
    if (config.enableCache) {
      config.logger.debug(`cache enabled, tmpdir: ${tmpDir}`);

    } else {
      config.logger.debug(`cache disabled, empty tmpdir: ${tmpDir}`);
      cacheFs.emptyDir(tmpDir);
      cacheFs.commit();
    }
  }

  async get(key: string) {
    if (!this.config.enableCache) {
      return null;
    }

    if (this.failedGets >= MAX_FAILED_GETS) {
      if (this.failedGets === MAX_FAILED_GETS) {
        this.config.logger.debug(`cache had ${this.failedGets} failed gets, skip cache disk reads for remander of build`);
      }
      return null;
    }

    let result: string;
    try {
      result = await this.cacheFs.readFile(this.getCacheFilePath(key));
      this.failedGets = 0;

    } catch (e) {
      this.failedGets++;
      result = null;
    }

    return result;
  }

  async put(key: string, value: string) {
    if (!this.config.enableCache) {
      return false;
    }

    let result: boolean;

    try {
      await this.cacheFs.writeFile(this.getCacheFilePath(key), value);
      result = true;
    } catch (e) {
      result = false;
    }

    return result;
  }

  createKey(domain: string, content: string) {
    if (!this.config.enableCache) {
      return '';
    }
    return domain + '_' + this.config.sys.generateContentHash(content, 32);
  }

  async commit() {
    if (this.config.enableCache) {
      this.failedGets = 0;
      await this.cacheFs.commit();
    }
  }

  clear() {
    this.cacheFs.clearCache();
  }

  private getCacheFilePath(key: string) {
    return this.config.sys.path.join(this.tmpDir, key);
  }

}

const MAX_FAILED_GETS = 20;
