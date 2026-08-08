import { InjectionKey } from "vue";
import type { BaseDownloadProvider } from "../types/base/provider";

export const providerInjectionKey = Symbol('provider injection key') as InjectionKey<BaseDownloadProvider>;
export const rootTaskDetailInjectionKey = Symbol('rootTaskDetail injection key') as InjectionKey<InstanceType<typeof import('./app-taskdetail.vue').default>>
