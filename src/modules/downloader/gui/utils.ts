import { InjectionKey } from "vue";
import { IDownloadProvider } from "../types/interface/provider";

export const providerInjectionKey = Symbol('provider injection key') as InjectionKey<IDownloadProvider>;
export const rootTaskDetailInjectionKey = Symbol('rootTaskDetail injection key') as InjectionKey<InstanceType<typeof import('./app-taskdetail.vue').default>>
