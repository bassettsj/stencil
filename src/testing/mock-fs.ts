import { FileSystem } from '../util/interfaces';
import { normalizePath } from '../compiler/util';
import * as path from 'path';


export class MockFileSystem implements FileSystem {
  d: {[filePath: string]: { isFile: boolean; isDirectory: boolean; content?: string; } } = {};

  diskWrites = 0;
  diskReads = 0;

  async copyFile(_srcPath: string, _destPath: string) {
    this.diskWrites++;
  }

  async mkdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    this.diskWrites++;

    this.d[dirPath] = {
      isDirectory: true,
      isFile: false
    };
  }

  async readdir(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;

    const filePaths = Object.keys(this.d);
    const dirs: string[] = [];

    filePaths.forEach(f => {
      const dirItem = path.relative(filePath, f).split('/')[0];
      if (!dirItem.startsWith('.') && !dirItem.startsWith('/')) {
        if (dirItem !== '' && !dirs.includes(dirItem)) {
          dirs.push(dirItem);
        }
      }
    });

    return dirs.sort();
  }

  async readFile(filePath: string) {
    return this.readFileSync(filePath);
  }

  readFileSync(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;
    if (this.d[filePath] && typeof this.d[filePath].content === 'string') {
      return this.d[filePath].content;
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }

  async rmdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    const items = Object.keys(this.d);
    items.forEach(item => {
      if (item.startsWith(dirPath + '/') || item === dirPath) {
        this.diskWrites++;
        delete this.d[item];
      }
    });
  }

  async stat(filePath: string) {
    return this.statSync(filePath);
  }

  statSync(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;
    if (this.d[filePath]) {
      const isDirectory = this.d[filePath].isDirectory;
      const isFile = this.d[filePath].isFile;
      return  {
        isDirectory: () => isDirectory,
        isFile: () => isFile
      };
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }

  async unlink(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskWrites++;
    delete this.d[filePath];
  }

  async writeFile(filePath: string, content: string) {
    return this.writeFileSync(filePath, content);
  }

  writeFileSync(filePath: string, content: string) {
    this.diskWrites++;
    this.d[filePath] = {
      isDirectory: false,
      isFile: true,
      content: content
    };
  }
}
