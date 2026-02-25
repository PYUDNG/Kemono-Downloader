import { Feature } from "../../types/base/provider";
import { BaseTask } from "../../types/base/task";
import * as providers from '../../providers/main.js';

export function supports(task: BaseTask, feature: Feature): boolean {
    return providers[task.provider].features.includes(feature);
}