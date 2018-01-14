import { InMemoryFileSystem } from '../in-memory-fs';
import { MockFileSystem } from '../../testing/mock-fs';
import * as path from 'path';


describe(`in-memory-fs`, () => {

  it(`access true`, async () => {
    await fs.writeFile(`/file`, `content`);
    await fs.commit();
    fs.clearCache();

    let result = await fs.access(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    result = await fs.access(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`access false`, async () => {
    let result = await fs.access(`/file`);
    await fs.commit();

    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);

    result = await fs.access(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`accessSync true`, async () => {
    await fs.writeFile(`/file`, `content`);
    await fs.commit();
    fs.clearCache();

    let result = fs.accessSync(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    result = fs.accessSync(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`accessSync false`, async () => {
    let result = fs.accessSync(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);

    result = fs.accessSync(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`copy, of dir`, async () => {
    await fs.writeFile(`/src/file1.js`, '1');
    await fs.writeFile(`/src/file2.js`, '2');
    await fs.commit();

    await fs.copy(`/src`, `/some/path`);

    let i = await fs.commit();
    expect(i.filesCopied[0]).toBe(`/some/path/file1.js`);
    expect(i.filesCopied[1]).toBe(`/some/path/file2.js`);
    expect(i.filesCopied.length).toBe(2);
  });

  it(`copy, of file`, async () => {
    await fs.writeFile(`/src/file1.js`, '1');
    await fs.writeFile(`/src/file2.js`, '2');
    await fs.commit();

    await fs.copy(`/src/file1.js`, `/some/path/file1.js`);

    let i = await fs.commit();
    expect(i.filesCopied[0]).toBe(`/some/path/file1.js`);
    expect(i.filesCopied.length).toBe(1);
  });

  it(`copyDir`, async () => {
    await fs.writeFile(`/src/file1.js`, '1');
    await fs.writeFile(`/src/file2.js`, '2');
    await fs.writeFile(`/other-dir/file3.js`, '3');
    await fs.commit();

    await fs.copyDir(`/src`, `/some/path`);

    let i = await fs.commit();
    expect(i.filesCopied[0]).toBe(`/some/path/file1.js`);
    expect(i.filesCopied[1]).toBe(`/some/path/file2.js`);
    expect(i.filesCopied.length).toBe(2);
  });

  it(`copyFile`, async () => {
    await fs.writeFile(`/src/file.js`, 'content');
    await fs.commit();

    await fs.copyFile(`/src/file.js`, `/some/path/whatever.js`);

    let i = await fs.commit();
    expect(i.filesCopied[0]).toBe(`/some/path/whatever.js`);
    expect(i.filesCopied.length).toBe(1);
  });

  it(`copyFile, do copy w/ filter`, async () => {
    await fs.writeFile(`/src/file.js`, 'content');
    await fs.commit();

    await fs.copyFile(`/src/file.js`, `/some/path/whatever.js`, { filter: (src, dest) => {
      return src === `/src/file.js` && dest === `/some/path/whatever.js`;
    }});

    let i = await fs.commit();
    expect(i.filesCopied[0]).toBe(`/some/path/whatever.js`);
    expect(i.filesCopied.length).toBe(1);
  });

  it(`copyFile, do not copy w/ filter`, async () => {
    await fs.writeFile(`/src/file.js`, 'content');
    await fs.commit();

    await fs.copyFile(`/src/file.js`, `/some/path/whatever.js`, { filter: () => {
      return false;
    }});

    let i = await fs.commit();
    expect(i.filesWritten.length).toBe(0);
  });

  it(`readdir always does disk reads`, async () => {
    let files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(1);
    files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(2);
  });

  it(`readdir`, async () => {
    await fs.writeFile(`/dir1/file1.js`, ``);
    await fs.writeFile(`/dir1/file2.js`, ``);
    await fs.writeFile(`/dir1/dir2/file1.js`, ``);
    await fs.writeFile(`/dir1/dir2/file2.js`, ``);
    await fs.writeFile(`/dir2/dir3/file1.js`, ``);
    await fs.writeFile(`/dir2/dir3/dir4/file2.js`, ``);
    await fs.commit();
    fs.clearCache();
    mockFs.diskReads = 0;

    let files = await fs.readdir(`/dir1`);
    expect(files.length).toBe(3);
    expect(files[0]).toBe(`dir2`);
    expect(files[1]).toBe(`file1.js`);
    expect(files[2]).toBe(`file2.js`);
    expect(mockFs.diskReads).toBe(1);
    mockFs.diskReads = 0;

    expect(await fs.access(`/dir1/file1.js`)).toBe(true);
    expect(await fs.access(`/dir1/file2.js`)).toBe(true);
    expect(await fs.access(`/dir1/dir2`)).toBe(true);
    expect(mockFs.diskReads).toBe(0);
    mockFs.diskReads = 0;

    expect(await fs.access(`/dir2/dir3/dir4/file2.js`)).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    const statsFile = await fs.stat(`/dir1/file1.js`);
    expect(statsFile.isFile()).toBe(true);

    const statsDir = await fs.stat(`/dir2`);
    expect(statsDir.isDirectory()).toBe(true);
  });

  it(`readFile with diskRead and throw error for no file`, async () => {
    try {
      await fs.readFile(`/dir/file.js`);
      await fs.commit();
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`readFile with diskRead`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();
    fs.clearCache();

    let content: string;
    try {
      content = await fs.readFile(`/dir/file.js`);
    } catch (e) {
      expect(true).toBe(false);
    }
    await fs.commit();
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);

    content = await fs.readFile(`/dir/file.js`);
    await fs.commit();
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);
  });

  it(`readFile with cache read`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();
    expect(mockFs.diskWrites).toBe(2);

    let content = await fs.readFile(`/dir/file.js`);
    await fs.commit();
    expect(mockFs.diskReads).toBe(0);
    expect(content).toBe(`content`);
  });

  it(`readFileSync with diskRead and throw error for no file`, async () => {
    try {
      fs.readFileSync(`/dir/file.js`);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`readFileSync with diskRead`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();
    fs.clearCache();

    let content: string;
    try {
      content = fs.readFileSync(`/dir/file.js`);
    } catch (e) {
      expect(true).toBe(false);
    }

    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);

    content = fs.readFileSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);
  });

  it(`readFileSync with cache read`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();

    expect(mockFs.diskWrites).toBe(2);

    let content = fs.readFileSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    expect(content).toBe(`content`);
  });

  it(`removeFile`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();

    expect(await fs.access(`/dir/file.js`)).toBe(true);
    await fs.commit();

    await fs.removeFile(`/dir/file.js`);
    await fs.commit();

    expect(await fs.access(`/dir/file.js`)).toBe(false);
  });

  it(`removeDir`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.commit();

    expect(await fs.access(`/dir/file.js`)).toBe(true);

    await fs.removeDir(`/dir`);
    await fs.commit();

    expect(await fs.access(`/dir/file.js`)).toBe(false);
  });

  it(`stat with disk read`, async () => {
    try {
      await fs.stat(`/dir/file.js`);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`stat with cache read`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    await fs.stat(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    await fs.stat(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
  });

  it(`statSync with disk read`, async () => {
    try {
      fs.statSync(`/dir/file.js`);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`statSync with cache read`, async () => {
    await fs.writeFile(`/dir/file.js`, `content`);
    fs.statSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    fs.statSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
  });

  it(`writeFile with queued disk write`, async () => {
    await fs.writeFile(`/dir/file1.js`, `content`);
    expect(mockFs.diskWrites).toBe(0);
    await fs.writeFile(`/dir/file2.js`, `content`);
    expect(mockFs.diskWrites).toBe(0);

    const content = await fs.readFile(`/dir/file2.js`);
    expect(content).toBe(`content`);
    expect(mockFs.diskReads).toBe(0);

    let i = await fs.commit();
    expect(mockFs.diskWrites).toBe(3);
    expect(i.filesWritten.length).toBe(2);
    expect(i.filesWritten[0]).toBe(`/dir/file1.js`);
    expect(i.filesWritten[1]).toBe(`/dir/file2.js`);

    mockFs.diskWrites = 0;
    i = await fs.commit();
    expect(mockFs.diskWrites).toBe(0);
    expect(i.filesWritten.length).toBe(0);
  });

  it(`writeFile doesnt rewrite same content`, async () => {
    await fs.writeFile(`/dir/file1.js`, `1`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);

    let i = await fs.commit();
    expect(mockFs.diskWrites).toBe(3);
    expect(i.filesWritten.length).toBe(2);
    expect(i.filesWritten[0]).toBe(`/dir/file1.js`);
    expect(i.filesWritten[1]).toBe(`/dir/file2.js`);
  });

  it(`writeFile inMemoryOnly`, async () => {
    mockFs.diskWrites = 0;
    await fs.writeFile(`/dir/file1.js`, `content`, { inMemoryOnly: true });
    expect(mockFs.diskWrites).toBe(0);

    const content = await fs.readFile(`/dir/file1.js`);
    expect(content).toBe(`content`);
  });

  it(`clearFileCache`, async () => {
    await fs.writeFile(`/dir/file1.js`, `1`);
    await fs.writeFile(`/dir/file2.js`, `2`);

    fs.clearFileCache(`/dir/file2.js`);

    expect(await fs.access(`/dir/file1.js`)).toBe(true);
    expect(await fs.access(`/dir/file2.js`)).toBe(false);
  });

  it(`clearDirCache`, async () => {
    await fs.writeFile(`/dir1/file1.js`, `1`);
    await fs.writeFile(`/dir1/file2.js`, `2`);
    await fs.writeFile(`/dir1/dir2/file3.js`, `3`);
    await fs.writeFile(`/dir3/file4.js`, `4`);

    fs.clearDirCache(`/dir1`);

    expect(await fs.access(`/dir1/file1.js`)).toBe(false);
    expect(await fs.access(`/dir1/file2.js`)).toBe(false);
    expect(await fs.access(`/dir1/dir2/file3.js`)).toBe(false);
    expect(await fs.access(`/dir3/file4.js`)).toBe(true);
  });

  it(`clearDirCache windows`, async () => {
    await fs.writeFile(`C:\\dir1\\file1.js`, `1`);
    await fs.writeFile(`C:\\dir1\\file2.js`, `2`);
    await fs.writeFile(`C:\\dir1\\dir2\\file3.js`, `3`);
    await fs.writeFile(`C:\\dir3\\file4.js`, `4`);

    fs.clearDirCache(`C:\\dir1`);

    expect(await fs.access(`C:\\dir1\\file1.js`)).toBe(false);
    expect(await fs.access(`C:\\dir1\\file2.js`)).toBe(false);
    expect(await fs.access(`C:\\dir1\\dir2\\file3.js`)).toBe(false);
    expect(await fs.access(`C:\\dir3\\file4.js`)).toBe(true);
  });


  var mockFs: MockFileSystem;
  var fs: InMemoryFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    fs = new InMemoryFileSystem(mockFs, path);
  });

});
