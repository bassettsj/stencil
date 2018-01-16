import { Plugin, PluginCtx } from './plugin-interfaces';


export class BasePlugin implements Plugin {

  async resolveId(importee: string) {
    return importee;
  }

  async load(id: string, context: PluginCtx) {
    return await context.fs.readFile(id);
  }

  get name() {
    return 'BasePlugin';
  }

}
