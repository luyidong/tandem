import "./index.scss";

import React =  require("react");
import { Workspace } from "@tandem/editor/browser/stores";
import { MetadataKeys } from "@tandem/editor/browser/constants";
import { cssTokenizer } from "@tandem/html-extension/tokenizers";
import { CallbackDispatcher } from "@tandem/mesh";
import { SyntheticSourceLink } from "@tandem/editor/browser/components/common";
import { ApplyFileEditRequest } from "@tandem/sandbox";
import { kebabCase, camelCase } from "lodash";
import { CSSPrettyPaneComponent } from "./pretty";
import { DOMElements, MatchedStyleRule } from "@tandem/html-extension/collections";
import { BaseApplicationComponent, MutationEvent } from "@tandem/common";
import { HashInputComponent, KeyValueInputComponent, IKeyValueInputComponentProps, IKeyValueNameComponentProps } from "@tandem/html-extension/editor/browser/components/common";
import {
  MatchedCSSStyleRule,
  SyntheticDOMElement,
  SyntheticCSSElementStyleRule,
  getMatchingCSSStyleRules,
  isInheritedCSSStyleProperty,
  SyntheticCSSStyle,
  SyntheticCSSElementStyleRuleMutationTypes,
} from "@tandem/synthetic-browser";

export interface ICSSStyleHashInputProps {
  style: SyntheticCSSStyle;
  overridden?: any;
  inherited?: any;
  renderName?: (props: IKeyValueNameComponentProps) => any;
  renderValue?: (props: IKeyValueInputComponentProps) => any;
  setDeclaration: (key, value, oldKey?) => any;
}

export interface ICSSStylePaneComponentProps extends ICSSStyleHashInputProps {
  title?: string;
  titleClassName?: string;
  pretty?: boolean;
  inherited?: boolean;
  renderTitle?(props?: ICSSStylePaneComponentProps): any;
}

export class CSSStylePropertyComponent extends BaseApplicationComponent<IKeyValueInputComponentProps, { showPrettyInput: boolean }> {
  state = { showPrettyInput: false };
  togglePrettyInput = () => {
    this.setState({ showPrettyInput: !this.state.showPrettyInput });
  }
  render() {
    const props = this.props;
    return <div className="css-property-input">
      <div className="css-property-input-line">
        <KeyValueInputComponent {...props} className={props.item["dim"] ? "disabled" : undefined} />
        <i className={[this.state.showPrettyInput ? "ion-close" : "ion-edit", "edit-button", "dim"].join(" ")} onClick={this.togglePrettyInput} />
      </div>
      {this.state.showPrettyInput ? this.renderPrettyInput(props) : null}
    </div>
  }
  renderPrettyInput(props: IKeyValueInputComponentProps) {
    return <div className="css-property-pretty-input">
    </div>
  }
}

export class CSSStyleHashInputComponent extends React.Component<ICSSStyleHashInputProps, any> {
  render() {
    const { setDeclaration, style, overridden, inherited, renderName } = this.props;
    const items = [];

    for (const key of style.getProperties()) {
      const value = style[key];
      items.push({ name: kebabCase(key), value: style[key], overridden: overridden && overridden[key], dim: inherited && !isInheritedCSSStyleProperty(key) } as any);
    }

    return <HashInputComponent items={items} renderName={renderName} setKeyValue={setDeclaration} valueTokenizer={cssTokenizer} renderItemComponent={this.renderItem} />
  }

  renderItem = (props: IKeyValueInputComponentProps) => {
    const children = <CSSStylePropertyComponent {...props} />;
    return this.props.renderValue ? this.props.renderValue(Object.assign({ children }, props)) : children;
  }
}

export class CSSStylePaneComponent extends BaseApplicationComponent<ICSSStylePaneComponentProps, any> {

  state = { showPrettyInput: false };

  render() {
    const { setDeclaration, renderTitle, title, style, titleClassName, pretty, overridden, inherited } = this.props;
    const items = [];

    for (const key of style.getProperties()) {
      const value = style[key];
      items.push({ name: kebabCase(key), value: style[key], overridden: overridden && overridden[key], dim: inherited && !isInheritedCSSStyleProperty(key) });
    }

    return <div>
      <div className={["header", titleClassName].join(" ")}>
        { renderTitle ? renderTitle(this.props) : title }
        <div className="controls">
          <span onClick={() => setDeclaration("", "")}>+</span>
        </div>
      </div>
      { pretty ? <CSSPrettyPaneComponent style={style} /> : <CSSStyleHashInputComponent setDeclaration={this.props.setDeclaration} style={this.props.style} /> }
    </div>
  }
}

// TODO - add some color for the CSS rules
class MatchedCSSStyleRuleComponent extends BaseApplicationComponent<{ result: MatchedCSSStyleRule, workspace: Workspace }, any> {

  private _highlightedElements: SyntheticDOMElement[];

  setDeclaration = (name: string, value: string, oldName?: string) => {
    this.props.result.rule.style.setProperty(name, value, undefined, oldName);
    const edit = this.props.result.rule.createEdit();
    if (value !== "") {
      edit.setDeclaration(name, value, oldName);
    }

    this.props.workspace.applyFileMutations(edit.mutations);
  }
  render() {
    const { result } = this.props;

    return <CSSStylePaneComponent
    style={result.rule.style}
    inherited={result.inherited}
    titleClassName="entity css selector"
    setDeclaration={this.setDeclaration}
    renderTitle={this.renderTitle}
    overridden={result.overriddenStyleProperties}
    />
  }

  onTitleMouseEnter = () => {
    this._highlightedElements = this.props.workspace.document.querySelectorAll(this.props.result.rule.selector);
    for (const element of this._highlightedElements) {
      element.metadata.set(MetadataKeys.HOVERING, true);
    }
  }

  onTitleMouseLeave = () => {
    for (const element of this._highlightedElements) {
      element.metadata.set(MetadataKeys.HOVERING, false);
    }
  }

  onTitleClick = () => {
    // this.props.workspace.select(this._highlightedElements);
  }

  renderTitle = () => {

    return <div className="css-pane-title" title={this.props.result.rule.source && this.props.result.rule.source.uri} onMouseEnter={this.onTitleMouseEnter} onMouseLeave={this.onTitleMouseLeave} onClick={this.onTitleClick}>
      <SyntheticSourceLink target={this.props.result.rule}>{ String(this.props.result.rule.selector) }</SyntheticSourceLink>
    </div>
  }
}

export class ElementCSSPaneComponent extends React.Component<{ workspace: Workspace }, any> {
  private _rulesWatcher: MatchedCSSRulesCache;
  componentWillUnmount() {
    if (this._rulesWatcher) this._rulesWatcher.target = undefined;
  }
  render() {
    if (!this.props.workspace) return null;
    const { selection } = this.props.workspace;

    if (!this._rulesWatcher) {
      this._rulesWatcher = new MatchedCSSRulesCache();
    }

    // CSS Selection pane only works with *one* element.
    if (selection.length !== 1) return null;

    const elements = DOMElements.fromArray(selection);
    if (!elements.length) return null;
    this._rulesWatcher.target = elements[0];

    return <div className="td-pane">
      { this._rulesWatcher.rules.map((matchResult, index) => {
        return <MatchedCSSStyleRuleComponent result={matchResult} key={index} workspace={this.props.workspace} />
      }) }
    </div>
  }
}


export class MatchedCSSRulesCache {
  private _target: SyntheticDOMElement;
  private _matchedRules: MatchedCSSStyleRule[];
  private _documentObserver: CallbackDispatcher<any, any>;
  constructor() {
    this._documentObserver = new CallbackDispatcher(this.onDocumentEvent.bind(this));
  }

  set target(value: SyntheticDOMElement){
    if (this._target === value) return;
    if (this._target) {
      this._target.ownerDocument.unobserve(this._documentObserver);
    }
    this._target = value;
    this.matchRules();
    this._target.ownerDocument.observe(this._documentObserver);
  }
  get target(): SyntheticDOMElement {
    return this._target;
  }

  get rules(): MatchedCSSStyleRule[] {
    return this._matchedRules;
  }

  private matchRules() {
    this._matchedRules = getMatchingCSSStyleRules(this._target);
  }

  private onDocumentEvent(event: MutationEvent<any>) {
    if (!event.mutation || event.mutation.type === SyntheticCSSElementStyleRuleMutationTypes.SET_DECLARATION) return;
    this.matchRules();
  }
}