
export function* halt<T>(promise: Promise<T>): Generator<any, T> {
  return yield promise;
}

export async function run<T, TReturn>(fn: () => Generator<T, TReturn>): Promise<TReturn> {
  const g = fn();
  let step = g.next();
  while (!step.done) {
    let v = step.value;
    if (v instanceof Promise) {
      v = await v;
    }
    step = g.next(v);
  }
  if (step.value instanceof Promise) {
    step.value = await step.value;
  }
  return step.value;
}

export const wait_cycle = () => new Promise(resolve => setTimeout(resolve, 0));
export const wait_secs = (secs: number) => new Promise(resolve => setTimeout(resolve, secs * 1_000));

interface IResult<T, E = Error> {
  map<R>(fn: (value: T) => R): Result<R, E>;
  map_err<R>(fn: (error: E) => R): Result<T, R>;
  unwrap(): T;
}
interface ResultOk<T> extends IResult<T, any> {
  ok: true;
  value: T;
}
interface ResultEr<E> extends IResult<any, E> {
  ok: false;
  error: E;
}

export type Result<T, E = Error> = ResultOk<T> | ResultEr<E>;
export const Result = {
  Ok: <T, E = Error>(value: T): Result<T, E> => {
    const result = {
      ok: true,
      value,
      map: <R>(fn: (v: T) => R) => Result.Ok<R, E>(fn(value)),
      map_err: () => result,
      unwrap: () => value,
    } as const;
    return result;
  },

  Err: <E, T = unknown>(error: E): Result<T, E> => {
    const result = {
      ok: false,
      error,
      map: () => result,
      map_err: <R>(fn: (e: E) => R) => Result.Err<R, T>(fn(error)),
      unwrap: () => { throw error; },
    } as const;
    return result;
  },

  try: <T>(fn: () => T): Result<T, unknown> => {
    try {
      const ret = fn();
      return Result.Ok(ret);
    } catch (e) {
      return Result.Err(e);
    }
  },

  asyncTry: async <T>(fn: () => Promise<T>): Promise<Result<T, unknown>> => {
    try {
      const ret = await fn();
      return Result.Ok(ret);
    } catch (err) {
      return Result.Err(err);
    }
  },
};

export const find = document.querySelector.bind(document);
export const findReq = <T extends string>(query: T) => {
  const elem = document.querySelector(query)!;
  assert(elem != null, `Expected query '${query}' to match an element in the DOM but none was found!`);
  return elem;
}

export function assert(cond: boolean, message: string = 'Expected expression to be true but got false') {
  if (cond) return;
  throw new Error(message);
}

export function Ref<T>() {
  let value: T;
  return {
    set current(v: T) {
      value = v;
    },
    get current() {
      return value;
    },
  };
}

class SignalValueChangeEvent<T> extends Event {
  readonly value: T;
  constructor(value: T) {
    super('signals:value-update');
    this.value = value;
  }
  static EVENT_NAME = 'signals:value-update' as const;
}

function createComputedSignal<T, R>(source: { value: T; listen(cb: (v: T) => any): void; }, map: (v: T) => R) {
  let calculated = map(source.value);
  const target = new EventTarget();
  const sub = {
    get value() { return calculated; },

    listen(cb: (v: R) => any) {
      // @ts-ignore event types are ok
      target.addEventListener(SignalValueChangeEvent.EVENT_NAME, (event: SignalValueChangeEvent<R>) => {
        const value = event.value;
        cb(value);
      });
    },

    computed<U>(map: (v: R) => U) {
      return createComputedSignal<R, U>(sub, map);
    },
  };
  source.listen((v) => {
    const new_val = map(v);
    if (new_val === calculated) return;
    calculated = new_val;
    const event = new SignalValueChangeEvent(calculated);
    target.dispatchEvent(event);
  });
  return sub;
}

export function createSignal<T>(init: T) {
  let value = init;
  const target = new EventTarget();
  const signal = {
    get value() { return value; },
    set value(v: T) {
      if (v == value) return;
      value = v;
      const event = new SignalValueChangeEvent(value);
      target.dispatchEvent(event);
    },

    listen(cb: (v: T) => any) {
      // @ts-ignore event types are ok
      target.addEventListener(SignalValueChangeEvent.EVENT_NAME, (event: SignalValueChangeEvent<T>) => {
        const value = event.value;
        cb(value);
      });
    },

    computed<R>(map: (v:T) => R) {
      return createComputedSignal<T, R>(signal, map);
    },
  };
  return signal;
}

