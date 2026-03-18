import i18n, { i18nKeys } from "@/i18n/main";
import { defineModule } from "../types";
import { registerModule } from "../settings/main";
import HistoryIcon from '~icons/prime/history'
import GithubIcon from '~icons/prime/github'
import GreasyforkIcon from '~icons/simple-icons/greasyfork'
import { ref } from "vue";
import { GM_info, GM_openInTab } from "$";

const t = i18n.global.t;
const $self = i18nKeys.$self;
const $settings = i18nKeys.$self.$settings;

export default defineModule({
    id: 'self',
    name: t($self.$name),
});

// 设置
registerModule({
    id: 'self',
    name: t($settings.$label),
    // “关于”设置模块始终处于最后一位
    index: Infinity,
    items: [{
        id: 'version',
        type: 'display',
        label: t($settings.$version.$label),
        icon: HistoryIcon,
        value: ref(GM_info.script.version),
    }, {
        id: 'github',
        type: 'display',
        label: t($settings.$github.$label),
        icon: GithubIcon,
        props: {
            onClick() {
                GM_openInTab(__GITHUB_URL__, { active: true, setParent: true, insert: true });
            }
        },
        value: ref(__GITHUB_URL__),
    }, {
        id: 'greasyfork',
        type: 'display',
        label: t($settings.$greasyfork.$label),
        icon: GreasyforkIcon,
        props: {
            onClick() {
                GM_openInTab(__GREASYFORK_URL__, { active: true, setParent: true, insert: true });
            }
        },
        value: ref(__GREASYFORK_URL__),
    }],
});
