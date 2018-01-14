import { BuildResults, Config, CompilerCtx } from '../../../util/interfaces';
import { DEFAULT_COMPILER_OPTIONS } from '../compiler-options';
import { mockConfig, mockFs } from '../../../testing/mocks';
import { TestingCompiler } from '../../../testing';
import { transpileModule } from '../transpile';
import { validateBuildConfig } from '../../../util/validate-config';
import { wroteFile } from '../../../testing/utils';
import * as path from 'path';
import * as ts from 'typescript';


describe('transpile', () => {

  describe('rebuild', () => {

    fit('should rebuild transpile for deleted directory', async () => {
      c.config.watch = true;
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);
      c.fs.writeFileSync('/src/some-dir/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);
      c.fs.writeFileSync('/src/some-dir/cmp-c.tsx', `@Component({ tag: 'cmp-c' }) export class CmpC {}`);

      // kick off the initial build, wait for it to finish
      let r = await c.build();
      expect(r.diagnostics).toEqual([]);

      // create a rebuild listener
      const rebuildListener = c.once('rebuild');

      c.fs.removeSync('/src/some-dir');

      // kick off a rebuild
      c.trigger('dirDelete', '/src/some-dir');

      // wait for the rebuild to finish
      // get the rebuild results
      r = await rebuildListener;
      expect(r.diagnostics).toEqual([]);

      expect(wroteFile(r, '/www/build/app/cmp-a.js')).toBe(false);
      expect(wroteFile(r, '/www/build/app/cmp-b.js')).toBe(false);
      expect(wroteFile(r, '/www/build/app/cmp-c.js')).toBe(false);
      expect(r.stats.components).toEqual(['cmp-a']);
    });

    it('should rebuild transpile for added directory', async () => {
      c.config.bundles = [ { components: ['cmp-a'] } ];
      c.config.watch = true;
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`, { clearFileCache: true });

      // kick off the initial build, wait for it to finish
      let r = await c.build();
      expect(r.diagnostics).toEqual([]);

      // create a rebuild listener
      const rebuildListener = c.once('rebuild');

      // add directory
      c.fs.writeFileSync('/src/new-dir/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`, { clearFileCache: true });
      c.fs.writeFileSync('/src/new-dir/cmp-c.tsx', `@Component({ tag: 'cmp-c' }) export class CmpC {}`, { clearFileCache: true });

      // kick off a rebuild
      c.trigger('dirAdd', '/src/new-dir');

      // wait for the rebuild to finish
      // get the rebuild results
      r = await rebuildListener;
      expect(r.diagnostics).toEqual([]);

      expect(wroteFile(r, '/www/build/app/cmp-a.js')).toBe(false);
      expect(wroteFile(r, '/www/build/app/cmp-b.js')).toBe(true);
      expect(wroteFile(r, '/www/build/app/cmp-c.js')).toBe(true);
      expect(r.stats.components).toEqual(['cmp-a', 'cmp-b', 'cmp-c']);
    });

    it('should rebuild transpile for changed typescript file', async () => {
      c.config.bundles = [ { components: ['cmp-a'] } ];
      c.config.watch = true;
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`, { clearFileCache: true });

      // kick off the initial build, wait for it to finish
      let r = await c.build();
      expect(r.diagnostics).toEqual([]);

      // create a rebuild listener
      const rebuildListener = c.once('rebuild');

      // write an actual change
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA { constructor() { console.log('changed!!'); } }`, { clearFileCache: true });

      // kick off a rebuild
      c.trigger('fileUpdate', '/src/cmp-a.tsx');

      // wait for the rebuild to finish
      // get the rebuild results
      r = await rebuildListener;
      expect(r.diagnostics).toEqual([]);

      expect(wroteFile(r, '/www/build/app/cmp-a.js')).toBe(true);
      expect(r.stats.components).toEqual(['cmp-a']);
      expect(r.stats.transpileBuildCount).toBe(1);
    });

    it('should not rebuild transpile for unchanged typescript file', async () => {
      c.config.bundles = [ { components: ['cmp-a'] } ];
      c.config.watch = true;
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`, { clearFileCache: true });

      // kick off the build, wait for it to finish
      let r = await c.build();

      // initial build finished
      expect(r.diagnostics).toEqual([]);
      expect(r.buildId).toBe(0);
      expect(r.stats.isRebuild).toBe(false);

      // create a rebuild listener
      const rebuildListener = c.once('rebuild');

      // write the same darn thing, no actual change
      c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`, { clearFileCache: true });

      // kick off a rebuild
      c.trigger('fileUpdate', '/src/cmp-a.tsx');

      // wait for the rebuild to finish
      // get the rebuild results
      r = await rebuildListener;

      expect(r.diagnostics).toEqual([]);
      expect(r.buildId).toBe(1);
      expect(r.stats.isRebuild).toBe(true);
      expect(r.stats.components).toEqual(['cmp-a']);
      expect(r.stats.transpileBuildCount).toBe(1);
    });


    var c: TestingCompiler;

    beforeEach(() => {
      c = new TestingCompiler();
      c.fs.ensureDirSync('/src');
      c.fs.writeFileSync('/src/index.html', `<cmp-a></cmp-a>`);
    });

  });

  describe('simple', () => {

    it('simple test', () => {
      var config = mockConfig();
      const filePath = path.join(__dirname, 'component.tsx');

      DEFAULT_COMPILER_OPTIONS.target = ts.ScriptTarget.ES2015;
      // DEFAULT_COMPILER_OPTIONS.module = ts.ModuleKind.CommonJS;
      const results = transpileModule(config, DEFAULT_COMPILER_OPTIONS, filePath, ts.sys.readFile(filePath, 'utf8'));
      expect(typeof results.code).toBe('string');
      expect(Object.keys(results.cmpMeta).length).toEqual(10);
    });
  });

});
