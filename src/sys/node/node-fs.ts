import { FileSystem } from '../../util/interfaces';


export class NodeFileSystem implements FileSystem {

  constructor(private fs: any) {}

  copyFile(src: string, dest: string) {
    return new Promise<void>((resolve, reject) => {
      const input = this.fs.createReadStream(src);
      const output = input.pipe(this.fs.createWriteStream(dest));
      input.on('error', reject);
      output.on('error', reject);
      output.on('close', resolve);
      output.on('finish', resolve);
    });
  }

  mkdir(filePath: string) {
    return new Promise<void>((resolve, reject) => {
      this.fs.mkdir(filePath, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  readdir(dirPath: string) {
    return new Promise<string[]>((resolve, reject) => {
      this.fs.readdir(dirPath, (err: any, files: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  readFile(filePath: string) {
    return new Promise<string>((resolve, reject) => {
      this.fs.readFile(filePath, 'utf-8', (err: any, content: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  readFileSync(filePath: string) {
    return this.fs.readFileSync(filePath, 'utf-8');
  }

  rmdir(filePath: string) {
    return new Promise<void>((resolve, reject) => {
      this.fs.rmdir(filePath, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  stat(itemPath: string) {
    return new Promise<any>((resolve, reject) => {
      this.fs.stat(itemPath, (err: any, stats: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats);
        }
      });
    });
  }

  statSync(itemPath: string) {
    return this.fs.statSync(itemPath);
  }

  unlink(filePath: string) {
    return new Promise<void>((resolve, reject) => {
      this.fs.unlink(filePath, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  writeFile(filePath: string, content: string) {
    return new Promise<void>((resolve, reject) => {
      this.fs.writeFile(filePath, content, { encoding: 'utf-8' }, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  writeFileSync(filePath: string, content: string) {
    return this.fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
  }

}
