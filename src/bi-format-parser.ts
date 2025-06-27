
const BI_TYPES = Object.freeze({
  b: 'b'.charCodeAt(0),
  i: 'i'.charCodeAt(0),
} as const);
export type BiType = keyof typeof BI_TYPES;

interface BiBlobField {
  type: 'b',
  name: string;
  size: number;
  blob: Uint8Array;
  asUTF8(): string;
};

interface BiIntField {
  type: 'i',
  name: string;
  value: number;
}

export type BiField = BiBlobField | BiIntField;

const COLON_CC = ':'.charCodeAt(0);
const SPACE_CC = ' '.charCodeAt(0);
const NEWLINE_CC = '\n'.charCodeAt(0);

function read_till_cc(bytes: Uint8Array, off: number, r_cc: number) {
  const start = off;
  let end = off;
  const next = () => bytes[end++];
  while (end < bytes.length) {
    const n_cc = next();
    if (n_cc === r_cc) return [end, bytes.slice(start, end)] as const;
  }
  return null;
}

class BlobFieldError extends Error { }
class IntFieldError extends Error { }

export function* step_parse_bif(bytes: Uint8Array): Generator<{ ok: true; struct: Record<string, BiField>; }, { ok: true; struct: Record<string, BiField>; } | { ok: false; error: Error }> {
  const struct = {} as Record<string, BiField>;

  let off = 0;
  const next = () => bytes[off++];
  while (off < bytes.length) {
    let cursor = next();
    if (cursor != COLON_CC) {
      return {
        ok: false,
        error: new Error(`Invalid start to property. Expected '${COLON_CC}' but got '${cursor}' at byte ${off - 1}`),
      } as const;
    }

    const type_cc = next();
    cursor = next();
    if (cursor != SPACE_CC) {
      return {
        ok: false,
        error: new Error(`Expected separator between type and name '${SPACE_CC}' but got '${cursor}' at byte ${off - 1}`),
      } as const;
    }

    let name = '';
    while ((cursor = next()) != SPACE_CC) {
      name += String.fromCharCode(cursor);
    }
    if (name.length === 0) {
      return {
        ok: false,
        error: new Error('Unexpected property name: Empty property names are not allowed'),
      } as const;
    }

    for (const type of Object.keys(BI_TYPES)) {
      const code = BI_TYPES[type as BiType];
      if (type_cc != code) continue;
      switch (type) {
        case 'b': {
          const result = read_till_cc(bytes, off, NEWLINE_CC);
          if (result == null) {
            return {
              ok: false,
              error: new BlobFieldError(`Unable to find blob field data start delimiter: '${NEWLINE_CC}'`),
            } as const;
          }
          const [new_off, read] = result;
          const len = parseInt((new TextDecoder()).decode(read));
          off = new_off + len + 1;
          const blob = bytes.slice(new_off, new_off + len);
          const field: BiBlobField = {
            type, name, size: len, blob,
            asUTF8() {
              return (new TextDecoder()).decode(blob);
            },
          };
          struct[field.name] = field;
        } break;

        case 'i': {
          const result = read_till_cc(bytes, off, NEWLINE_CC);
          let read: Uint8Array;
          let new_off = off;
          if (result == null) {
            while (bytes[new_off] == SPACE_CC) ++new_off;
            read = bytes.slice(new_off);
            new_off = bytes.length
          } else {
            [new_off, read] = result;
          }
          if (read.length == 0) {
            return {
              ok: false,
              error: new IntFieldError('No value present for int field'),
            } as const;
          }
          const value = parseInt((new TextDecoder()).decode(read));
          off = new_off;
          const field = {
            type, name,
            value,
          };
          struct[field.name] = field;
        } break;

        default: {
          return {
            ok: false,
            error: new Error(`Unsupported field type ${type}`),
          } as const;
        };
      }
      // console.log(struct, bytes.slice(off));
      break;
    }
    yield { ok: true, struct } as const;
  }

  yield { ok: true, struct } as const;

  return { ok: true, struct } as const;
}

const wait_event_cycle = () => new Promise(resolve => setTimeout(resolve, 0))
export async function async_parse_bif(bytes: Uint8Array) {
  const it = step_parse_bif(bytes);

  await wait_event_cycle();
  let step = it.next();
  while (!step.done) {
    step = it.next();
    await wait_event_cycle();
  }

  return step.value;
}

export function sync_parse_bif(bytes: Uint8Array) {
  const it = step_parse_bif(bytes);

  let step = it.next();
  while (!step.done) {
    step = it.next();
  }

  return step.value;
}

