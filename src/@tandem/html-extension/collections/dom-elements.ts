import { flatten } from "lodash";
import { IWalkable, ITreeWalker, TreeWalker, ArrayCollection } from "@tandem/common";
import {
  DOMNodeType,
  SyntheticDOMNode,
  getSelectorTester,
  SyntheticDOMElement,
  SyntheticCSSElementStyleRule,
  SyntheticDOMContainer,
  SyntheticDOMAttributes,
} from "@tandem/synthetic-browser";

export class MatchedStyleRule {
  public overriddenDeclarations: any;
  public disabledDeclarations: any;
  constructor(readonly value: SyntheticCSSElementStyleRule) {
    this.overriddenDeclarations = {};
    this.disabledDeclarations
  }
}


export class DOMElements<T extends SyntheticDOMElement> extends ArrayCollection<T>  implements IWalkable {

  setAttribute(name: string, value: string) {
    for (const element of this) {
      if (value == null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    }
  }

  removeAttribute(name: string) {
    for (const element of this) {
      element.removeAttribute(name);
    }
  }

  visitWalker(walker: ITreeWalker) {
    this.forEach(element => element.visitWalker(walker));
  }

  get attributes(): SyntheticDOMAttributes {
    const attributes =  SyntheticDOMAttributes.create() as SyntheticDOMAttributes;
    for (const element of this) {
      for (const attribute of element.attributes) {
        if (!attributes.hasOwnProperty(attribute.name)) {
          attributes.push(attribute.clone());
        } else {
          attributes[attribute.name].value = "";
        }
      }
    }
    return attributes;
  }

  static fromArray(items: Array<any>) {
    return new DOMElements(...items.filter((element) => element && element.nodeType === DOMNodeType.ELEMENT) as any);
  }
}