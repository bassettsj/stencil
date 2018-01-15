import { FsItems, FsCopyFileTask } from '../interfaces';
import { InMemoryFileSystem, getCommitInstructions } from '../in-memory-fs';
import { MockFileSystem } from '../../testing/mock-fs';
import * as path from 'path';
import { normalizePath } from '../../compiler/util';


describe(`in-memory-fs, getCommitInstructions`, () => {

  it(`dirsToDelete, sort longest to shortest, windows`, () => {
    const root = normalizePath(`C:\\`);
    const dir1 = normalizePath(`C:\\dir1\\`);
    const dir2 = normalizePath(`C:\\dir1\\dir2\\`);
    const dir3 = normalizePath(`C:\\dir1\\dir2\\dir3\\`);
    d[root] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir2] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir3] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir1] = { queueDeleteFromDisk: true, isDirectory: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([`C:/dir1/dir2/dir3`, `C:/dir1/dir2`, `C:/dir1`]);
    expect(i.dirsToEnsure).toEqual([]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`C:/dir1`].queueDeleteFromDisk).toBe(false);
    expect(d[`C:/dir1/dir2`].queueDeleteFromDisk).toBe(false);
    expect(d[`C:/dir1/dir2/dir3`].queueDeleteFromDisk).toBe(false);
  });

  it(`dirsToDelete, sort longest to shortest, unix`, () => {
    const root = normalizePath(`/`);
    const dir1 = normalizePath(`/dir1`);
    const dir2 = normalizePath(`/dir1/dir2/`);
    const dir3 = normalizePath(`/dir1/dir2/dir3/`);
    d[root] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir2] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir1] = { queueDeleteFromDisk: true, isDirectory: true };
    d[dir3] = { queueDeleteFromDisk: true, isDirectory: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([`/dir1/dir2/dir3`, `/dir1/dir2`, `/dir1`]);
    expect(i.dirsToEnsure).toEqual([]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1/dir2`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1/dir2/dir3`].queueDeleteFromDisk).toBe(false);
  });

  it(`ensure dirs, sort shortest to longest, windows`, () => {
    const file2 = normalizePath(`C:\\dir1\\dir2\\dir3\\file2.js`);
    const dir1 = normalizePath(`C:\\dir1\\`);
    const file1 = normalizePath(`C:\\dir1\\dir2\\file1.js`);
    d[file2] = { queueWriteToDisk: true, isFile: true };
    d[dir1] = { queueWriteToDisk: true, isDirectory: true };
    d[file1] = { queueWriteToDisk: true, isFile: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([`C:/dir1/dir2/dir3/file2.js`, `C:/dir1/dir2/file1.js`]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`C:/dir1`, `C:/dir1/dir2`, `C:/dir1/dir2/dir3`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`C:/dir1`].queueDeleteFromDisk).toBe(false);
    expect(d[`C:/dir1/dir2/file1.js`].queueDeleteFromDisk).toBe(false);
    expect(d[`C:/dir1/dir2/dir3/file2.js`].queueDeleteFromDisk).toBe(false);
  });

  it(`ensure dirs, sort shortest to longest`, () => {
    d[`/`] = { queueWriteToDisk: true, isDirectory: true };
    d[`/dir1/dir2/dir3/file2.js`] = { queueWriteToDisk: true, isFile: true };
    d[`/dir1`] = { queueWriteToDisk: true, isDirectory: true };
    d[`/dir1/dir2/file1.js`] = { queueWriteToDisk: true, isFile: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([`/dir1/dir2/dir3/file2.js`, `/dir1/dir2/file1.js`]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir1`, `/dir1/dir2`, `/dir1/dir2/dir3`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1/dir2/file1.js`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1/dir2/dir3/file2.js`].queueDeleteFromDisk).toBe(false);
  });

  it(`copyFile task ensure dir`, () => {
    copyFileTasks.push({
      src: `/dir/file1.js`,
      dest: `/dir2/file2.js`
    });
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir2`]);
    expect(i.copyFileTasks.length).toEqual(1);
  });

  it(`do not delete a files/directory if we also want to ensure it`, () => {
    d[`/dir1/file1.js`] = { queueWriteToDisk: true, queueDeleteFromDisk: true, isFile: true };
    d[`/dir1`] = { queueDeleteFromDisk: true, isDirectory: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([`/dir1/file1.js`]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir1`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1/file1.js`].queueWriteToDisk).toBe(false);
  });

  it(`queueDeleteFromDisk`, () => {
    d[`/`] = { queueDeleteFromDisk: true, isDirectory: true };
    d[`/dir1`] = { queueDeleteFromDisk: true, isDirectory: true };
    d[`/dir1/file1.js`] = { queueDeleteFromDisk: true, isFile: true };
    d[`/dir2/file2.js`] = { queueDeleteFromDisk: true, isFile: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([`/dir1/file1.js`, `/dir2/file2.js`]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([`/dir1`]);
    expect(i.dirsToEnsure).toEqual([]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1/file1.js`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir2/file2.js`].queueDeleteFromDisk).toBe(false);
    expect(d[`/dir1`].queueDeleteFromDisk).toBe(false);
  });

  it(`write directory to disk`, () => {
    d[`/dir1`] = { isDirectory: true, queueWriteToDisk: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir1`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1`].queueWriteToDisk).toBe(false);
  });

  it(`write file queued even if it's also queueDeleteFromDisk`, () => {
    d[`/dir1/file1.js`] = { queueWriteToDisk: true, queueDeleteFromDisk: true, isFile: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([`/dir1/file1.js`]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir1`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1/file1.js`].queueWriteToDisk).toBe(false);
  });

  it(`write file queued`, () => {
    d[`/dir1/file1.js`] = { queueWriteToDisk: true, isFile: true };
    d[`/dir1/file2.js`] = { queueWriteToDisk: true, isFile: true };
    d[`/dir2/file3.js`] = { queueWriteToDisk: true, isFile: true };
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([`/dir1/file1.js`, `/dir1/file2.js`, `/dir2/file3.js`]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([`/dir1`, `/dir2`]);
    expect(i.copyFileTasks.length).toEqual(0);
    expect(d[`/dir1/file1.js`].queueWriteToDisk).toBe(false);
    expect(d[`/dir1/file2.js`].queueWriteToDisk).toBe(false);
    expect(d[`/dir2/file3.js`].queueWriteToDisk).toBe(false);
  });

  it(`do nothing`, () => {
    const i = getCommitInstructions(path, d, copyFileTasks);
    expect(i.filesToDelete).toEqual([]);
    expect(i.filesToWrite).toEqual([]);
    expect(i.dirsToDelete).toEqual([]);
    expect(i.dirsToEnsure).toEqual([]);
    expect(i.copyFileTasks.length).toBe(0);
  });

  var d: FsItems;
  var copyFileTasks: FsCopyFileTask[];

  beforeEach(() => {
    d = {};
    copyFileTasks = [];
  });

});


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
    await fs.writeFile(`/dir/file1.js`, `1`);
    await fs.commit();

    let files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(1);
    files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(2);
  });

  it(`readdir, recursive`, async () => {
    await fs.writeFile(`/dir1/file1.js`, ``);
    await fs.writeFile(`/dir1/file2.js`, ``);
    await fs.writeFile(`/dir1/dir2/file1.js`, ``);
    await fs.writeFile(`/dir1/dir2/file2.js`, ``);
    await fs.writeFile(`/dir2/dir3/file1.js`, ``);
    await fs.writeFile(`/dir2/dir3/dir4/file2.js`, ``);
    await fs.commit();
    fs.clearCache();
    mockFs.diskReads = 0;

    let items = await fs.readdir(`/dir1`, { recursive: true });
    expect(items.length).toBe(5);
    expect(items[0].absPath).toBe(`/dir1/dir2`);
    expect(items[0].relPath).toBe(`dir2`);
    expect(items[0].isDirectory).toBe(true);
    expect(items[0].isFile).toBe(false);
    expect(items[1].absPath).toBe(`/dir1/file1.js`);
    expect(items[1].relPath).toBe(`file1.js`);
    expect(items[1].isFile).toBe(true);
    expect(items[1].isDirectory).toBe(false);
    expect(items[2].absPath).toBe(`/dir1/file2.js`);
    expect(items[3].absPath).toBe(`/dir1/dir2/file1.js`);
    expect(items[4].absPath).toBe(`/dir1/dir2/file2.js`);
    expect(mockFs.diskReads).toBe(7);
  });

  it(`readdir, no recursive`, async () => {
    await fs.writeFile(`/dir1/file1.js`, ``);
    await fs.writeFile(`/dir1/file2.js`, ``);
    await fs.writeFile(`/dir1/dir2/file1.js`, ``);
    await fs.writeFile(`/dir1/dir2/file2.js`, ``);
    await fs.writeFile(`/dir2/dir3/file1.js`, ``);
    await fs.writeFile(`/dir2/dir3/dir4/file2.js`, ``);
    await fs.commit();
    fs.clearCache();
    mockFs.diskReads = 0;

    let items = await fs.readdir(`/dir1`);
    expect(items.length).toBe(3);
    expect(items[0].absPath).toBe(`/dir1/dir2`);
    expect(items[0].relPath).toBe(`dir2`);
    expect(items[0].isDirectory).toBe(true);
    expect(items[0].isFile).toBe(false);
    expect(items[1].absPath).toBe(`/dir1/file1.js`);
    expect(items[1].relPath).toBe(`file1.js`);
    expect(items[1].isFile).toBe(true);
    expect(items[1].isDirectory).toBe(false);
    expect(items[2].absPath).toBe(`/dir1/file2.js`);
    expect(mockFs.diskReads).toBe(4);
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
