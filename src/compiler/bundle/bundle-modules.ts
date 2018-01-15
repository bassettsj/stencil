import { BuildCtx, Bundle, Config, CompilerCtx, ModuleFile } from '../../util/interfaces';
import { catchError, hasError, isTsFile } from '../util';
import { generateEsModule, generateLegacyModule, runRollup } from './rollup-bundle';


export async function bundleModules(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle[]) {
  // create main module results object
  if (hasError(buildCtx.diagnostics)) {
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`bundle modules started`, true);

  try {
    await Promise.all(bundles.map(async bundle => {
      await generateComponentModules(config, compilerCtx, buildCtx, bundle);
    }));

  } catch (err) {
    catchError(buildCtx.diagnostics, err);
  }

  timeSpan.finish('bundle modules finished');
}


export async function generateComponentModules(config: Config, contextCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle) {
  if (canSkipBundle(config, contextCtx, buildCtx, bundles.moduleFiles, bundles.entryKey)) {
    // we can skip bundling, let's use our cached data
    bundles.compiledModuleText = contextCtx.compiledModuleText[bundles.entryKey];
    bundles.compiledModuleLegacyText = contextCtx.compiledModuleLegacyText[bundles.entryKey];
    return;
  }

  // keep track of module bundling for testing
  buildCtx.bundleBuildCount++;

  // run rollup, but don't generate yet
  // returned rollup bundle can be reused for es module and legacy
  const rollupBundle = await runRollup(config, contextCtx, buildCtx, bundles);

  // bundle using only es modules and dynamic imports
  bundles.compiledModuleText = await generateEsModule(config, rollupBundle);

  // cache for later
  contextCtx.compiledModuleText[bundles.entryKey] = bundles.compiledModuleText;

  if (config.buildEs5) {
    // only create legacy modules when generating es5 fallbacks
    // bundle using commonjs using jsonp callback
    bundles.compiledModuleLegacyText = await generateLegacyModule(config, rollupBundle);

    // cache for later
    contextCtx.compiledModuleLegacyText[bundles.entryKey] = bundles.compiledModuleLegacyText;
  }
}


export function canSkipBundle(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, moduleFiles: ModuleFile[], cacheKey: string) {
  if (!buildCtx.requiresFullBuild) {
    // cannot skip if this is a full build
    return false;
  }

  if (!compilerCtx.compiledModuleText[cacheKey]) {
    // cannot skip if there isn't anything cached
    return false;
  }

  if (!buildCtx.filesChanged.some(isTsFile)) {
    // skip if there wasn't a ts file change
    return true;
  }

  // get a list of filepaths that are components
  const componentFilePaths = Object.keys(compilerCtx.moduleFiles).filter(filePath => {
    return !!(compilerCtx.moduleFiles[filePath].cmpMeta);
  });

    // if the changed file is a typescript file
    // and the typescript file isn't a component then
    // we must do a rebuild. Basically we don't know if this
    // typescript file affects this bundle or not
  const isNonComponentTsFileChange = componentFilePaths.some(componentFilePath => {
    return buildCtx.filesChanged.some(changedFilePath => changedFilePath === componentFilePath);
  });

  if (isNonComponentTsFileChange) {
    // we've got a changed ts file that isn't a component
    // so it could be like dependent library
    // we cannot skip bundling
    return false;
  }

  // check if this bundle has one of the changed files
  const bundleContainsChangedFile = bundledComponentContainsChangedFile(config, moduleFiles, buildCtx.filesChanged);
  if (!bundleContainsChangedFile) {
    // don't bother bundling, none of the changed files have the same filename
    return true;
  }

  // idk, probs need to bundle, can't skip
  return false;
}


export function bundledComponentContainsChangedFile(config: Config, bundlesModuleFiles: ModuleFile[], changedFiles: string[]) {
  // loop through all the changed typescript filenames and see if there are corresponding js filenames
  // if there are no filenames that match then let's not bundle
  // yes...there could be two files that have the same filename in different directories
  // but worst case scenario is that both of them run their bundling, which isn't a performance problem
  return bundlesModuleFiles.some(moduleFile => {
    // get the basename without any extension
    const distFileName = config.sys.path.basename(moduleFile.jsFilePath, '.js');

    return changedFiles.some(f => {
      // compare the basename like it had a ts extension
      // to one the changed file
      const changedFileName = config.sys.path.basename(f);
      return (changedFileName === distFileName + '.ts' || changedFileName === distFileName + '.tsx');
    });
  });
}
