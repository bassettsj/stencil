import { BuildConditionals, Diagnostic, TranspileResults, CompilerCtx, Config } from '../../util/interfaces';
import { buildConditionalsTransform } from './transformers/build-conditionals';
import { loadTypeScriptDiagnostics } from '../../util/logger/logger-typescript';
import * as ts from 'typescript';


export async function transpileCoreBuild(config: Config, compilerCtx: CompilerCtx, coreBuild: BuildConditionals, input: string) {
  const results: TranspileResults = {
    code: null,
    diagnostics: null
  };

  let cacheKey = 'Core';
  Object.keys(coreBuild).forEach((key, i) => {
    if ((coreBuild as any)[key]) {
      cacheKey += '_' + key + '_' + i;
    }
  });
  cacheKey = 'Core_' + config.sys.generateContentHash(cacheKey, 12);

  cacheKey = compilerCtx.cache.createKey(cacheKey, input);
  const cachedContent = await compilerCtx.cache.get(cacheKey);
  if (cachedContent != null) {
    results.code = cachedContent;
    results.diagnostics = [];
    return results;
  }

  const diagnostics: Diagnostic[] = [];

  const transpileOpts: ts.TranspileOptions = {
    compilerOptions: getCompilerOptions(coreBuild),
    transformers: {
      before: [
        buildConditionalsTransform(coreBuild)
      ]
    }
  };

  const tsResults = ts.transpileModule(input, transpileOpts);

  loadTypeScriptDiagnostics('', diagnostics, tsResults.diagnostics);

  if (diagnostics.length) {
    results.diagnostics = diagnostics;
    results.code = input;
    return results;
  }

  results.code = tsResults.outputText;

  await compilerCtx.cache.put(cacheKey, results.code);

  return results;
}


export async function transpileToEs5(compilerCtx: CompilerCtx, input: string) {
  const diagnostics: Diagnostic[] = [];
  const results: TranspileResults = {
    code: null,
    diagnostics: null
  };

  const cacheKey = compilerCtx.cache.createKey('TranspileToEs5', input);
  const cachedContent = await compilerCtx.cache.get(cacheKey);
  if (cachedContent != null) {
    results.code = cachedContent;
    results.diagnostics = [];
    return results;
  }

  const transpileOpts: ts.TranspileOptions = {
    compilerOptions: {
      allowJs: true,
      declaration: false,
      target: ts.ScriptTarget.ES5
    }
  };

  const tsResults = ts.transpileModule(input, transpileOpts);

  loadTypeScriptDiagnostics('', diagnostics, tsResults.diagnostics);

  if (diagnostics.length > 0) {
    results.diagnostics = diagnostics;
    results.code = input;
    return results;
  }

  results.code = tsResults.outputText;
  await compilerCtx.cache.put(cacheKey, results.code);

  return results;
}


function getCompilerOptions(coreBuild: BuildConditionals) {
  const opts: ts.CompilerOptions = {
    allowJs: true,
    declaration: false
  };

  if (coreBuild.es5) {
    opts.target = ts.ScriptTarget.ES5;

  } else {
    opts.target = ts.ScriptTarget.ES2015;
  }

  return opts;
}
