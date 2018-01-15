import { BuildCtx, Bundle, CompilerCtx, ComponentMeta, Config, Diagnostic, ManifestBundle, ModuleFile } from '../../util/interfaces';
import { buildError, catchError } from '../util';
import { bundleModules } from './bundle-modules';
import { DEFAULT_STYLE_MODE, ENCAPSULATION } from '../../util/constants';
import { requiresScopedStyles } from './component-styles';
import { upgradeDependentComponents } from '../upgrade-dependents/index';


export async function bundle(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  let bundles: Bundle[] = [];

  if (config.generateWWW) {
    config.logger.debug(`bundle, buildDir: ${config.buildDir}`);
  }

  if (config.generateDistribution) {
    config.logger.debug(`bundle, distDir: ${config.distDir}`);
  }

  const timeSpan = config.logger.createTimeSpan(`bundling started`, true);

  try {
    // get all of the bundles from the manifest bundles
    bundles = getBundlesFromManifest(buildCtx.manifest.modulesFiles, buildCtx.manifest.bundles, buildCtx.diagnostics);

    // Look at all dependent components from outside collections and
    // upgrade the components to be compatible with this version if need be
    await upgradeDependentComponents(config, compilerCtx, buildCtx, bundles);

    // kick off bundling
    await bundleModules(config, compilerCtx, buildCtx, bundles);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish(`bundling finished`);

  return bundles;
}


export function getBundlesFromManifest(moduleFiles: ModuleFile[], manifestBundles: ManifestBundle[], diagnostics: Diagnostic[]) {
  const bundles: Bundle[] = [];

  manifestBundles.filter(b => b.components && b.components.length).forEach(manifestBundle => {
    const bundle: Bundle = {
      moduleFiles: [],
      compiledModuleText: ''
    };

    manifestBundle.components.forEach(tag => {
      const cmpMeta = moduleFiles.find(modulesFile => modulesFile.cmpMeta.tagNameMeta === tag);
      if (cmpMeta) {
        bundle.moduleFiles.push(cmpMeta);

      } else {
        buildError(diagnostics).messageText = `Component tag "${tag}" is defined in a bundle but no matching component was found within this app or collections.`;
      }
    });

    if (bundle.moduleFiles.length > 0) {
      updateBundleData(bundle);
      bundles.push(bundle);
    }
  });

  // always consistently sort them
  return sortBundles(bundles);
}


export function updateBundleData(bundle: Bundle) {
  // generate a unique entry key based on the components within this bundle
  bundle.entryKey = 'bundle:' + bundle.moduleFiles.map(m => m.cmpMeta.tagNameMeta).sort().join('.');

  // get the modes used in this bundle
  bundle.modeNames = getBundleModes(bundle.moduleFiles);

  // get the encapsulations used in this bundle
  const encapsulations = getBundleEncapsulations(bundle);

  // figure out if we'll need an unscoped css build
  bundle.requiresScopedStyles = bundleRequiresScopedStyles(encapsulations);

  // figure out if we'll need a scoped css build
  bundle.requiresScopedStyles = bundleRequiresScopedStyles(encapsulations);
}


export function getBundleModes(moduleFiles: ModuleFile[]) {
  const styleModeNames: string[] = [];

  moduleFiles.forEach(m => {
    const cmpStyleModes = getComponentStyleModes(m.cmpMeta);
    cmpStyleModes.forEach(modeName => {
      if (!styleModeNames.includes(modeName)) {
        styleModeNames.push(modeName);
      }
    });
  });

  if (styleModeNames.length === 0) {
    styleModeNames.push(DEFAULT_STYLE_MODE);

  } else if (styleModeNames.length > 1) {
    let index = (styleModeNames.indexOf(DEFAULT_STYLE_MODE));
    if (index > -1) {
      styleModeNames.splice(index, 1);
    }
  }

  return styleModeNames.sort();
}


export function getComponentStyleModes(cmpMeta: ComponentMeta) {
  return (cmpMeta && cmpMeta.stylesMeta) ? Object.keys(cmpMeta.stylesMeta) : [];
}


export function getBundleEncapsulations(bundle: Bundle) {
  const encapsulations: ENCAPSULATION[] = [];

  bundle.moduleFiles.forEach(m => {
    const encapsulation = m.cmpMeta.encapsulation || ENCAPSULATION.NoEncapsulation;
    if (!encapsulations.includes(encapsulation)) {
      encapsulations.push(encapsulation);
    }
  });

  if (encapsulations.length === 0) {
    encapsulations.push(ENCAPSULATION.NoEncapsulation);

  } else if (encapsulations.includes(ENCAPSULATION.ShadowDom) && !encapsulations.includes(ENCAPSULATION.ScopedCss)) {
    encapsulations.push(ENCAPSULATION.ScopedCss);
  }

  return encapsulations.sort();
}


export function bundleRequiresScopedStyles(encapsulations?: ENCAPSULATION[]) {
  return encapsulations.some(e => requiresScopedStyles(e));
}


export function sortBundles(bundles: Bundle[]) {
  // sort components by tagname within each bundle
  bundles.forEach(m => {
    m.moduleFiles = m.moduleFiles.sort((a, b) => {
      if (a.cmpMeta.tagNameMeta < b.cmpMeta.tagNameMeta) return -1;
      if (a.cmpMeta.tagNameMeta > b.cmpMeta.tagNameMeta) return 1;
      return 0;
    });
  });

  // sort each bundle by the first component's tagname
  return bundles.sort((a, b) => {
    if (a.moduleFiles[0].cmpMeta.tagNameMeta < b.moduleFiles[0].cmpMeta.tagNameMeta) return -1;
    if (a.moduleFiles[0].cmpMeta.tagNameMeta > b.moduleFiles[0].cmpMeta.tagNameMeta) return 1;
    return 0;
  });
}
