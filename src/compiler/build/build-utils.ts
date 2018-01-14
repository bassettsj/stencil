import { BuildCtx, BuildResults, CompilerCtx, Config, WatcherResults } from '../../util/interfaces';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { hasError } from '../util';


export function getBuildContext(config: Config, compilerCtx: CompilerCtx, watcher: WatcherResults) {
  // do a full build if there is no watcher
  // or the watcher said the config has updated
  const requiresFullBuild = !watcher || watcher.configUpdated;

  const isRebuild = !!watcher;
  compilerCtx.isRebuild = isRebuild;

  const msg = `${isRebuild ? 'rebuild' : 'build'}, ${config.fsNamespace}, ${config.devMode ? 'dev' : 'prod'} mode, started`;

  // increment the active build id
  compilerCtx.activeBuildId++;

  // data for one build
  const buildCtx: BuildCtx = {
    requiresFullBuild: requiresFullBuild,
    buildId: compilerCtx.activeBuildId,
    diagnostics: [],
    manifest: {},
    transpileBuildCount: 0,
    styleBuildCount: 0,
    bundleBuildCount: 0,
    appFileBuildCount: 0,
    indexBuildCount: 0,
    watcher: watcher,
    aborted: false,
    startTime: Date.now(),
    timeSpan: config.logger.createTimeSpan(msg),
    components: [],
    filesWritten: [],
    filesCopied: [],
    filesDeleted: [],
    dirsDeleted: [],
    dirsAdded: [],
  };

  return buildCtx;
}


export function finishBuild(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  buildCtx.diagnostics = cleanDiagnostics(buildCtx.diagnostics);
  config.logger.printDiagnostics(buildCtx.diagnostics);

  if (buildCtx.aborted) {
    buildCtx.timeSpan.finish('...', 'dim', false, true);

  } else {
    // create a nice pretty message stating what happend
    const buildText = compilerCtx.isRebuild ? 'rebuild' : 'build';
    const watchText = config.watch ? ', watching for changes...' : '';
    let buildStatus = 'finished';
    let statusColor = 'green';

    if (hasError(buildCtx.diagnostics)) {
      buildStatus = 'failed';
      statusColor = 'red';
    }

    // print out the time it took to build
    // and add the duration to the build results
    buildCtx.timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);
  }

  const buildResults = generateBuildResults(config, compilerCtx, buildCtx);

  // emit a build event, which happens for inital build and rebuilds
  compilerCtx.events.emit('build', buildResults);

  if (compilerCtx.isRebuild) {
    // emit a rebuild event, which happens only for rebuilds
    compilerCtx.events.emit('rebuild', buildResults);
  }

  return buildResults;
}


export function generateBuildResults(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    buildId: buildCtx.buildId,
    diagnostics: buildCtx.diagnostics,
    hasError: hasError(buildCtx.diagnostics),
    aborted: buildCtx.aborted
  };

  // only bother adding the buildStats config is enabled
  // useful for testing/debugging
  if (config.buildStats) {
    generateBuildResultsStats(compilerCtx, buildCtx, buildResults);
  }

  return buildResults;
}


function generateBuildResultsStats(compilerCtx: CompilerCtx, buildCtx: BuildCtx, buildResults: BuildResults) {
  // stuff on the right are internal property names
  // stuff set on the left is public and should not be refactored
  buildResults.stats = {
    duration: Date.now() - buildCtx.startTime,
    isRebuild: compilerCtx.isRebuild,
    components: buildCtx.components,
    transpileBuildCount: buildCtx.transpileBuildCount,
    bundleBuildCount: buildCtx.bundleBuildCount,
    styleBuildCount: buildCtx.styleBuildCount,
    filesWritten: buildCtx.filesWritten.sort()
  };

  if (buildCtx.watcher) {
    buildResults.stats.filesChanged = buildCtx.watcher.filesChanged.slice().sort();
    buildResults.stats.filesUpdated = buildCtx.watcher.filesUpdated.slice().sort();
    buildResults.stats.filesAdded = buildCtx.watcher.filesAdded.slice().sort();
    buildResults.stats.filesDeleted = buildCtx.watcher.filesDeleted.slice().sort();
    buildResults.stats.dirsAdded = buildCtx.watcher.dirsAdded.slice().sort();
    buildResults.stats.dirsDeleted = buildCtx.watcher.dirsDeleted.slice().sort();
    buildResults.stats.configUpdated = buildCtx.watcher.configUpdated;
  } else {
    buildResults.stats.filesChanged = [];
    buildResults.stats.filesUpdated = [];
    buildResults.stats.filesAdded = [];
    buildResults.stats.filesDeleted = [];
    buildResults.stats.dirsAdded = [];
    buildResults.stats.dirsDeleted = [];
    buildResults.stats.configUpdated = false;
  }
}


export function shouldAbort(ctx: CompilerCtx, buildCtx: BuildCtx) {
  if (ctx.activeBuildId > buildCtx.buildId) {
    buildCtx.aborted = true;
    return true;
  }

  if (hasError(buildCtx.diagnostics)) {
    // remember if the last build had an error or not
    // this is useful if the next build should do a full build or not
    ctx.lastBuildHadError = true;

    buildCtx.aborted = true;
    return true;
  }

  return false;
}
