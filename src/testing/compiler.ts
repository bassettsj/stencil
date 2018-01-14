import { Compiler } from '../compiler/index';
import { mockConfig } from './mocks';


export class TestingCompiler extends Compiler {

  constructor() {
    super(mockConfig());
  }

}
