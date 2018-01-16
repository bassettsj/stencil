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

    const cacheKey = this.name + context.sys.generateContentHash(sourceText, 24);
    const cachedContent = await context.cache.get(cacheKey);

    if (cachedContent !== null) {
      results.code = cachedContent;

    } else {
      results.code = await new Promise<string>((resolve, reject) => {
        const renderOpts = Object.assign({}, this.renderOpts);
        renderOpts.data = sourceText;
        if (!renderOpts.outputStyle) {
          renderOpts.outputStyle = 'expanded';
        }

        nodeSass.render(renderOpts, async (err: any, sassResult: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(sassResult.css.toString());
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
