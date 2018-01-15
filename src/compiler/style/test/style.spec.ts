import { cleanStyle } from '../style-utils';


describe('component-styles', () => {

  describe('cleanStyle', () => {

    it(`should allow @ in selectors`, () => {
      const cleaned = cleanStyle('.container--small\@tablet{}');
      expect(cleaned).toBe(`.container--small\\@tablet{}`);
    });

  });

});
