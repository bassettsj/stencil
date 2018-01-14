import { Compiler } from '../compiler/index';
import { mockConfig } from './mocks';


export class TestingCompiler extends Compiler {

  constructor() {
    const config = mockConfig();
    super(config);
  }

}
