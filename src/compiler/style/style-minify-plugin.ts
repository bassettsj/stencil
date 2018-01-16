import { Plugin, PluginTransformOptions, PluginTransformResults } from '../../compiler/plugin/plugin-interfaces';


export class StyleMinifyPlugin implements Plugin {
  cache: { [key: string]: string } = {};

  async transform(opts: PluginTransformOptions) {
    if (!opts.config.minifyCss || !this.usePlugin(opts.id)) {
      return null;
    }

    const results: PluginTransformResults = {
      code: opts.code,
      diagnostics: []
    };

    const cacheKey = opts.sys.generateContentHash(opts.code, 24);

    if (this.cache[cacheKey]) {
      results.code = this.cache[cacheKey];

    } else {
      const minifyResults = opts.sys.minifyCss(results.code);
      minifyResults.diagnostics.forEach(d => {
        results.diagnostics.push(d);
      });

      if (minifyResults.output) {
        results.code = minifyResults.output;
        this.cache[cacheKey] = results.code;
      }
    }

    return results;
  }

  usePlugin(id: string) {
    return /(.css)$/i.test(id);
  }

  get name() {
    return 'StyleMinifyPlugin';
  }

}
