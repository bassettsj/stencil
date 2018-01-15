import { ENCAPSULATION } from '../../util/constants';


export function canSkipStyleCompiling() {

}


export function cleanStyle(style: string) {
  return style.replace(/\r\n|\r|\n/g, `\\n`)
              .replace(/\"/g, `\\"`)
              .replace(/\@/g, `\\@`);
}


export function requiresScopedStyles(encapsulation: ENCAPSULATION) {
  return (encapsulation === ENCAPSULATION.ScopedCss || encapsulation === ENCAPSULATION.ShadowDom);
}

