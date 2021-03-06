import { ComponentMeta, ComponentRegistry, Config, HydrateOptions, PlatformApi } from '../util/interfaces';
import { mockLogger, mockStencilSystem } from './mocks';
import { Renderer } from '../server';
import { validateBuildConfig } from '../compiler/config/validate-config';


export async function render(opts: RenderTestOptions): Promise<any> {
  validateRenderOptions(opts);

  const config = getTestBuildConfig();
  const registry: ComponentRegistry = {};

  const renderer = new Renderer(config);

  const hydrateOpts: HydrateOptions = {
    html: opts.html,
    isPrerender: false,
    collectAnchors: false,
    serializeHtml: false,
    inlineLoaderScript: false,
    inlineStyles: false,
    removeUnusedStyles: false,
    canonicalLink: false,
    collapseWhitespace: false,
    ssrIds: false
  };

  opts.components.forEach(testCmp => {
    if (testCmp && testCmp.metadata) {
      const cmpMeta: ComponentMeta = testCmp.metadata;
      cmpMeta.componentConstructor = testCmp;
      registry[cmpMeta.tagNameMeta] = cmpMeta;
    }
  });

  const results = await renderer.hydrate(hydrateOpts);

  if (results.diagnostics.length) {
    const msg = results.diagnostics.map(d => d.messageText).join('\n');
    throw new Error(msg);
  }

  const rootElm = (results.root && results.root.children.length > 1 && results.root.children[1].firstElementChild) || null;
  if (rootElm) {
    (rootElm as any).__testPlatform = (results as any).__testPlatform;
    delete (results as any).__testPlatform;
  }

  return rootElm;
}


export function flush(root: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const plt: PlatformApi = root.__testPlatform;

    if (!plt) {
      reject(`invalid testing root node`);
      return;
    }

    plt.queue.flush(() => {
      resolve();
    });
  });
}


function getTestBuildConfig() {
  const sys = mockStencilSystem();

  const config: Config = {
    sys: sys,
    logger: mockLogger(),
    rootDir: '/',
    suppressTypeScriptErrors: true,
    devMode: true
  };

  config.prerender = false;
  config.devMode = true;
  config._isTesting = true;
  config.serviceWorker = false;
  config.emptyDist = false;
  config.emptyWWW = false;
  config.generateDistribution = false;
  config.generateWWW = false;
  config.buildStats = true;

  return validateBuildConfig(config);
}


function validateRenderOptions(opts: RenderTestOptions) {
  if (!opts) {
    throw new Error('missing render() options');
  }
  if (!opts.components) {
    throw new Error(`missing render() components: ${opts}`);
  }
  if (!Array.isArray(opts.components)) {
    throw new Error(`render() components must be an array: ${opts}`);
  }
  if (typeof opts.html !== 'string') {
    throw new Error(`render() html must be a string: ${opts}`);
  }
}


export interface RenderTestOptions {
  components: any[];
  html: string;
}
