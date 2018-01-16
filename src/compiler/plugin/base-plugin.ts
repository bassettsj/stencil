import { Plugin, PluginLoadOptions, PluginLoadResults, PluginResolveIdOptions, PluginResolveIdResults } from './plugin-interfaces';


export class BasePlugin implements Plugin {

  async resolveId(opts: PluginResolveIdOptions) {
    const results: PluginResolveIdResults = {
      id: opts.importee
    };
    return results;
  }

  async load(opts: PluginLoadOptions) {
    const results: PluginLoadResults = {
      code: await opts.fs.readFile(opts.id),
      id: opts.id
    };
    return results;
  }

  get name() {
    return 'BasePlugin';
  }

}
