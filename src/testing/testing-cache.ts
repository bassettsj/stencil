

export class TestingCache {

  async get(_key: string): Promise<string> {
    return null;
  }

  async put(_key: string, _value: string): Promise<boolean> {
    return false;
  }

  createKey(domain: string, _content: string) {
    return domain;
  }

  commit() {}
}
