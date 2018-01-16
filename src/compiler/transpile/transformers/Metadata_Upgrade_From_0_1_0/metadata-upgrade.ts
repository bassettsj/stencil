import { addStaticMeta } from '../add-component-metadata';
import { Bundle, ComponentMeta } from '../../../../util/interfaces';
import { normalizePath } from '../../../util';
import * as ts from 'typescript';


export default function upgradeFromMetadata(bundles: Bundle[]) {

  return (tsSourceFile: ts.SourceFile) => {
    const tsFilePath = normalizePath(tsSourceFile.fileName);

    const bundle = bundles.find(m => {
      return m.moduleFiles.some(m => m.cmpMeta && normalizePath(m.jsFilePath) === tsFilePath);
    });

    if (!bundle) {
      return tsSourceFile;
    }

    const moduleFile = bundle.moduleFiles.find(m => m.cmpMeta && normalizePath(m.jsFilePath) === tsFilePath);

    if (moduleFile) {
      tsSourceFile = upgradeModuleFile(tsSourceFile, moduleFile.cmpMeta);
    }

    return tsSourceFile;
  };
}


function upgradeModuleFile(tsSourceFile: ts.SourceFile, cmpMeta: ComponentMeta) {
  const staticMembers = addStaticMeta(cmpMeta);

  const newStatements: any = Object.keys(staticMembers).map(memberName => {
    return ts.createBinary(
      ts.createPropertyAccess(ts.createIdentifier(cmpMeta.componentClass), memberName),
      ts.createToken(ts.SyntaxKind.EqualsToken),
      (staticMembers as any)[memberName]
    );
  });

  return ts.updateSourceFileNode(tsSourceFile, [
    ...tsSourceFile.statements,
    ...newStatements
  ]);
}
