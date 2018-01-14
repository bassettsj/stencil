import { BuildCtx, Config, CompilerCtx } from '../../util/interfaces';
import { catchError } from '../util';
import { copyComponentAssets } from '../component-plugins/assets-plugin';
import { generateDistribution } from './distribution';
import { writeAppManifest } from '../manifest/manifest-data';


export async function writeBuildFiles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // serialize and write the manifest file if need be
  writeAppManifest(config, compilerCtx, buildCtx);

  const timeSpan = config.logger.createTimeSpan(`writeBuildFiles started`, true);

  if (!compilerCtx.isRebuild) {
    // empty the directories on the first build
    await emptyDestDir(config, compilerCtx);
  }

  let totalFilesWrote = 0;

  try {
    const commitResults = await compilerCtx.fs.commit();

    buildCtx.filesWritten = commitResults.filesWritten;
    buildCtx.filesCopied = commitResults.filesCopied;
    buildCtx.filesDeleted = commitResults.filesDeleted;
    buildCtx.dirsDeleted = commitResults.dirsDeleted;
    buildCtx.dirsAdded = commitResults.dirsAdded;

    totalFilesWrote = commitResults.filesWritten.length;

    buildCtx.manifest.bundles.forEach(b => {
      b.components.forEach(c => buildCtx.components.push(c));
    });
    buildCtx.components.sort();

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  // kick off copying component assets
  // and copy www/build to dist/ if generateDistribution is enabled
  await Promise.all([
    copyComponentAssets(config, compilerCtx, buildCtx),
    generateDistribution(config, compilerCtx, buildCtx)
  ]);

  timeSpan.finish(`writeBuildFiles finished, files wrote: ${totalFilesWrote}`);
}


function emptyDestDir(config: Config, compilerCtx: CompilerCtx) {
  // empty promises :(
  const emptyPromises: Promise<any>[] = [];

  if (config.generateWWW && config.emptyWWW) {
    config.logger.debug(`empty buildDir: ${config.buildDir}`);
    emptyPromises.push(compilerCtx.fs.emptyDir(config.buildDir));
  }

  if (config.generateDistribution && config.emptyDist) {
    config.logger.debug(`empty distDir: ${config.distDir}`);
    emptyPromises.push(compilerCtx.fs.emptyDir(config.distDir));
  }
  // let's empty out the build dest directory
  return Promise.all(emptyPromises);
}
