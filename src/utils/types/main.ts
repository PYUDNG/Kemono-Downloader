export type SingleOrArray<T> = T | T[];
export type PromiseOrRaw<T> = T | Promise<T>;
export type Optional<T> = T | undefined | null;
export type Nullable<T> = T | null;
export type HintedString<T extends string> = (string & {}) | T;
export type ClassType<T> = { new(): T }
