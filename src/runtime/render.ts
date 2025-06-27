import type { JSX, JSXChildren } from './types.d.ts';

const eventPropertyNameRegex = /^on[A-Z]/;
export function createElement<T extends string>(tag: T, properties: JSX.HTMLAttributes = {}): JSX.Element {
  if (tag == null) return createFragment(properties);
  // @ts-ignore this branch does get hit I'm lazy to fix the type signature
  if (typeof tag === 'function') return tag(properties);
  const elem = document.createElement(tag);
  let children: Array<string | Node> | undefined;
  for (const propKey of Object.keys(properties)) {
    const propVal = properties[propKey];
    if (propKey === 'ref') {
      if (propVal && typeof propVal === 'object') {
        // @ts-ignore
        propVal.current = elem;
      }
      continue;
    }
    if (propKey === 'children') {
      // @ts-ignore
      children = [propVal].flat(Number.POSITIVE_INFINITY);
      continue;
    }
    if (eventPropertyNameRegex.test(propKey)) {
      const eventName = propKey.substring(2).toLowerCase();
      // console.log(eventName, propVal);
      // @ts-ignore
      elem.addEventListener(eventName, propVal);
      continue;
    }
    if (propKey in elem) {
      // @ts-ignore
      elem[propKey] = propVal;
      continue;
    }
    if (propVal != null) {
      const attr = document.createAttribute(propKey);
      if (propVal !== true) attr.value = String(propVal);
      elem.setAttributeNode(attr);
    }
  }
  // @ts-ignore
  if (children) elem.append(...children);
  return elem;
}

export function createFragment({ children }: JSXChildren) {
  const frag = document.createDocumentFragment();
  if (children == null) return frag;
  if (!Array.isArray(children)) {
    // @ts-ignore
    frag.append(children);
    return frag;
  }
  // @ts-ignore
  frag.append(...children);
  return frag;
}

