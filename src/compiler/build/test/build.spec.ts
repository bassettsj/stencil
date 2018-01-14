import { build } from '../build';
import { Config, CompilerCtx, BuildResults, ComponentRegistry } from '../../../util/interfaces';
import { expectFilesWritten } from '../../../testing/utils';
import { mockConfig } from '../../../testing/mocks';
import { validateBuildConfig } from '../../../util/validate-config';
import { TestingCompiler } from '../../../testing/index';


describe('build', () => {

  it('should build one component w/ styleUrl', async () => {
    c.config.bundles = [ { components: ['cmp-a'] } ];
    await c.fs.writeFiles({
      '/src/cmp-a.tsx': `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`,
      '/src/cmp-a.scss': `body { color: red; }`
    });
    await c.fs.commit();

    const r = await c.build();
    expect(r.diagnostics).toEqual([]);
    expect(r.stats.components.length).toBe(1);
    expect(r.stats.transpileBuildCount).toBe(1);
    // expect(r.stats.styleBuildCount).toBe(1);
    expect(r.stats.bundleBuildCount).toBe(1);

    expectFilesWritten(r,
      '/src/components.d.ts',
      '/www/build/app.js',
      '/www/build/app/app.core.js',
      '/www/build/app/app.core.ssr.js',
      '/www/build/app/app.registry.json',
      '/www/build/app/cmp-a.js',
      '/www/build/app/es5-build-disabled.js',
      '/www/index.html'
    );
    expect(r.stats.filesWritten.length).toBe(8);
  });

  it('should build one component w/ no styles', async () => {
    c.config.bundles = [ { components: ['cmp-a'] } ];
    await c.fs.writeFile('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);
    await c.fs.commit();

    const r = await c.build();
    expect(r.diagnostics).toEqual([]);
    expect(r.stats.components.length).toBe(1);
    expect(r.stats.components.indexOf('cmp-a') > -1).toBe(true);
    expect(r.stats.transpileBuildCount).toBe(1);
    expect(r.stats.styleBuildCount).toBe(0);
    expect(r.stats.bundleBuildCount).toBe(1);

    expectFilesWritten(r,
      '/src/components.d.ts',
      '/www/build/app.js',
      '/www/build/app/app.core.js',
      '/www/build/app/app.core.ssr.js',
      '/www/build/app/app.registry.json',
      '/www/build/app/cmp-a.js',
      '/www/build/app/es5-build-disabled.js',
      '/www/index.html'
    );
    expect(r.stats.filesWritten.length).toBe(8);
  });

  it('should build no components', async () => {
    const r = await c.build();
    expect(r.diagnostics).toEqual([]);
    expect(r.stats.components.length).toBe(0);
    expect(r.stats.transpileBuildCount).toBe(0);
    expect(r.stats.styleBuildCount).toBe(0);
    expect(r.stats.bundleBuildCount).toBe(0);
  });


  var c: TestingCompiler;

  beforeEach(async () => {
    c = new TestingCompiler();
    await c.fs.writeFile('/src/index.html', `<cmp-a></cmp-a>`);
    await c.fs.commit();
  });

});
