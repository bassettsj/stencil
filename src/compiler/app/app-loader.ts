import { AppRegistry, Config, CompilerCtx, ComponentRegistry } from '../../util/interfaces';
import { APP_NAMESPACE_REGEX } from '../../util/constants';
import { generatePreamble } from '../util';
import { getAppPublicPath, getLoaderFileName, getLoaderDist, getLoaderWWW } from './app-file-naming';
import { formatComponentLoaderRegistry } from '../../util/data-serialize';


export async function generateLoader(
  config: Config,
  ctx: CompilerCtx,
  appRegistry: AppRegistry,
  cmpRegistry: ComponentRegistry
) {
  const appLoaderFileName = getLoaderFileName(config);

  const clientLoaderSource = `loader.js`;

  let loaderContent = await config.sys.getClientCoreFile({ staticName: clientLoaderSource });

  loaderContent = injectAppIntoLoader(
    config,
    appRegistry.core,
    appRegistry.coreSsr,
    appRegistry.corePolyfilled,
    config.hydratedCssClass,
    cmpRegistry,
    loaderContent
  );

  // write the app loader file
  if (ctx.appFiles.loaderContent !== loaderContent) {
    // app loader file is actually different from our last saved version
    config.logger.debug(`build, app loader: ${appLoaderFileName}`);
    ctx.appFiles.loaderContent = loaderContent;

    if (config.minifyJs) {
      // minify
      loaderContent = minifyLoader(config, loaderContent);

    } else {
      // dev
      loaderContent = generatePreamble(config) + '\n' + loaderContent;
    }

    ctx.appFiles.loader = loaderContent;

    if (config.generateWWW) {
      const appLoaderWWW = getLoaderWWW(config);
      await ctx.fs.writeFile(appLoaderWWW, loaderContent);
      ctx.appFiles[appLoaderWWW] = loaderContent;
    }

    if (config.generateDistribution) {
      const appLoaderDist = getLoaderDist(config);
      await ctx.fs.writeFile(appLoaderDist, loaderContent);
      ctx.appFiles[appLoaderDist] = loaderContent;
    }
  }

  return loaderContent;
}


function minifyLoader(config: Config, jsText: string) {
  // minify the loader
  const opts: any = { output: {}, compress: {}, mangle: {} };
  opts.ecma = 5;
  opts.output.ecma = 5;
  opts.compress.ecma = 5;
  opts.compress.arrows = false;

  if (config.logLevel === 'debug') {
    opts.mangle.keep_fnames = true;
    opts.compress.drop_console = false;
    opts.compress.drop_debugger = false;
    opts.output.beautify = true;
    opts.output.bracketize = true;
    opts.output.indent_level = 2;
    opts.output.comments = 'all';
    opts.output.preserve_line = true;
  }

  opts.output.preamble = generatePreamble(config);

  const minifyJsResults = config.sys.minifyJs(jsText, opts);
  minifyJsResults.diagnostics.forEach(d => {
    (config.logger as any)[d.level](d.messageText);
  });

  if (!minifyJsResults.diagnostics.length) {
    jsText = minifyJsResults.output;
  }

  return jsText;
}


export function injectAppIntoLoader(
  config: Config,
  appCoreFileName: string,
  appCoreSsrFileName: string,
  appCorePolyfilledFileName: string,
  hydratedCssClass: string,
  cmpRegistry: ComponentRegistry,
  loaderContent: string
) {
  const cmpLoaderRegistry = formatComponentLoaderRegistry(cmpRegistry);

  const cmpLoaderRegistryStr = JSON.stringify(cmpLoaderRegistry);

  const publicPath = getAppPublicPath(config);

  const loaderArgs = [
    `"${config.namespace}"`,
    `"${publicPath}"`,
    `"${appCoreFileName}"`,
    `"${appCoreSsrFileName}"`,
    `"${appCorePolyfilledFileName}"`,
    `"${hydratedCssClass}"`,
    cmpLoaderRegistryStr
  ].join(',');

  return loaderContent.replace(APP_NAMESPACE_REGEX, loaderArgs);
}
