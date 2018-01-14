import { Config, CompilerCtx, Bundle, Diagnostic, ModuleFile } from '../../../util/interfaces';
import {
  bundledComponentContainsChangedFile,
  canSkipBuild
 } from '../bundle-modules';
 import { mockStencilSystem } from '../../../testing/mocks';


describe('bundle-modules', () => {

  describe('bundledComponentContainsChangedFile', () => {
    const config: Config = {
      sys: mockStencilSystem()
    };
    const moduleFiles: ModuleFile[] = [
      { jsFilePath: '/tmp/build/cmp-a.js' },
      { jsFilePath: '/tmp/build/cmp-b.js' },
      { jsFilePath: '/tmp/build/cmp-c.js' }
    ];

    it('should not contain changed files', () => {
      const changedFiles = [
        '/User/app/build/cmp-x.ts',
        '/User/app/build/cmp-y.tsx'
      ];
      const hasChanged = bundledComponentContainsChangedFile(config, moduleFiles, changedFiles);
      expect(hasChanged).toBe(false);
    });

    it('should contain changed files', () => {
      const changedFiles = [
        '/User/app/build/cmp-a.ts',
        '/User/app/build/cmp-b.tsx'
      ];
      const hasChanged = bundledComponentContainsChangedFile(config, moduleFiles, changedFiles);
      expect(hasChanged).toBe(true);
    });

  });

});
