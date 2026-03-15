<script setup lang="ts">
import { i18nKeys } from '@/i18n/utils';
import { useI18n } from 'vue-i18n';
import { ProviderType } from '../../types/base/task';
import { GM_info } from '$';
import { isMobileAgent, popoverLogic } from '@/utils/main';
import { checkCompatibility } from '../../providers/fsa/utils';
import CheckIcon from '~icons/prime/check';
import TimesIcon from '~icons/prime/times'
import QuestionIcon from '~icons/prime/question'
import Popover from '@/volt/Popover.vue';
import { computed, getCurrentInstance, ref, useTemplateRef } from 'vue';

const { t } = useI18n();
const $help = i18nKeys.$downloader.$settings.$provider.$help;

/**
 * 兼容性测试项目
 */
type SupportItem = 'self' | 'pause' | 'abort-files' | 'dir';
type Compatible = boolean | null;
type Compatibiliy = Compatible | {
    /**
     * 是否与当前运行环境兼容  
     * 布尔值，或者表示未知的null，或者表示是否兼容的人类可读字符串
     */
    compatible: Compatible;

    /**
     * 兼容性是否存疑，需要在UI上提示用户  
     * 例如：fsa在chrome系浏览器上可用，但在移动端上的可用性存疑
     * 接受boolean，或者代表兼容性存疑原因的人类可读字符串
     */
    questionable: boolean | string;
}
/**
 * 功能特性兼容性
 */
interface SupportCompatibility {
    /**
     * 功能特性人类可读名称
     */
    name: string;

    /**
     * 功能兼容性
     */
    support: Record<ProviderType, Compatibiliy>;
}
const results: Record<SupportItem, SupportCompatibility> = (function() {
    const r: Partial<typeof results> = {};
    const $support = $help.$table.$support;
    r.self = {
        name: t($support.$self),
        support: {
            browser: true,
            fsa: {
                compatible: checkCompatibility(),
                questionable: isMobileAgent() ? t($help.$fsaMobile) : false,
            },
            aria2: {
                compatible: true,
                questionable: t($help.$aria2NeedInstall),
            },
        },
    };
    r.pause = {
        name: t($support.$pause),
        support: {
            browser: false,
            fsa: false,
            aria2: true,
        },
    };
    r["abort-files"] = {
        name: t($support.$abortFiles),
        support: {
            browser: false,
            fsa: true,
            aria2: false,
        },
    };
    r.dir = {
        name: t($support.$dir),
        support: {
            browser: {
                // Tampermonkey时支持，Violentmonkey不支持，其它脚本管理器未知
                compatible: ({
                    Tampermonkey: true,
                    Violentmonkey: false,
                } as Record<string, boolean>)[GM_info.scriptHandler] ?? null,
                // 即使是Tampermoneky，移动端似乎也不支持创建文件夹
                questionable: GM_info.scriptHandler === 'Tampermonkey' && isMobileAgent(),
            },
            fsa: true,
            aria2: true,
        },
    };
    return r as typeof results;
}) ();

const popoverContent = ref('');
const popover = useTemplateRef('popover');
const popoverParent = computed(() => getCurrentInstance()?.root.vnode.el?.parentElement);
const popoverHandlers = computed(() => popover.value ? popoverLogic(popover.value) : Object.create(null) as Record<any, undefined>);
function onMouseEnter(e: MouseEvent, comp: Compatibiliy) {
    if (!isQuestionable(comp)) return;
    popoverContent.value = typeof comp.questionable === 'boolean' ?
        t($help.$questionable) : comp.questionable;
    popoverHandlers.value.onMouseEnter?.(e);
}

function isQuestionable(comp: Compatibiliy): comp is Compatibiliy & { questionable: string | true } {
    return typeof comp === 'object' && comp !== null && !!comp.questionable;
}
</script>

<template>
    <!-- instruction -->
    <div>{{ t($help.$instruction) }}</div>

    <!-- 表格 -->
    <div class="grid grid-cols-4 grid-rows-4 my-2 border-l-3 border-t-3 border-solid border-surface-200 dark:border-surface-800">
        <!-- 每列的表头: 下载器 -->
        <div class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">
            <!-- 占据左上角那一格，仅边框无内容 -->
        </div>
        <div class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">
            {{ t($help.$table.$provider.$browser) }}
        </div>
        <div class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">
            {{ t($help.$table.$provider.$fsa) }}
        </div>
        <div class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">
            {{ t($help.$table.$provider.$aria2) }}
        </div>
        <!-- 表身: 兼容性数据 -->
        <template v-for="(support, i) of Object.values(results)">
            <!-- 每行的表头 -->
            <div
                class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800"
            >
                {{ support.name }}
            </div>
            <!-- 每行的兼容性数据 -->
            <template v-for="(comp, j) of Object.values(support.support)">
                <div
                    class="font-bold flex flex-row items-center justify-center py-2 px-3 border-r border-b border-solid border-surface-200 dark:border-surface-800"
                    :class="{ 'border-b-3': i === Object.keys(results).length - 1, 'border-r-3': j === Object.keys(results).length - 1 }"
                    @mouseenter="e => onMouseEnter(e, comp)"
                    @mouseleave="popoverHandlers.onMouseLeave"
                    @touchstart="popoverHandlers.onTouchStart"
                >
                    <div
                        class="relative w-fit h-fit text-xl"
                    >
                        <!-- 根据兼容性展示对应图标 -->
                        <component :is="
                            (function() {
                                const compatibility: Compatible =
                                    typeof comp === 'boolean' || comp === null ?
                                        comp : comp.compatible;

                                if (typeof compatibility === 'boolean') {
                                    return comp ? CheckIcon : TimesIcon;
                                }
                                if (compatibility === null) {
                                    return QuestionIcon;
                                }
                            }) ()
                        " />
                        <!-- 如果兼容性存疑，右上角展示问号图标 -->
                        <QuestionIcon
                            v-if="isQuestionable(comp)"
                            class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-[0.75em]"
                        />
                    </div>
                </div>
            </template>
        </template>

        <!-- 兼容性数据附加Popover -->
        <Popover v-if="popoverParent" ref="popover" :append-to="popoverParent">
            <div v-html="popoverContent"></div>
        </Popover>
    </div>
</template>