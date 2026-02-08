import { InjectionKey } from "vue";
import type { IDownloadProvider } from "../types/interface/provider.js";

export const providerInjectionKey = Symbol('provider injection key') as InjectionKey<IDownloadProvider>;
export const rootTaskDetailInjectionKey = Symbol('rootTaskDetail injection key') as InjectionKey<InstanceType<typeof import('./app-taskdetail.vue').default>>
