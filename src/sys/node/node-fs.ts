import { InMemoryFileSystem, FileSystem, FileSystemWriteOptions } from '../../util/interfaces';
import { normalizePath } from '../../compiler/util';


// for whatever reasons, something in
// node/whatever crashes with memory issues
// when using async/await. Whatever, promies it is
export class NodeFileSystem implements InMemoryFileSystem {
  private d: { [filePath: string]: FsItem; } = {};
  private ensuredDirs: string[] = [];

  constructor(public disk: FileSystem, private nodePath: any) {}

  async access(filePath: string) {
    filePath = normalizePath(filePath);
    if (this.d[filePath]) {
      return this.d[filePath].exists;
    }

    let hasAccess = false;
    try {
      const s = await this.stat(filePath);
      this.d[filePath] = {
        exists: true,
        isDirectory: s.isDirectory(),
        isFile: s.isFile()
      };
      hasAccess = true;

    } catch (e) {
      this.d[filePath] = {
        exists: false
      };
    }

    return hasAccess;
  }

  accessSync(filePath: string) {
    filePath = normalizePath(filePath);
    if (this.d[filePath]) {
      return this.d[filePath].exists;
    }

    let hasAccess = false;
    try {
      const s = this.statSync(filePath);
      this.d[filePath] = {
        exists: true,
        isDirectory: s.isDirectory(),
        isFile: s.isFile()
      };
      hasAccess = true;

    } catch (e) {
      this.d[filePath] = {
        exists: false,
        isDirectory: false,
        isFile: false
      };
    }

    return hasAccess;
  }

  async copy(src: string, dest: string, opts?: { filter?: (src: string, dest?: string) => boolean; }) {
    src = normalizePath(src);
    dest = normalizePath(dest);
    return this.disk.copy(src, dest, opts);
  }

  async emptyDir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    this.clearDirCache(dirPath);
    return this.disk.emptyDir(dirPath);
  }

  async ensureDir(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (this.ensuredDirs.indexOf(dirPath) > -1) {
      return;
    }
    this.ensuredDirs.push(dirPath);

    this.d[dirPath] = {
      exists: true,
      isDirectory: true,
      isFile: false
    };
    return this.disk.ensureDir(dirPath);
  }

  ensureDirSync(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (this.ensuredDirs.indexOf(dirPath) > -1) {
      return;
    }
    this.ensuredDirs.push(dirPath);

    this.d[dirPath] = {
      exists: true,
      isDirectory: true,
      isFile: false
    };
   return this.disk.ensureDirSync(dirPath);
  }

  async ensureFile(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (!this.d[dirPath] || !this.d[dirPath].exists) {
      await this.disk.ensureFile(dirPath);
      this.d[dirPath] = {
        exists: true,
        isDirectory: false,
        isFile: true
      };
    }
  }

  /**
   * Returns true if the content has changed
   * and it caches this read
   */
  async isChangedFile(filePath: string) {
    filePath = normalizePath(filePath);

    const fileContent = await this.disk.readFile(filePath, 'utf-8');

    let isChanged = true;

    const f = this.d[filePath] = this.d[filePath] || {};
    if (f.exists && f.fileContent === fileContent) {
      isChanged = false;
    }

    f.exists = true;
    f.isFile = true;
    f.isDirectory = false;
    f.fileContent = fileContent;

    return isChanged;
  }

  async readdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    const dirItems = await this.disk.readdir(dirPath);
    this.d[dirPath] = {
      exists: true,
      isFile: false,
      isDirectory: true
    };
    dirItems.forEach(f => {
      const dirItem = this.nodePath.join(dirPath, f);
      this.d[dirItem] = {
        exists: true
      };
    });
    return dirItems;
  }

  async readFile(filePath: string) {
    filePath = normalizePath(filePath);
    let f = this.d[filePath];
    if (f && f.exists && typeof f.fileContent === 'string') {
      return f.fileContent;
    }

    const fileContent = await this.disk.readFile(filePath, 'utf-8');

    f = this.d[filePath] = this.d[filePath] || {};
    f.exists = true;
    f.isFile = true;
    f.isDirectory = false;
    f.fileContent = fileContent;

    return fileContent;
  }

  readFileSync(filePath: string) {
    filePath = normalizePath(filePath);
    let f = this.d[filePath];
    if (f && f.exists && typeof f.fileContent === 'string') {
      return f.fileContent;
    }

    const fileContent = this.disk.readFileSync(filePath, 'utf-8');

    f = this.d[filePath] = this.d[filePath] || {};
    f.exists = true;
    f.isFile = true;
    f.isDirectory = false;
    f.fileContent = fileContent;

    return fileContent;
  }

  async stat(itemPath: string) {
    itemPath = normalizePath(itemPath);

    let f = this.d[itemPath];
    if (!f || typeof f.isDirectory !== 'boolean' || typeof f.isFile !== 'boolean') {
      const s = await this.disk.stat(itemPath);
      this.d[itemPath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
      return s;
    }

    return {
      isFile: () => f.isFile,
      isDirectory: () => f.isDirectory
    };
  }

  statSync(itemPath: string) {
    itemPath = normalizePath(itemPath);

    let f = this.d[itemPath];
    if (!f || typeof f.isDirectory !== 'boolean' || typeof f.isFile !== 'boolean') {
      const s = this.disk.statSync(itemPath);
      f = this.d[itemPath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
    }

    return {
      isFile: () => f.isFile,
      isDirectory: () => f.isDirectory
    };
  }

  async writeFile(filePath: string, content: string, opts?: FileSystemWriteOptions) {
    filePath = normalizePath(filePath);

    const d = this.d[filePath] = this.d[filePath] || {};
    d.exists = true;
    d.isFile = true;
    d.isDirectory = false;

    if (opts && opts.inMemoryOnly) {
      // we don't want to actually write this to disk
      // just keep it in memory
      if (!d.queueWriteToDisk) {
        // we only want this in memory and
        // it wasn't already queued to be written
        d.queueWriteToDisk = false;
      }
      d.fileContent = content;

    } else {
      // we want to write this to disk (eventually)
      // but only if the content is different
      // from our existing cached content
      if (!d.queueWriteToDisk && d.fileContent !== content) {
        // not already queued to be written
        // and the content is different
        d.queueWriteToDisk = true;
      }
      d.fileContent = content;
    }
  }

  writeFileSync(filePath: string, content: string, opts?: FileSystemWriteOptions) {
    filePath = normalizePath(filePath);

    if (opts && opts.clearFileCache) {
      delete this.d[filePath];

    } else {
      const f = this.d[filePath];
      if (f && f.fileContent === content) {
        return;
      }

      const d = this.d[filePath] = this.d[filePath] || {};
      d.exists = true;
      d.isFile = true;
      d.isDirectory = false;
      d.fileContent = content;
      d.queueWriteToDisk = false;
    }

    if (!opts || !opts.inMemoryOnly) {
      this.ensureDirSync(this.nodePath.dirname(filePath));
      this.disk.writeFileSync(filePath, content);
    }
  }

  async commit() {
    const filesToWrite: { filePath: string, fileContent: string }[] = [];
    const dirs: string[] = [];

    Object.keys(this.d).forEach(filePath => {
      const fsItem = this.d[filePath];
      const queueWriteToDisk = fsItem.queueWriteToDisk;
      fsItem.queueWriteToDisk = false;

      if (!queueWriteToDisk) {
        return;
      }

      filesToWrite.push({
        filePath: filePath,
        fileContent: fsItem.fileContent
      });

      const dir = this.nodePath.dirname(filePath);
      if (dirs.indexOf(dir) === -1) {
        dirs.push(dir);
      }
    });

    // ensure all the directories we need are created
    await Promise.all(dirs.map(dir => this.ensureDir(dir)));

    const wroteFiles: string[] = [];

    await Promise.all(filesToWrite.map(fileToWrite => {
      wroteFiles.push(fileToWrite.filePath);
      return this.disk.writeFile(fileToWrite.filePath, fileToWrite.fileContent);
    }));

    return wroteFiles;
  }

  clearDirCache(dirPath: string) {
    dirPath = normalizePath(dirPath);

    const filePaths = Object.keys(this.d);

    filePaths.forEach(f => {
      const filePath = this.nodePath.relative(dirPath, f).split('/')[0];
      if (!filePath.startsWith('.') && !filePath.startsWith('/')) {
        this.clearFileCache(f);
      }
    });
  }

  clearFileCache(filePath: string) {
    filePath = normalizePath(filePath);
    delete this.d[filePath];
  }

  clearCache() {
    this.d = {};
    this.ensuredDirs.length = 0;
  }
}


interface FsItem {
  fileContent?: string;
  isFile?: boolean;
  isDirectory?: boolean;
  exists?: boolean;
  queueWriteToDisk?: boolean;
}
