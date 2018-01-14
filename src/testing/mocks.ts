import { ComponentMeta, ComponentRegistry, Config, DomApi, HostContentNodes, HostElement,
  HydrateOptions, HydrateResults, Logger, PlatformApi, RendererApi, StencilSystem, VNode } from '../util/interfaces';
import { ComponentInstance } from '../util/interfaces';
import { createDomApi } from '../core/renderer/dom-api';
import { createPlatformServer } from '../server/platform-server';
import { createRendererPatch } from '../core/renderer/patch';
import { initHostElement } from '../core/instance/init-host-element';
import { initComponentInstance } from '../core/instance/init-component-instance';
import { MockFileSystem } from './mock-fs';
import { NodeFileSystem } from '../sys/node/node-fs';
import { noop } from '../util/helpers';
import { validateBuildConfig } from '../util/validate-config';


export function mockPlatform(win?: any, domApi?: DomApi) {
  const hydrateResults: HydrateResults = {
    diagnostics: []
  };
  const config = mockConfig();
  win = win || config.sys.createDom().parse({html: ''});
  domApi = domApi || createDomApi(win, win.document);
  const cmpRegistry: ComponentRegistry = {};

  const plt = createPlatformServer(
    config,
    win,
    win.document,
    cmpRegistry,
    hydrateResults,
    false,
    null
  );
  plt.isClient = true;

  const $mockedQueue = plt.queue = mockQueue();
  const $loadBundleQueue = mockQueue();

  plt.loadBundle = function(_: any, _modeName: string, cb: Function) {
    $loadBundleQueue.add(cb);
  };

  (<MockedPlatform>plt).$flushQueue = function() {
    return new Promise(resolve => {
      $mockedQueue.flush(resolve);
    });
  };

  (<MockedPlatform>plt).$flushLoadBundle = function() {
    return new Promise(resolve => {
      $loadBundleQueue.flush(resolve);
    });
  };

  const renderer = createRendererPatch(plt, domApi);

  plt.render = function(oldVNode: VNode, newVNode: VNode, isUpdate: boolean, hostElementContentNode?: HostContentNodes) {
    return renderer(oldVNode, newVNode, isUpdate, hostElementContentNode);
  };

  return (<MockedPlatform>plt);
}


export interface MockedPlatform extends PlatformApi {
  $flushQueue?: () => Promise<any>;
  $flushLoadBundle?: () => Promise<any>;
}


export function mockConfig() {
  var sys = mockStencilSystem();

  const config: Config = {
    sys: sys,
    logger: mockLogger(),
    rootDir: '/',
    suppressTypeScriptErrors: true,
    devMode: true,
    buildStats: true
  };

  return validateBuildConfig(config);
}


export function mockStencilSystem() {
  const sys: StencilSystem = {

    compiler: {
      name: 'test',
      version: 'test',
      typescriptVersion: 'test'
    },

    createDom: mockCreateDom,

    generateContentHash: function mockGenerateContentHash(content: string, length: number) {
      var crypto = require('crypto');
      return crypto.createHash('sha1')
                  .update(content)
                  .digest('base64')
                  .replace(/\W/g, '')
                  .substr(0, length)
                  .toLowerCase();
    },

    getClientCoreFile: mockGetClientCoreFile,

    isGlob: function(str) {
      const isGlob = require('is-glob');
      return isGlob(str);
    },

    minifyCss: mockMinify,

    minifyJs: mockMinify,

    minimatch(filePath, pattern, opts) {
      const minimatch = require('minimatch');
      return minimatch(filePath, pattern, opts);
    },

    path: require('path'),

    rollup: rollup,

    sass: {
      render: function(config: any, cb: Function) {
        Promise.resolve().then(() => {
          const content = `/** ${config.file} mock css **/`;

          cb(null, {
            css: content,
            stats: []
          });
        });
      }
    },

    semver: require('semver'),

    typescript: require('typescript'),

    url: require('url'),

    vm: {
      createContext: function(ctx, wwwDir, sandbox) {
        ctx; wwwDir;
        return require('vm').createContext(sandbox);
      },
      runInContext: function(code, contextifiedSandbox, options) {
        require('vm').runInContext(code, contextifiedSandbox, options);
      }
    }
  };

  return sys;
}


function mockGetClientCoreFile(opts: {staticName: string}) {
  return Promise.resolve(`
    (function (window, document, apptNamespace, appFileName, appCore, appCorePolyfilled, components) {
        // mock getClientCoreFile, staticName: ${opts.staticName}
    })(window, document, '__APP__');`);
}


function mockCreateDom() {
  const jsdom = require('jsdom');
  let dom: any;

  return {
    parse: function(opts: HydrateOptions) {
      dom = new jsdom.JSDOM(opts.html, {
        url: opts.path,
        referrer: opts.referrer,
        userAgent: opts.userAgent,
      });
      return dom.window;
    },
    serialize: function() {
      return dom.serialize();
    },
    destroy: function() {
      dom.window.close();
      dom = null;
    },
    getDiagnostics: function(): any {
      return [];
    }
  };
}

function mockMinify(input: string) {
  return <any>{
    output: `/** mock minify **/\n${input}`,
    diagnostics: []
  };
}

var rollup = require('rollup');
rollup.plugins = {
  commonjs: require('rollup-plugin-commonjs'),
  nodeResolve: require('rollup-plugin-node-resolve')
};


export function mockFs() {
  return new NodeFileSystem(new MockFileSystem());
}


export function mockLogger() {
  const logger: Logger = {
    level: 'debug',
    debug: noop,
    info: noop,
    error: noop,
    warn: noop,
    createTimeSpan: (_startMsg: string, _debug?: boolean) => {
      return {
        finish: () => {}
      };
    },
    printDiagnostics: noop,
    red: (msg) => msg,
    green: (msg) => msg,
    yellow: (msg) => msg,
    blue: (msg) => msg,
    magenta: (msg) => msg,
    cyan: (msg) => msg,
    gray: (msg) => msg,
    bold: (msg) => msg,
    dim: (msg) => msg
  };
  return logger;
}


export function mockWindow(opts: HydrateOptions = {}) {
  opts.userAgent = opts.userAgent || 'test';

  const window = mockStencilSystem().createDom().parse(opts);

  (window as any).requestAnimationFrame = function(callback: Function) {
    setTimeout(() => {
      callback(Date.now());
    });
  };

  return window;
}


export function mockDocument(window?: Window) {
  return (window || mockWindow()).document;
}


export function mockDomApi(win?: any, doc?: any) {
  win = win || mockWindow();
  doc = doc || win.document;
  return createDomApi(win, doc);
}


export function mockRenderer(plt?: MockedPlatform, domApi?: DomApi): RendererApi {
  plt = plt || mockPlatform();
  return createRendererPatch(<PlatformApi>plt, domApi || mockDomApi());
}


export function mockQueue() {
  const callbacks: Function[] = [];

  function flush(cb?: Function) {
    setTimeout(() => {
      while (callbacks.length > 0) {
        callbacks.shift()();
      }
      cb();
    }, Math.round(Math.random() * 20));
  }

  function add(cb: Function) {
    callbacks.push(cb);
  }

  function clear() {
    callbacks.length = 0;
  }

  return {
    add: add,
    flush: flush,
    clear: clear
  };
}


export function mockHtml(html: string): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(html.trim()).firstChild;
}

export function mockSVGElement(): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`).firstChild;
}

export function mockElement(tag: string = 'div'): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(`<${tag}></${tag}>`).firstChild;
}

export function mockComponentInstance(plt: PlatformApi, domApi: DomApi, cmpMeta: ComponentMeta = {}): ComponentInstance {
  mockDefine(plt, cmpMeta);

  const el = domApi.$createElement('ion-cmp') as any;
  initComponentInstance(plt, el);
  return el._instance;
}

export function mockTextNode(text: string): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(text).firstChild;
}


export function mockDefine(plt: MockedPlatform, cmpMeta: ComponentMeta) {
  if (!cmpMeta.tagNameMeta) {
    cmpMeta.tagNameMeta = 'ion-cmp';
  }
  if (!cmpMeta.componentConstructor) {
    cmpMeta.componentConstructor = class {} as any;

  }
  if (!cmpMeta.membersMeta) {
    cmpMeta.membersMeta = {};
  }

  (<PlatformApi>plt).defineComponent(cmpMeta);

  return cmpMeta;
}

export function mockEvent(domApi: DomApi, name: string, detail: any = {}): CustomEvent {
  const evt = (domApi.$documentElement.parentNode as Document).createEvent('CustomEvent');
  evt.initCustomEvent(name, false, false, detail);
  return evt;
}

export function mockDispatchEvent(domApi: DomApi, el: HTMLElement, name: string, detail: any = {}): boolean {
  const ev = mockEvent(domApi, name, detail);
  return el.dispatchEvent(ev);
}

export function mockConnect(plt: MockedPlatform, html: string) {
  const jsdom = require('jsdom');
  const rootNode = jsdom.JSDOM.fragment(html);

  connectComponents(plt, rootNode);

  return rootNode;
}


function connectComponents(plt: MockedPlatform, node: HostElement) {
  if (!node) return;

  if (node.tagName) {
    if (!node.$connected) {
      const cmpMeta = (<PlatformApi>plt).getComponentMeta(node);
      if (cmpMeta) {
        initHostElement((<PlatformApi>plt), cmpMeta, node);
        (<HostElement>node).connectedCallback();
      }
    }
  }
  if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      connectComponents(plt, <HostElement>node.childNodes[i]);
    }
  }
}


export function waitForLoad(plt: MockedPlatform, rootNode: any, tag: string): Promise<HostElement> {
  const elm: HostElement = rootNode.tagName === tag.toLowerCase() ? rootNode : rootNode.querySelector(tag);

  return plt.$flushQueue()
    // flush to read attribute mode on host elment
    .then(() => plt.$flushLoadBundle())
    // flush to load component mode data
    .then(() => plt.$flushQueue())
    .then(() => {
      // flush to do the update
      connectComponents(plt, elm);
      return elm;
    });
}


export function compareHtml(input: string) {
  return input.replace(/(\s*)/g, '')
              .replace(/<!---->/g, '')
              .toLowerCase()
              .trim();
}


export function removeWhitespaceFromNodes(node: Node): any {
  if (node.nodeType === 1) {
    for (var i = node.childNodes.length - 1; i >= 0; i--) {
      if (node.childNodes[i].nodeType === 3) {
        if (node.childNodes[i].nodeValue.trim() === '') {
          node.removeChild(node.childNodes[i]);
        } else {
          node.childNodes[i].nodeValue = node.childNodes[i].nodeValue.trim();
        }
      } else {
        removeWhitespaceFromNodes(node.childNodes[i]);
      }
    }
  }
  return node;
}
