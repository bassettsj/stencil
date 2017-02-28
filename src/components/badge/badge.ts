import { IonElement } from '../../utils/ion-element';
import { CreateElement, VNode } from '../../utils/interfaces';


export class IonBadge extends IonElement {

  connectedCallback() {
    this.connect(IonBadge.observedAttributes);
  }

  ionNode(h: CreateElement) {
    return h(this);
  }

  static get observedAttributes() {
    return ['color', 'mode'];
  }

}