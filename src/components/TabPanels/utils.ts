import { InjectionKey, Ref } from "vue";

export const keyName = Symbol('TabPanels.name') as InjectionKey<Ref<string | undefined | null>>;
export const keyNames = Symbol('TabPanels.names') as InjectionKey<Ref<string[]>>;