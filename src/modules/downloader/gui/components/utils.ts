import { Feature } from "../../types/base/main.js";
import * as providers from '../../providers/main.js';
import { ITask } from "../../types/interface/task.js";

export function supports(task: ITask, feature: Feature): boolean {
    if (!isSupportedProvider(task.provider)) throw new Error(`task's provider (${ task.provider }) is not supported`);
    return providers[task.provider].features.includes(feature);
}

export function isSupportedProvider(provider: string): provider is keyof typeof providers {
    return Object.hasOwn(providers, provider);
}