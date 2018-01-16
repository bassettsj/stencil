import { Config, Diagnostic, StencilSystem } from '../../util/interfaces';
import { InMemoryFileSystem } from '../../util/in-memory-fs';


export interface Plugin {
  load?: PluginLoadFn;
  name?: string;
  resolveId?: PluginResolveIdFn;
  transform?: PluginTransformFn;
}

export type PluginLoadFn = (opts: PluginLoadOptions) => Promise<PluginLoadResults>;


export interface PluginLoadResults {
  code: string;
  id: string;
}


export interface PluginLoadOptions extends PluginOptions {
  id: string;
}

export type PluginResolveIdFn = (opts: PluginResolveIdOptions) => Promise<PluginResolveIdResults>;


export interface PluginResolveIdOptions extends PluginOptions {
  importee: string;
  importer: string;
}


export interface PluginResolveIdResults {
  id: string;
}


export type PluginTransformFn = (opts: PluginTransformOptions) => Promise<PluginTransformResults>;


export interface PluginTransformOptions extends PluginOptions {
  code: string;
  id: string;
}


export interface PluginTransformResults {
  code: string;
  id?: string;
  diagnostics?: Diagnostic[];
}


export interface PluginOptions {
  config: Config;
  sys: StencilSystem;
  fs: InMemoryFileSystem;
  filesWritten: string[];
  filesCopied: string[];
  filesDeleted: string[];
  dirsDeleted: string[];
  dirsAdded: string[];
  filesChanged: string[];
  filesUpdated: string[];
  filesAdded: string[];
}

