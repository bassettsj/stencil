import { BasePlugin } from './base-plugin';
import { BuildCtx, CompilerCtx, Config } from '../../util/interfaces';
import { PluginLoadOptions, PluginLoadResults, PluginTransformOptions, PluginResolveIdOptions, PluginResolveIdResults, PluginTransformResults } from './plugin-interfaces';
import { StyleAutoPrefixerPlugin } from '../style/style-autoprefixer-plugin';
import { StyleMinifyPlugin } from '../style/style-minify-plugin';
import { StyleSassPlugin } from '../style/style-sass-plugin';


export function initPlugins(config: Config) {
  config.plugins = (config.plugins || []).filter(p => !!p);

  const styleSassPlugin = new StyleSassPlugin();
  config.plugins.push(styleSassPlugin);

  const styleMinifyPlugin = new StyleMinifyPlugin();
  config.plugins.push(styleMinifyPlugin);

  const styleAutoprefixerPlugin = new StyleAutoPrefixerPlugin();
  config.plugins.push(styleAutoprefixerPlugin);

  const basePlugin = new BasePlugin();
  config.plugins.push(basePlugin);
}


export async function runPluginResolveId(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, id: string): Promise<PluginResolveIdResults> {
  for (let i = 0; i < config.plugins.length - 1; i++) {
    const plugin = config.plugins[i];

    if (typeof plugin.resolveId === 'function') {
      try {
        const opts: PluginResolveIdOptions = {
          importee: id,
          importer: null,
          config: config,
          sys: config.sys,
          fs: compilerCtx.fs,
          filesWritten: buildCtx.filesWritten,
          filesCopied: buildCtx.filesCopied,
          filesDeleted: buildCtx.filesDeleted,
          dirsDeleted: buildCtx.dirsDeleted,
          dirsAdded: buildCtx.dirsAdded,
          filesChanged: buildCtx.filesChanged,
          filesUpdated: buildCtx.filesUpdated,
          filesAdded: buildCtx.filesAdded,
        };

        const resultsPromise = plugin.resolveId(opts);
        if (resultsPromise && resultsPromise instanceof Promise) {
          return await resultsPromise;
        }

      } catch (e) {
        config.logger.error(`${plugin.name} resolveId error: ${e}`);
      }
    }
  }

  throw new Error(`no plugin resolveId function found`);
}


export async function runPluginLoad(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, id: string): Promise<PluginLoadResults> {
  for (let i = 0; i < config.plugins.length - 1; i++) {
    const plugin = config.plugins[i];

    if (typeof plugin.load === 'function') {
      try {
        const opts: PluginLoadOptions = {
          id: id,
          config: config,
          sys: config.sys,
          fs: compilerCtx.fs,
          filesWritten: buildCtx.filesWritten,
          filesCopied: buildCtx.filesCopied,
          filesDeleted: buildCtx.filesDeleted,
          dirsDeleted: buildCtx.dirsDeleted,
          dirsAdded: buildCtx.dirsAdded,
          filesChanged: buildCtx.filesChanged,
          filesUpdated: buildCtx.filesUpdated,
          filesAdded: buildCtx.filesAdded,
        };

        const resultsPromise = plugin.load(opts);
        if (resultsPromise && resultsPromise instanceof Promise) {
          return await resultsPromise;
        }

      } catch (e) {
        config.logger.error(`${plugin.name} load error: ${e}`);
      }
    }
  }

  throw new Error(`no plugin load function found`);
}


export async function runPluginTransforms(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, id: string) {
  const resolveResults = await runPluginResolveId(config, compilerCtx, buildCtx, id);
  const loadResults = await runPluginLoad(config, compilerCtx, buildCtx, resolveResults.id);

  const transformResults: PluginTransformResults = {
    code: loadResults.code,
    id: loadResults.id
  };

  for (let i = 0; i < config.plugins.length - 1; i++) {
    const plugin = config.plugins[i];

    if (typeof plugin.transform === 'function') {
      try {
        const transformOpts: PluginTransformOptions = {
          code: transformResults.code,
          id: transformResults.id,
          config: config,
          sys: config.sys,
          fs: compilerCtx.fs,
          filesWritten: buildCtx.filesWritten,
          filesCopied: buildCtx.filesCopied,
          filesDeleted: buildCtx.filesDeleted,
          dirsDeleted: buildCtx.dirsDeleted,
          dirsAdded: buildCtx.dirsAdded,
          filesChanged: buildCtx.filesChanged,
          filesUpdated: buildCtx.filesUpdated,
          filesAdded: buildCtx.filesAdded,
        };

        const pluginTransformPromise = plugin.transform(transformOpts);
        if (pluginTransformPromise && pluginTransformPromise instanceof Promise) {
          const pluginTransformResults = await pluginTransformPromise;

          if (typeof pluginTransformResults.code === 'string') {
            transformResults.code = pluginTransformResults.code;
          }
          if (typeof pluginTransformResults.id === 'string') {
            transformResults.id = pluginTransformResults.id;
          }
        }

      } catch (e) {
        config.logger.error(`${plugin.name || 'Plugin'} transform error: ${e}`);
      }
    }
  }

  return transformResults;
}
