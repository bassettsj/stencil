import { Config, CompilerCtx, HydrateOptions, HydrateResults, InMemoryFileSystem, ComponentRegistry } from '../util/interfaces';
import { catchError, getCompilerCtx } from '../compiler/util';
import { getGlobalWWW } from '../compiler/app/app-file-naming';
import { hydrateHtml } from './hydrate-html';
import { loadComponentRegistry } from './load-registry';
import { validateBuildConfig } from '../util/validate-config';


export class Renderer {
  private ctx: CompilerCtx;
  private cmpRegistry: ComponentRegistry;
  config: Config;

  constructor(config: Config, ctx?: CompilerCtx) {
    this.config = config;
    validateBuildConfig(config);

    // init the build context
    this.ctx = getCompilerCtx(config.sys, ctx);

    // load the component registry from the registry.json file
    this.cmpRegistry = loadComponentRegistry(config, this.ctx);

    if (Object.keys(this.cmpRegistry).length === 0) {
      throw new Error(`No registered components found: ${config.namespace}`);
    }

    // load the app global file into the context
    loadAppGlobal(config, this.ctx);
  }

  async hydrate(hydrateOpts: HydrateOptions) {
    let hydrateResults: HydrateResults;

    // kick off hydrated, which is an async opertion
    try {
      hydrateResults = await hydrateHtml(this.config, this.ctx, this.cmpRegistry, hydrateOpts);

    } catch (e) {
      hydrateResults = {
        url: hydrateOpts.path,
        diagnostics: [],
        html: hydrateOpts.html,
        styles: null,
        anchors: [],
        components: [],
        styleUrls: [],
        scriptUrls: [],
        imgUrls: []
      };

      catchError(hydrateResults.diagnostics, e);
    }

    return hydrateResults;
  }

  get fs(): InMemoryFileSystem {
    return this.ctx.fs;
  }

}


/**
 * Deprecated
 * Please use "const renderer = new Renderer(config);" instead.
 */
export function createRenderer(config: Config) {
  const renderer = new Renderer(config);

  config.logger.warn(`"createRenderer(config)" is deprecated. Please use "const renderer = new Renderer(config);" instead"`);

  return {
    hydrateToString: renderer.hydrate.bind(renderer)
  };
}


function loadAppGlobal(config: Config, ctx: CompilerCtx) {
  ctx.appFiles = ctx.appFiles || {};

  if (ctx.appFiles.global) {
    // already loaded the global js content
    return;
  }

  // let's load the app global js content
  const appGlobalPath = getGlobalWWW(config);
  try {
    ctx.appFiles.global = ctx.fs.readFileSync(appGlobalPath);

  } catch (e) {
    config.logger.debug(`missing app global: ${appGlobalPath}`);
  }
}
