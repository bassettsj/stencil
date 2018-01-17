import { BuildResults, CompilerCtx, Config, WatcherResults } from '../../util/interfaces';
import { bundleModules } from '../bundle/bundle';
import { catchError, getCompilerCtx } from '../util';
import { copyTasks } from './copy-tasks';
import { finishBuild, getBuildContext, shouldAbort } from './build-utils';
import { generateAppFiles } from '../app/generate-app-files';
import { generateAppManifest } from '../manifest/generate-manifest';
import { generateBundles } from '../bundle/generate-bundles';
import { generateIndexHtml } from '../html/generate-index-html';
import { generateReadmes } from '../docs/generate-readmes';
import { generateStyles } from '../style/style';
import { initIndexHtml } from '../html/init-index-html';
import { initWatcher } from '../watcher/watcher-init';
import { prerenderApp } from '../prerender/prerender-app';
import { transpileScanSrc } from '../transpile/transpile-scan-src';
import { writeBuildFiles, emptyDestDir } from './write-build';


export async function build(config: Config, compilerCtx?: CompilerCtx, watcher?: WatcherResults): Promise<BuildResults> {
  // create the build context if it doesn't exist
  // the buid context is the same object used for all builds and rebuilds
  // ctx is where stuff is cached for fast in-memory lookups later
  compilerCtx = getCompilerCtx(config, compilerCtx);

  // reset the build context, this is important for rebuilds
  const buildCtx = getBuildContext(config, compilerCtx, watcher);

  if (!compilerCtx.isRebuild) {
    config.logger.info(config.logger.cyan(`${config.sys.compiler.name} v${config.sys.compiler.version}`));
  }

  try {
    // create an initial index.html file if one doesn't already exist
    // this is synchronous on purpose
    if (await !initIndexHtml(config, compilerCtx, buildCtx)) {
      // error initializing the index.html file
      // something's wrong, so let's not continue
      return finishBuild(config, compilerCtx, buildCtx);
    }

    if (!compilerCtx.isRebuild) {
      // empty the directories on the first build
      await emptyDestDir(config, compilerCtx);
    }

    // begin the build
    // async scan the src directory for ts files
    // then transpile them all in one go
    await transpileScanSrc(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // generation the app manifest from the compiled module file results
    // and from all the dependent collections
    await generateAppManifest(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // bundle modules and styles into separate files phase
    const bundles = await bundleModules(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // create each of the components's styles
    await generateStyles(config, compilerCtx, buildCtx, bundles);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // both styles and modules are done bundling
    // inject the styles into the modules and
    // generate each of the output bundles
    const cmpRegistry = generateBundles(config, compilerCtx, buildCtx, bundles);

    // generate the app files, such as app.js, app.core.js
    await generateAppFiles(config, compilerCtx, buildCtx, bundles, cmpRegistry);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // copy all assets
    if (!compilerCtx.isRebuild) {
      // only do the initial copy on the first build
      // watcher handles any re-copies
      await copyTasks(config, compilerCtx, buildCtx);
      if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);
    }

    // build index file and service worker
    await generateIndexHtml(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // generate each of the readmes
    await generateReadmes(config, compilerCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // prerender that app
    await prerenderApp(config, compilerCtx, buildCtx, bundles);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // write all the files and copy asset files
    await writeBuildFiles(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // setup watcher if need be
    initWatcher(config, compilerCtx, buildCtx);

  } catch (e) {
    // ¯\_(ツ)_/¯
    catchError(buildCtx.diagnostics, e);
  }

  // return what we've learned today
  return finishBuild(config, compilerCtx, buildCtx);
}
