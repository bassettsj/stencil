import { Config, CompilerCtx } from '../../util/interfaces';
import { catchError, getCompilerCtx, hasError } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { generateReadmes } from './generate-readmes';
import { getBuildContext } from '../build/build-utils';
import { transpileScanSrc } from '../transpile/transpile-scan-src';


export async function docs(config: Config, compilerCtx: CompilerCtx) {
  compilerCtx = getCompilerCtx(config, compilerCtx);
  const buildCtx = getBuildContext(config, compilerCtx, null);

  config.logger.info(config.logger.cyan(`${config.sys.compiler.name} v${config.sys.compiler.version}`));

  // keep track of how long the entire build process takes
  const timeSpan = config.logger.createTimeSpan(`generate docs, ${config.fsNamespace}, started`);

  try {
    // begin the build
    // async scan the src directory for ts files
    // then transpile them all in one go
    await transpileScanSrc(config, compilerCtx, buildCtx);

    // generate each of the readmes
    await generateReadmes(config, compilerCtx);

  } catch (e) {
    // catch all phase
    catchError(buildCtx.diagnostics, e);
  }

  // finalize phase
  buildCtx.diagnostics = cleanDiagnostics(buildCtx.diagnostics);
  config.logger.printDiagnostics(buildCtx.diagnostics);

  // create a nice pretty message stating what happend
  let buildStatus = 'finished';
  let statusColor = 'green';

  if (hasError(buildCtx.diagnostics)) {
    buildStatus = 'failed';
    statusColor = 'red';
  }

  timeSpan.finish(`generate docs ${buildStatus}`, statusColor, true, true);
}
