import { SyntheticCSSStyleRule } from "./style-rule";
import { SyntheticCSSStyle } from "./style";
import { SyntheticCSSObject, SyntheticCSSObjectSerializer, SyntheticCSSObjectEdit } from "./base";
import {
  ISerializer,
  serialize,
  deserialize,
  serializable,
  ISerializedContent,
  ITreeWalker,
  ChildMutation,
  Mutation,
  MoveChildMutation,
  PropertyMutation,
  InsertChildMutation,
  RemoveChildMutation,
} from "@tandem/common";

import { BaseContentEdit } from "@tandem/sandbox";

import { SyntheticCSSAtRule, SyntheticCSSAtRuleEdit } from "./atrule";

export interface ISerializedSyntheticCSSMediaRule {
  media: string[];
  cssRules: Array<ISerializedContent<any>>;
}

class SyntheticCSSMediaRuleSerializer implements ISerializer<SyntheticCSSMediaRule, ISerializedSyntheticCSSMediaRule> {
  serialize({ media, cssRules }: SyntheticCSSMediaRule) {
    return {
      media: media,
      cssRules: cssRules.map(serialize)
    };
  }
  deserialize({ media, cssRules }: ISerializedSyntheticCSSMediaRule, injector) {
    return new SyntheticCSSMediaRule(media, cssRules.map((cs) => deserialize(cs, injector)));
  }
}

@serializable(new SyntheticCSSObjectSerializer(new SyntheticCSSMediaRuleSerializer()))
export class SyntheticCSSMediaRule extends SyntheticCSSAtRule {
  readonly atRuleName = "media";

  constructor(public media: string[], rules: SyntheticCSSStyleRule[]) {
    super(rules);
  }

  get cssText() {
    return `@media ${this.media.join(" ")} {\n${this.innerText}}\n`
  }

  get params() {
    return this.media.join(" ");
  }

  protected cloneShallow() {
    return new SyntheticCSSMediaRule(this.media.concat(), []);
  }

  createEdit() {
    return new SyntheticCSSAtRuleEdit(this);
  }

  visitWalker(walker: ITreeWalker) {
    this.cssRules.forEach(rule => walker.accept(rule));
  }
}