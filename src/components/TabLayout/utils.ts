import { InjectionKey, Ref } from "vue";

export const keyName = Symbol('TabPanels.name') as InjectionKey<Ref<string | undefined | null | typeof initialKeyName>>;
export const keyNames = Symbol('TabPanels.names') as InjectionKey<Ref<string[]>>;
export const initialKeyName = Symbol('TabPanels.initial-keyname');