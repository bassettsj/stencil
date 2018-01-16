import { Plugin, PluginTransformOptions, PluginTransformResults } from '../../compiler/plugin/plugin-interfaces';


export class StyleAutoPrefixerPlugin implements Plugin {
  cache: { [key: string]: string } = {};

  async transform(opts: PluginTransformOptions) {
    if (!this.usePlugin(opts.id)) {
      return null;
    }

    const results: PluginTransformResults = {
      code: opts.code,
      id: opts.id
    };

    return results;
  }

  usePlugin(id: string) {
    return /(.css)$/i.test(id);
  }

  get name() {
    return 'StyleAutoPrefixerPlugin';
  }

}
