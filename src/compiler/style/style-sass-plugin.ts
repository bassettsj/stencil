import { Plugin, PluginTransformResults, PluginCtx } from '../../compiler/plugin/plugin-interfaces';
const nodeSass = require('node-sass');


export class StyleSassPlugin implements Plugin {

  constructor(private renderOpts: RenderOptions = {}) {}

  async transform(sourceText: string, id: string, context: PluginCtx) {
    if (!this.usePlugin(id)) {
      return null;
    }

    const results: PluginTransformResults = {};

    // create what the new path is post transform (.css)
    const pathParts = id.split('.');
    pathParts.pop();
    pathParts.push('css');
    results.id = pathParts.join('.');

    const cacheKey = context.cache.createKey(this.name, sourceText);
    const cachedContent = await context.cache.get(cacheKey);

    if (cachedContent != null) {
      results.code = cachedContent;

    } else {
      results.code = await new Promise<string>((resolve, reject) => {
        const renderOpts = Object.assign({}, this.renderOpts);
        renderOpts.data = sourceText;
        if (!renderOpts.outputStyle) {
          renderOpts.outputStyle = 'expanded';
        }

        renderOpts.includePaths = renderOpts.includePaths || [];

        const dirName = context.sys.path.dirname(id);
        renderOpts.includePaths.push(dirName);

        nodeSass.render(renderOpts, async (err: any, sassResult: any) => {
          if (err) {
            reject(err);

          } else {
            const css = sassResult.css.toString();

            // write this css content to memory only so it can be referenced
            // later by other plugins (minify css)
            // but no need to actually write to disk
            await context.fs.writeFile(results.id, css, { inMemoryOnly: true });
            resolve(css);
          }
        });
      });
      await context.cache.put(cacheKey, results.code);
    }

    return results;
  }

  usePlugin(id: string) {
    return /(.scss|.sass)$/i.test(id);
  }

  get name() {
    return 'StyleSassPlugin';
  }

}


export interface RenderOptions {
  file?: string;
  data?: string;
  functions?: { [key: string]: Function };
  includePaths?: string[];
  indentedSyntax?: boolean;
  indentType?: string;
  indentWidth?: number;
  linefeed?: string;
  omitSourceMapUrl?: boolean;
  outFile?: string;
  outputStyle?: 'compact' | 'compressed' | 'expanded' | 'nested';
  precision?: number;
  sourceComments?: boolean;
  sourceMap?: boolean | string;
  sourceMapContents?: boolean;
  sourceMapEmbed?: boolean;
  sourceMapRoot?: string;
}
