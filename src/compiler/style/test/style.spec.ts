import { cleanStyle } from '../style';
import { expectFilesWritten } from '../../../testing/utils';
import { TestingCompiler } from '../../../testing/index';


describe('component-styles', () => {

  describe('build', () => {

    it('should build 2 bundles w/ 3 components w/ styleUrls and scss variables', async () => {
      c.config.bundles = [
        { components: ['cmp-a', 'cmp-b'] },
        { components: ['cmp-c'] }
      ];
      await c.fs.writeFiles({
        '/src/cmp-a.tsx': `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`,
        '/src/cmp-a.scss': `$color: red; body { color: $color; }`,
        '/src/cmp-b.tsx': `@Component({ tag: 'cmp-b', styleUrl: 'cmp-b.scss' }) export class CmpB {}`,
        '/src/cmp-b.scss': `body { color: white; }`,
        '/src/cmp-c.tsx': `@Component({ tag: 'cmp-c', styleUrl: 'cmp-c.scss' }) export class CmpC {}`,
        '/src/cmp-c.scss': `body { color: blue; }`
      });
      await c.fs.commit();

      const r = await c.build();
      expect(r.diagnostics).toEqual([]);

      const cmpA = await c.fs.readFile('/www/build/app/cmp-a.js');
      expect(cmpA.includes(`body {\\n  color: red;\\n}`)).toBe(true);
      expect(cmpA.includes('body {\\n  color: white;\\n}')).toBe(true);

      const cmpC = await c.fs.readFile('/www/build/app/cmp-c.js');
      expect(cmpC.includes('body {\\n  color: blue;\\n}')).toBe(true);
    });

    it('should build one component w/ inline style', async () => {
      c.config.bundles = [ { components: ['cmp-a'] } ];
      await c.fs.writeFiles({
        '/src/cmp-a.tsx': `@Component({ tag: 'cmp-a', styles: 'body { color: red; }' }) export class CmpA {}`,
      });
      await c.fs.commit();

      const r = await c.build();
      expect(r.diagnostics).toEqual([]);

      const content = await c.fs.readFile('/www/build/app/cmp-a.js');
      expect(content.includes('body { color: red; }')).toBe(true);
    });

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
      expect(r.stats.bundleBuildCount).toBe(1);

      const content = await c.fs.readFile('/www/build/app/cmp-a.js');
      expect(content.includes(`body {\\n  color: red;\\n}`)).toBe(true);
    });

    var c: TestingCompiler;

    beforeEach(async () => {
      c = new TestingCompiler();
      await c.fs.writeFile('/src/index.html', `<cmp-a></cmp-a>`);
      await c.fs.commit();
    });

  });


  describe('cleanStyle', () => {

    it(`should allow @ in selectors`, () => {
      const cleaned = cleanStyle('.container--small\@tablet{}');
      expect(cleaned).toBe(`.container--small\\@tablet{}`);
    });

  });

});
