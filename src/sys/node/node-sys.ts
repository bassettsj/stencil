import { BuildEvents } from '../../compiler/events';
import { Config, Diagnostic, FileSystem, Path, PackageJsonData, StencilSystem } from '../../util/interfaces';
import { createContext, runInContext } from './node-context';
import { createDom } from './node-dom';
import { NodeFileSystem } from './node-fs';
import { normalizePath } from '../../compiler/util';


export class NodeSystem implements StencilSystem {
  private packageJsonData: PackageJsonData;
  private packageDistDir: string;
  private runtime: string;
  private sysUtil: any;
  private typescriptPackageJson: PackageJsonData;

  fs: FileSystem;
  path: Path;


  constructor() {
    this.fs = new NodeFileSystem(require('fs'));
    this.path = require('path');
    this.sysUtil = require(this.path.join(__dirname, './sys-util.js'));
    this.init();
  }

  init() {
    const packageRootDir = this.path.join(__dirname, '../../../');
    this.packageDistDir = this.path.join(packageRootDir, 'dist/client');
    this.runtime = this.path.join(packageRootDir, 'dist/compiler/index.js');

    try {
      this.packageJsonData = require(this.path.join(packageRootDir, 'package.json'));
    } catch (e) {
      throw new Error(`unable to resolve "package.json" from: ${packageRootDir}`);
    }

    try {
      this.typescriptPackageJson = require(this.resolveModule(packageRootDir, 'typescript')) as PackageJsonData;
    } catch (e) {
      throw new Error(`unable to resolve "typescript" from: ${packageRootDir}`);
    }
  }

  get compiler() {
    return {
      name: this.packageJsonData.name,
      version: this.packageJsonData.version,
      runtime: this.runtime,
      typescriptVersion: this.typescriptPackageJson.version
    };
  }

  get createDom() {
    return createDom;
  }

  createWatcher(events: BuildEvents, paths: string, opts: any) {
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(paths, opts);

    watcher
      .on('change', (path: string) => {
        events.emit('fileUpdate', path);
      })
      .on('add', (path: string) => {
        events.emit('fileAdd', path);
      })
      .on('unlink', (path: string) => {
        events.emit('fileDelete', path);
      })
      .on('addDir', (path: string) => {
        events.emit('dirAdd', path);
      })
      .on('unlinkDir', (path: string) => {
        events.emit('dirDelete', path);
      })
      .on('error', (err: any) => {
        console.error(err);
      });

    return watcher;
  }

  generateContentHash(content: string, length: number): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1')
                  .update(content)
                  .digest('base64')
                  .replace(/\W/g, '')
                  .substr(0, length)
                  .toLowerCase();
  }

  getClientCoreFile(opts: any) {
    const filePath = this.path.join(this.packageDistDir, opts.staticName);
    return this.fs.readFile(filePath);
  }

  glob(pattern: string, opts: any) {
    return new Promise<string[]>((resolve, reject) => {
      this.sysUtil.glob(pattern, opts, (err: any, files: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  isGlob(str: string) {
    return this.sysUtil.isGlob(str);
  }

  loadConfigFile(configPath: string) {
    let config: Config;

    if (!this.path.isAbsolute(configPath)) {
      throw new Error(`Stencil configuration file "${configPath}" must be an absolute path.`);
    }

    try {
      const fileStat = this.fs.statSync(configPath);
      if (fileStat.isDirectory()) {
        // this is only a directory, so let's just assume we're looking for in stencil.config.js
        // otherwise they could pass in an absolute path if it was somewhere else
        configPath = this.path.join(configPath, 'stencil.config.js');
      }

      // the passed in config was a string, so it's probably a path to the config we need to load
      const configFileData = require(configPath);
      if (!configFileData.config) {
        throw new Error(`Invalid Stencil configuration file "${configPath}". Missing "config" property.`);
      }

      config = configFileData.config;
      config.configPath = configPath;

      if (!config.rootDir && configPath) {
        config.rootDir = this.path.dirname(configPath);
      }

    } catch (e) {
      throw new Error(`Error reading Stencil configuration file "${configPath}". ` + e);
    }

    if (!config.sys) {
      config.sys = this;
    }

    return config;
  }

  minifyCss(input: string) {
    const CleanCSS = require(this.path.join(__dirname, './clean-css.js')).cleanCss;
    const result = new CleanCSS().minify(input);
    const diagnostics: Diagnostic[] = [];

    if (result.errors) {
      result.errors.forEach((msg: string) => {
        diagnostics.push({
          header: 'Minify CSS',
          messageText: msg,
          level: 'error',
          type: 'build'
        });
      });
    }

    if (result.warnings) {
      result.warnings.forEach((msg: string) => {
        diagnostics.push({
          header: 'Minify CSS',
          messageText: msg,
          level: 'warn',
          type: 'build'
        });
      });
    }

    return {
      output: result.styles,
      sourceMap: result.sourceMap,
      diagnostics: diagnostics
    };
  }

  minifyJs(input: string, opts?: any) {
    const UglifyJS = require('uglify-es');
    const result = UglifyJS.minify(input, opts);
    const diagnostics: Diagnostic[] = [];

    if (result.error) {
      diagnostics.push({
        header: 'Minify JS',
        messageText: result.error.message,
        level: 'error',
        type: 'build'
      });
    }

    return {
      output: (result.code as string),
      sourceMap: result.sourceMap,
      diagnostics: diagnostics
    };
  }

  minimatch(filePath: string, pattern: string, opts: any) {
    return this.sysUtil.minimatch(filePath, pattern, opts);
  }

  resolveModule(fromDir: string, moduleId: string) {
    const Module = require('module');

    fromDir = this.path.resolve(fromDir);
    const fromFile = this.path.join(fromDir, 'noop.js');

    let dir = Module._resolveFilename(moduleId, {
      id: fromFile,
      filename: fromFile,
      paths: Module._nodeModulePaths(fromDir)
    });

    const root = this.path.parse(fromDir).root;
    let packageJsonFilePath: any;

    while (dir !== root) {
      dir = this.path.dirname(dir);
      packageJsonFilePath = this.path.join(dir, 'package.json');

      try {
        this.fs.statSync(packageJsonFilePath);
      } catch (e) {
        continue;
      }

      return normalizePath(packageJsonFilePath);
    }

    throw new Error(`error loading "${moduleId}" from "${fromDir}"`);
  }

  get rollup() {
    const rollup = require('rollup');
    rollup.plugins = {
      commonjs: require('rollup-plugin-commonjs'),
      nodeResolve: require('rollup-plugin-node-resolve')
    };
    return rollup;
  }

  get semver() {
    return this.sysUtil.semver;
  }

  tmpdir() {
    const os = require('os');
    return this.path.join(os.tmpdir(), 'stencil');
  }

  get typescript() {
    return require('typescript');
  }

  get url() {
    return require('url');
  }

  get vm(): any {
    return {
      createContext,
      runInContext
    };
  }

  get workbox() {
    return require('workbox-build');
  }

}
