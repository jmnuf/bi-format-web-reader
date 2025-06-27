
export const SELF_CLOSING_HTML_TAGS = [
  "area", "base", "br",
  "col", "embed", "hr",
  "img", "input", "link",
  "meta", "param", "source",
  "track", "wbr",
] as const;
export type SelfClosingHTMLTag = (typeof SELF_CLOSING_HTML_TAGS)[number];

// Set the attributes to allow any keys and very permissive values
export type HTMLAttributes = Record<string, JSXNode | undefined> & JSXChildren;

declare global {
  namespace JSX {
    export type IntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]: K extends SelfClosingHTMLTag ? Omit<HTMLAttributes, "children"> : HTMLAttributes;
    };

    // Declare the shape of JSX rendering result
    // This is required so the return types of components can be inferred
    export type Element = RenderedNode;

    type NonFn<T> = T extends (...args: any[]) => any ? never : T;
    type PickElement<TKey extends keyof HTMLElementTagNameMap> = HTMLElementTagNameMap[TKey];

    type EventCallback<TEvent extends Event> = (event: TEvent, model: Record<string, unknown | undefined> | { item: Record<string, unknown | undefined> & { $index: number } }) => void;

    export type HTMLAttributes = JSXChildren & {
      [Key in keyof PickElement<keyof HTMLElementTagNameMap>]?:
        | Key extends "children" ? JSXChildren["children"]
          : NonFn<PickElement<keyof HTMLElementTagNameMap>[Key] | (JSXNode & {})>;
    } & {
      [Key in keyof HTMLElementEventMap as `on${Capitalize<Key>}`]?:
        | EventCallback<HTMLElementEventMap[Key]>
          | undefined;
    } & {
      [K in string & {}]: { current: HTMLElement } | JSXNode | JSXNode[] | ((event: Event) => void) | undefined;
    };
  }
}

export type { JSX };

export type RenderedNode = Node;

export interface JSXChildren {
  children?: JSXNode | JSXNode[] | undefined;
}

export type JSXNode =
  | RenderedNode
  // | RawContentNode
  | (() => Node)
  | boolean
  | number
  | bigint
  | string
  | null
  | undefined;

export type FunctionComponent<TProps extends Record<string, unknown>> = (
  props: TProps,
) => JSX.Element;
