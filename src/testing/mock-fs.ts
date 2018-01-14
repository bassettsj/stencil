import { FileSystem } from '../util/interfaces';
import { normalizePath } from '../compiler/util';
import * as path from 'path';


export class MockFileSystem implements FileSystem {
  data: {[filePath: string]: { isFile: boolean; isDirectory: boolean; content?: string; } } = {};

  diskWrites = 0;
  diskReads = 0;

  async copyFile(_srcPath: string, _destPath: string) {
    this.diskWrites++;
  }

  async mkdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    this.diskWrites++;

    this.data[dirPath] = {
      isDirectory: true,
      isFile: false
    };
  }

  async readdir(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;

    const filePaths = Object.keys(this.data);
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
    if (this.data[filePath] && typeof this.data[filePath].content === 'string') {
      return this.data[filePath].content;
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }

  async rmdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    const items = Object.keys(this.data);
    items.forEach(item => {
      if (item.startsWith(dirPath + '/') || item === dirPath) {
        this.diskWrites++;
        delete this.data[item];
      }
    });
  }

  async stat(filePath: string) {
    return this.statSync(filePath);
  }

  statSync(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;
    if (this.data[filePath]) {
      const isDirectory = this.data[filePath].isDirectory;
      const isFile = this.data[filePath].isFile;
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
    delete this.data[filePath];
  }

  async writeFile(filePath: string, content: string) {
    return this.writeFileSync(filePath, content);
  }

  writeFileSync(filePath: string, content: string) {
    this.diskWrites++;
    this.data[filePath] = {
      isDirectory: false,
      isFile: true,
      content: content
    };
  }
}
