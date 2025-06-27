import { Ref } from '@runtime/index';
import { step_parse_bif } from './bi-format-parser';

function createParser(bytes: Uint8Array) {
  let canceled = false;
  const it = step_parse_bif(bytes);
  let step = it.next();
  const cbs = [] as Array<(() => void)>;
  let last_result = step.value;

  let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => {
    step = it.next();
    if (step.value != null) last_result = step.value;
    for (const cb of cbs) cb();
    if (!step.done) return;
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }, 0);

  return {
    is_done() { return step.done; },
    value() {
      if (canceled) return { ok: false, error: new Error('Parsing was canceled') } as const;
      if (step.value == null) {
        return last_result;
      }
      return step.value;
    },
    onChange(cb: () => void) {
      cbs.push(cb);
    },
    cancel() {
      canceled = true;
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    },
  } as const;
}

const STORAGE_PARSE_FROM_KEY = '@bi-format.parser:parse-from';
type StoredParseFrom = 'file' | 'text';
function get_stored_parse_type(): StoredParseFrom {
  const value = localStorage.getItem(STORAGE_PARSE_FROM_KEY);
  if (!value) return 'text';
  return value === 'file' || value === 'text' ? value : 'text';
}
function set_stored_parse_type(value: StoredParseFrom) {
  localStorage.setItem(STORAGE_PARSE_FROM_KEY, value);
}

export default function App() {
  const containerRef = Ref<HTMLDivElement>();
  const textInpRef = Ref<HTMLTextAreaElement>();
  const fileInpRef = Ref<HTMLInputElement>();
  const ulRef = Ref<HTMLUListElement>();
  const title = document.createTextNode('No parsing started');
  const encoder = new TextEncoder();
  const init_text = ':b name 6\nJohnny\n:i age 32';
  let value = [...encoder.encode(init_text)] as Array<number>;
  let parser: ReturnType<typeof createParser> = createParser(new Uint8Array(value));
  let name = 'text';

  const update_result_view = () => {
    const ul = ulRef.current;
    ul.innerHTML = '';

    if (parser == null) {
      title.data = 'No parsing started';
      return;
    }

    if (!parser.is_done()) {
      title.data = `Parsing '${name}'...`;
      return;
    }

    const parse_result = parser.value();
    if (parse_result == null) {
      title.data = 'Error when retrieving value from parser';
      return;
    }
    if (!parse_result.ok) {
      title.data = parse_result.error.message
      return;
    }
    const data = parse_result.struct;

    title.data = `Parsed '${name}'`;
    for (const key of Object.keys(data)) {
      const li = document.createElement('li');
      const field = data[key as keyof typeof data];
      li.innerText = `${key}: ${field.type === 'b' ? field.asUTF8() : field.value}`;
      ul.append(li);
    }
  };
  parser.onChange(update_result_view);

  setTimeout(() => {
    const init_parse_from = get_stored_parse_type();
    if (init_parse_from === 'text') fileInpRef.current.remove();
    if (init_parse_from === 'file') textInpRef.current.remove();
  }, 0);

  return (
    <div class="grid flex-grow grid-cols-2 gap-2 p-4">
      <div ref={containerRef} class="flex flex-col gap-1 border border-2 border-sky-400 rounded p-4">
        <fieldset class="px-4 pt-1 pb-4 border border-gray-300 rounded-lg shadow-sm">
          <legend class="px-2 text-lg font-semibold text-gray-700">
            Read BI contents from
          </legend>
          <div class="flex items-center gap-4 mt-2">
            <label class="flex items-center gap-1 text-gray-800 cursor-pointer">
              <input type="radio" value="text" name="source" checked class="form-radio text-blue-600 focus:ring-blue-500" onChange={() => {
                if (textInpRef.current.parentElement != null) return;
                fileInpRef.current.remove();
                containerRef.current.appendChild(textInpRef.current);
                set_stored_parse_type('text');
              }} />
              Text input
            </label>
            <label class="flex items-center gap-1 text-gray-800 cursor-pointer">
              <input type="radio" value="file" name="source" class="form-radio text-blue-600 focus:ring-blue-500" onChange={() => {
                if (fileInpRef.current.parentElement != null) return;
                textInpRef.current.remove();
                containerRef.current.appendChild(fileInpRef.current);
                set_stored_parse_type('file');
              }} />
              Read File
            </label>
          </div>
        </fieldset>

        <input ref={fileInpRef} type="file" class="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm" onInput={() => {
          if (parser) parser.cancel();
          const inp = fileInpRef.current;
          const file: File | null | undefined = (inp.files ?? [])[0];
          if (file == null) {
            return;
          }
          name = file.name;
          file.arrayBuffer()
            .then(buffer => new Uint8Array(buffer))
            .then(bytes => {
              parser = createParser(bytes);
              parser.onChange(update_result_view);
              update_result_view();
            });
        }} />

        {/* @ts-ignore */}
        <textarea ref={textInpRef} class="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm" value={init_text} onInput={(event) => {
          const textarea = event.target as HTMLTextAreaElement;
          const buffer = encoder.encode(textarea.value);
          value = [...buffer];
          if (parser) parser.cancel();
          name = 'Text';
          parser = createParser(new Uint8Array(value));
          parser.onChange(update_result_view);
          update_result_view();
        }} />
      </div>

      <div class="border border-2 border-sky-400 rounded p-4">
        <h2 class="font-bold text-xl">{title}</h2>
        <div class="border border-gray-300 p-4 rounded-lg shadow-sm">
          <ul ref={ulRef} class="list-disc pl-4" />
        </div>
      </div>
    </div>
  );
}

