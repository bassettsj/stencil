import { Plugin, PluginTransformOptions, PluginTransformResults } from '../../compiler/plugin/plugin-interfaces';
import nodeSass from 'node-sass';


export class StyleSassPlugin implements Plugin {
  cache: { [key: string]: string } = {};

  constructor(private renderOpts: RenderOptions = {}) {}

  async transform(opts: PluginTransformOptions) {
    if (!this.usePlugin(opts.id)) {
      return null;
    }

    opts.filesChanged.forEach(filePath => {
      // clear out the cache
      delete this.cache[filePath];
    });

    const results: PluginTransformResults = {
      code: opts.code
    };

    // create a new css file path
    const pathParts = opts.id.split('.');
    pathParts.pop();
    pathParts.push('css');
    results.id = pathParts.join('.');

    if (this.cache[opts.id]) {
      results.code = this.cache[opts.id];
    } else {
      this.render(opts, results);
    }

    return results;
  }

  render(opts: PluginTransformOptions, results: PluginTransformResults) {
    return new Promise<string>((resolve, reject) => {
      const renderOpts = Object.assign({}, this.renderOpts);
      renderOpts.data = opts.code;
      if (!renderOpts.outputStyle) {
        renderOpts.outputStyle = 'expanded';
      }

      nodeSass.render(renderOpts, async (err, sassResult) => {
        if (err) {
          reject(err);

        } else {
          results.code = sassResult.css.toString();
          this.cache[opts.id] = results.code;
          await opts.fs.writeFile(results.id, results.code);

          resolve();
        }
      });
    });
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
