import { Config } from '../interfaces';
import { mockFs, mockLogger, mockStencilSystem } from '../../testing/mocks';
import { setProcessEnvironment, validateBuildConfig } from '../validate-config';
import * as path from 'path';


describe('validation', () => {

  describe('buildStats', () => {

    it('set buildStats true', () => {
      config.buildStats = true;
      validateBuildConfig(config);
      expect(config.buildStats).toBe(true);
    });

    it('set buildStats false', () => {
      config.buildStats = false;
      validateBuildConfig(config);
      expect(config.buildStats).toBe(false);
    });

    it('default buildStats false', () => {
      validateBuildConfig(config);
      expect(config.buildStats).toBe(false);
    });

  });

  describe('es5 build', () => {

    it('set buildEs5 false', () => {
      config.buildEs5 = false;
      validateBuildConfig(config);
      expect(config.buildEs5).toBe(false);
    });

    it('set buildEs5 true', () => {
      config.buildEs5 = true;
      validateBuildConfig(config);
      expect(config.buildEs5).toBe(true);
    });

    it('prod mode default to both es2015 and es5', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.buildEs5).toBe(true);
    });

    it('dev mode default to only es2015', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.buildEs5).toBe(false);
    });

  });


  describe('include/exclude globs', () => {

    it('should default include glob', () => {
      validateBuildConfig(config);
      expect(config.includeSrc).toEqual([
        '/User/some/path/src/**/*.ts',
        '/User/some/path/src/**/*.tsx'
      ]);
    });

    it('should default exclude glob', () => {
      validateBuildConfig(config);
      expect(config.excludeSrc).toEqual(['**/test/**', '**/*.spec.*']);
    });

  });


  describe('hydrate css', () => {

    it('should set hydratedCssClass', () => {
      config.hydratedCssClass = '💎';
      validateBuildConfig(config);
      expect(config.hydratedCssClass).toBe('💎');
    });

    it('should default hydratedCssClass', () => {
      validateBuildConfig(config);
      expect(config.hydratedCssClass).toBe('hydrated');
    });

  });


  describe('hashed filenames', () => {

    it('should throw error when hashedFileNameLength to small', () => {
      expect(() => {
        config.hashedFileNameLength = 3;
        validateBuildConfig(config);
      }).toThrow();
    });

    it('should set hashedFileNameLength', () => {
      config.hashedFileNameLength = 6;
      validateBuildConfig(config);
      expect(config.hashedFileNameLength).toBe(6);
    });

    it('should default hashedFileNameLength', () => {
      validateBuildConfig(config);
      expect(config.hashedFileNameLength).toBe(8);
    });

    it('should default hashFileNames to false in watch mode despite prod mode', () => {
      config.watch = true;
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(false);
    });

    it('should default hashFileNames to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(true);
    });

    it('should default hashFileNames to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(false);
    });

    it('should set hashFileNames from hashFilenames', () => {
      (config as any).hashFilenames = false;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(false);
    });

  });


  describe('minifyJs', () => {

    it('should set minifyJs to true', () => {
      config.devMode = true;
      config.minifyJs = true;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(true);
    });

    it('should default minifyJs to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(true);
    });

    it('should default minifyJs to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(false);
    });

  });


  describe('minifyCss', () => {

    it('should set minifyCss to true', () => {
      config.devMode = true;
      config.minifyCss = true;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(true);
    });

    it('should default minifyCss to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(true);
    });

    it('should default minifyCss to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(false);
    });

  });


  describe('validateBuildConfig', () => {

    it('should default watch to false', () => {
      validateBuildConfig(config);
      expect(config.watch).toBe(false);
    });

    it('should set devMode to false', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.devMode).toBe(false);
    });

    it('should set devMode to true', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.devMode).toBe(true);
    });

    it('should default devMode to false', () => {
      validateBuildConfig(config);
      expect(config.devMode).toBe(false);
    });

    it('should set publicPath from custom buildDir', () => {
      config.wwwDir = 'some-www';
      config.buildDir = 'some-build';
      validateBuildConfig(config);
      expect(config.publicPath).toBe('/some-build/');
      expect(path.isAbsolute(config.publicPath)).toBe(true);
    });

    it('should set publicPath and not force absolute path, but suffix with /', () => {
      config.publicPath = 'my-crazy-public-path';
      validateBuildConfig(config);
      expect(config.publicPath).toBe('my-crazy-public-path/');
    });

    it('should set default publicPath and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(config.publicPath).toBe('/build/');
    });

    it('should set default wwwIndexHtml and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.wwwIndexHtml)).toBe('index.html');
      expect(path.isAbsolute(config.wwwIndexHtml)).toBe(true);
    });

    it('should set default indexHtmlSrc and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.srcIndexHtml)).toBe('index.html');
      expect(path.isAbsolute(config.srcIndexHtml)).toBe(true);
    });

    it('should set default dist dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.distDir)).toBe('dist');
      expect(path.isAbsolute(config.distDir)).toBe(true);
    });

    it('should set default emptyDist to true', () => {
      validateBuildConfig(config);
      expect(config.emptyDist).toBe(true);
    });

    it('should set emptyDist to false', () => {
      config.emptyDist = false;
      validateBuildConfig(config);
      expect(config.emptyDist).toBe(false);
    });

    it('should set default emptyWWW to true', () => {
      validateBuildConfig(config);
      expect(config.emptyWWW).toBe(true);
    });

    it('should set emptyWWW to false', () => {
      config.emptyWWW = false;
      validateBuildConfig(config);
      expect(config.emptyWWW).toBe(false);
    });

    it('should set default generateDocs to false', () => {
      validateBuildConfig(config);
      expect(config.generateDocs).toBe(false);
    });

    it('should set generateDocs to true', () => {
      config.generateDocs = true;
      validateBuildConfig(config);
      expect(config.generateDocs).toBe(true);
    });

    it('should set default collection dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.collectionDir)).toBe('collection');
      expect(path.isAbsolute(config.collectionDir)).toBe(true);
    });

    it('should set default types dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.typesDir)).toBe('types');
      expect(path.isAbsolute(config.typesDir)).toBe(true);
    });

    it('should set generateDistribution to true', () => {
      config.generateDistribution = true;
      validateBuildConfig(config);
      expect(config.generateDistribution).toBe(true);
    });

    it('should default generateDistribution to false', () => {
      validateBuildConfig(config);
      expect(config.generateDistribution).toBe(false);
    });

    it('should set generateWWW to false', () => {
      config.generateWWW = false;
      validateBuildConfig(config);
      expect(config.generateWWW).toBe(false);
    });

    it('should default generateWWW to true', () => {
      validateBuildConfig(config);
      expect(config.generateWWW).toBe(true);
    });

    it('should set default www dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.wwwDir)).toBe('www');
      expect(path.isAbsolute(config.wwwDir)).toBe(true);
    });

    it('should set default build dir and convert to absolute path', () => {
      validateBuildConfig(config);
      const parts = config.buildDir.split(path.sep);
      expect(parts[parts.length - 1]).toBe('build');
      expect(parts[parts.length - 2]).toBe('www');
      expect(path.isAbsolute(config.buildDir)).toBe(true);
    });

    it('should set build dir w/ custom www', () => {
      config.wwwDir = 'custom-www';
      validateBuildConfig(config);
      const parts = config.buildDir.split(path.sep);
      expect(parts[parts.length - 1]).toBe('build');
      expect(parts[parts.length - 2]).toBe('custom-www');
      expect(path.isAbsolute(config.buildDir)).toBe(true);
    });

    it('should set default src dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.srcDir)).toBe('src');
      expect(path.isAbsolute(config.srcDir)).toBe(true);
    });

    it('should set src dir and convert to absolute path', () => {
      config.srcDir = 'app';
      validateBuildConfig(config);
      expect(path.basename(config.srcDir)).toBe('app');
      expect(path.isAbsolute(config.srcDir)).toBe(true);
    });

    it('should convert globalScript to absolute path, if a globalScript property was provided', () => {
      config.globalScript = 'src/global/index.ts';
      validateBuildConfig(config);
      expect(path.basename(config.globalScript)).toBe('index.ts');
      expect(path.isAbsolute(config.globalScript)).toBe(true);
    });

    it('should convert globalStyle string to absolute path array, if a globalStyle property was provided', () => {
      config.globalStyle = 'src/global/styles.css' as any;
      validateBuildConfig(config);
      expect(path.basename(config.globalStyle[0])).toBe('styles.css');
      expect(path.isAbsolute(config.globalStyle[0])).toBe(true);
    });

    it('should throw error for missing sys', () => {
      expect(() => {
        config.sys = null;
        validateBuildConfig(config);
      }).toThrowError('config.sys required');
    });

    it('should throw error for missing logger', () => {
      expect(() => {
        config.logger = null;
        validateBuildConfig(config);
      }).toThrowError('config.logger required');
    });

    it('should throw error for missing rootDir', () => {
      expect(() => {
        config.rootDir = null;
        validateBuildConfig(config);
      }).toThrowError('config.rootDir required');
      expect(() => {
        config.rootDir = undefined;
        validateBuildConfig(config);
      }).toThrowError('config.rootDir required');
    });

    it('should throw error for blank config', () => {
      expect(() => {
        validateBuildConfig(null);
      }).toThrowError('invalid build config');
      expect(() => {
        validateBuildConfig(undefined);
      }).toThrowError('invalid build config');
    });

  });

  describe('copy tasks', () => {

    it('should disable copy task with null', () => {
      config.copy = null;
      validateBuildConfig(config);
      expect(config.copy).toBe(null);
    });

    it('should disable copy task with false', () => {
      (config.copy as any) = false;
      validateBuildConfig(config);
      expect(config.copy).toBe(null);
    });

    it('should remove default copy task', () => {
      config.copy = {
        assets: null
      };
      validateBuildConfig(config);
      expect(config.copy.assets).toBe(null);
      expect(config.copy.manifestJson.src).toBe('manifest.json');
    });

    it('should add copy task and keep defaults', () => {
      config.copy = {
        someTask: { src: 'some-dir' }
      };
      validateBuildConfig(config);
      expect(config.copy.someTask.src).toBe('some-dir');
      expect(config.copy.assets.src).toBe('assets');
      expect(config.copy.manifestJson.src).toBe('manifest.json');
    });

    it('should override "assets" copy task default', () => {
      config.copy = {
        assets: { src: 'my-assets', dest: 'some-assets' }
      };
      validateBuildConfig(config);
      expect(config.copy.assets.src).toBe('my-assets');
      expect(config.copy.assets.dest).toBe('some-assets');
    });

    it('should set "assets" copy task default', () => {
      validateBuildConfig(config);
      expect(config.copy.assets.src).toBe('assets');
      expect(config.copy.assets.dest).toBeUndefined();
    });

    it('should override "manifestJson" copy task default', () => {
      config.copy = {
        manifestJson: { src: 'my-manifestJson', dest: 'some-manifestJson' }
      };
      validateBuildConfig(config);
      expect(config.copy.manifestJson.src).toBe('my-manifestJson');
      expect(config.copy.manifestJson.dest).toBe('some-manifestJson');
    });

    it('should set "manifestJson" copy task default', () => {
      validateBuildConfig(config);
      expect(config.copy.manifestJson.src).toBe('manifest.json');
      expect(config.copy.manifestJson.dest).toBeUndefined();
    });

  });


  describe('setProcessEnvironment', () => {

    it('should set NODE_ENV production', () => {
      config.devMode = false;
      setProcessEnvironment(config);
      expect(process.env.NODE_ENV).toBe('production');
    });

    it('should set NODE_ENV development', () => {
      config.devMode = true;
      setProcessEnvironment(config);
      expect(process.env.NODE_ENV).toBe('development');
    });

  });


  var sys = mockStencilSystem();
  var config: Config;
  var logger = mockLogger();

  beforeEach(() => {
    config = {
      sys: sys,
      logger: logger,
      rootDir: '/User/some/path/',
      suppressTypeScriptErrors: true
    };
  });
  sys.fs = mockFs();

});
