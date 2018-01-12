import { Config, CopyTask } from '../../../util/interfaces';
import { getSrcAbsPath, getDestAbsPath, getGlobCopyTask, isCopyTaskFile, processCopyTask, processCopyTasks } from '../copy-tasks';
import { mockStencilSystem } from '../../../testing/mocks';


describe('copy tasks', () => {

  describe('processCopyTasks', () => {

    it('should throw error when dest is a glob', async () => {
      try {
        const copyTask: CopyTask = {
          src: 'assets',
          dest: '**/*'
        };
        await processCopyTasks(config, {}, [], copyTask);
        expect('this should').toBe('get called');

      } catch (e) {}
    });

    it('should throw error when missing src', async () => {
      try {
        const copyTask: CopyTask = {};
        await processCopyTasks(config, {}, [], copyTask);

      } catch (e) {}
    });

    it('should resolve with null copy task', () => {
      return processCopyTasks(config, {}, [], null).then(r => {
        expect(r).toBe(null);
      });
    });

  });

  describe('getGlobCopyTask', () => {

    it('should get glob files and set absolute dest with absolute dest', () => {
      const copyTask: CopyTask = {
        src: 'assets/**/*.js',
        dest: '/User/marty/my-app/www/abs-images'
      };
      const p = getGlobCopyTask(config, copyTask, 'assets/bear.js');
      expect(p.dest).toBe('/User/marty/my-app/www/abs-images/bear.js');
    });

    it('should get glob files and set absolute dest with relative dest', () => {
      const copyTask: CopyTask = {
        src: 'assets/**/*.js',
        dest: 'images'
      };
      const p = getGlobCopyTask(config, copyTask, 'assets/bear.js');
      expect(p.dest).toBe('/User/marty/my-app/www/images/bear.js');
    });

    it('should get glob files and set absolute dest when missing dest', () => {
      const copyTask: CopyTask = {
        src: 'assets/**/*.js'
      };
      const p = getGlobCopyTask(config, copyTask, 'assets/bear.js');
      expect(p.dest).toBe('/User/marty/my-app/www/assets/bear.js');
    });

  });

  describe('filter', () => {

    it('should filter via function', () => {
      const copyTask: CopyTask = {
        src: '/User/marty/my-app/src/assets/readme.md',
        dest: '/User/marty/my-app/www/images/readme.md',
        filter: function(src) {
          return (/\.js$/i).test(src);
        }
      };
      const p = processCopyTask(config, copyTask);
      expect(p.filter()).toBe(false);
    });

  });

  describe('getDestAbsPath', () => {

    it('should get "dest" path when "dest" is relative and "src" is relative', () => {
      const src = 'assets/bear.jpg';
      const dest = 'images/bear.jpg';
      const p = getDestAbsPath(config, src, dest);
      expect(p).toBe('/User/marty/my-app/www/images/bear.jpg');
    });

    it('should get "dest" path when "dest" is relative and "src" is absolute', () => {
      const src = '/User/marty/my-app/src/assets/bear.jpg';
      const dest = 'images/bear.jpg';
      const p = getDestAbsPath(config, src, dest);
      expect(p).toBe('/User/marty/my-app/www/images/bear.jpg');
    });

    it('should get "dest" path when "dest" is absolute', () => {
      const src = '/User/marty/my-app/src/assets/bear.jpg';
      const dest = '/User/marty/my-app/www/images/bear.jpg';
      const p = getDestAbsPath(config, src, dest);
      expect(p).toBe('/User/marty/my-app/www/images/bear.jpg');
    });

    it('should get "dest" path when missing "dest" path and "src" is relative', () => {
      const src = 'assets/bear.jpg';
      const p = getDestAbsPath(config, src);
      expect(p).toBe('/User/marty/my-app/www/assets/bear.jpg');
    });

    it('should throw error when missing "dest" path and "src" is absolute', () => {
      expect(() => {
        getDestAbsPath(config, '/User/big/bear.jpg');
      }).toThrow();
    });

  });

  describe('getSrcAbsPath', () => {

    it('should get from relative node_module file path', () => {
      const p = getSrcAbsPath(config, '../node_modules/some-package/index.js');
      expect(p).toBe('/User/marty/my-app/node_modules/some-package/index.js');
    });

    it('should get from relative file path', () => {
      const p = getSrcAbsPath(config, 'assets/bear.jpg');
      expect(p).toBe('/User/marty/my-app/src/assets/bear.jpg');
    });

    it('should get from absolute file path', () => {
      const p = getSrcAbsPath(config, '/User/big/bear.jpg');
      expect(p).toBe('/User/big/bear.jpg');
    });

  });

  describe('isCopyTaskFile', () => {

    it('not copy abs path src file', () => {
      config.copy = {
        assets: {
          src: '/User/marty/my-app/src/assets/image.jpg'
        }
      };
      const filePath = '/User/marty/my-app/src/something-else/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(false);
    });

    it('copy abs path src file', () => {
      config.copy = {
        assets: {
          src: '/User/marty/my-app/src/assets/image.jpg'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('not copy relative path src file', () => {
      config.copy = {
        assets: {
          src: './assets/image.jpg'
        }
      };
      const filePath = '/User/marty/my-app/src/something-else/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(false);
    });

    it('copy relative path src file', () => {
      config.copy = {
        assets: {
          src: './assets/image.jpg'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('not copy abs path src dir', () => {
      config.copy = {
        assets: {
          src: '/User/marty/my-app/src/assets'
        }
      };
      const filePath = '/User/marty/my-app/src/something-else/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(false);
    });

    it('copy abs path src dir', () => {
      config.copy = {
        assets: {
          src: '/User/marty/my-app/src/assets'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('not copy relative path src dir', () => {
      config.copy = {
        assets: {
          src: 'assets'
        }
      };
      const filePath = '/User/marty/my-app/src/something-else/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(false);
    });

    it('copy relative path src dir', () => {
      config.copy = {
        assets: {
          src: 'assets'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('copy assets glob file', () => {
      config.copy = {
        assets: {
          src: 'assets/**/*.jpg'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('copy assets glob wildcard', () => {
      config.copy = {
        assets: {
          src: 'assets/*'
        }
      };
      const filePath = '/User/marty/my-app/src/assets/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(true);
    });

    it('not copy assets glob wildcard', () => {
      config.copy = {
        assets: {
          src: 'assets/*'
        }
      };
      const filePath = '/User/marty/my-app/src/something-else/image.jpg';
      expect(isCopyTaskFile(config, filePath)).toBe(false);
    });

  });


  var config: Config;
  var sys = mockStencilSystem();

  beforeEach(() => {
    config = {
      sys: sys,
      srcDir: '/User/marty/my-app/src',
      wwwDir: '/User/marty/my-app/www'
    };
  });

});
