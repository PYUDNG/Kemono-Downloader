export default {
    components: {
        "posts-selector": {
            list: {
                search: "搜索"
            }
        }
    },
    settings: {
        menu: {
            label: '设置',
        },
        gui: {
            title: "设置",
            "tabpanel-placeholder": "选择一个模块以进入其设置",
            "no-items-placeholder": "这个模块好像还没有设置呢",
            "reload-to-apply": "修改此设置后，已打开的页面需要刷新后才能生效",
            "help-header": "帮助 - {name}",
        }
    },
    downloader: {
        gui: {
            title: "下载器",
            "title-detail": "任务详情 - {name}",
            "title-detail-noname": "任务详情",
            tabs: {
                init: "初始化",
                queue: "排队中",
                ongoing: "下载中",
                complete: "已完成",
                aborted: "已终止",
                error: "存在错误"
            },
            "task-component": {
                common: {
                    caption: "下载进度: {percentage}%, {finished} / {total}",
                    unknown: "未知",
                    init: "初始化",
                    queue: "排队中",
                    ongoing: "下载中",
                    complete: "已完成",
                    aborted: "已终止",
                    error: "存在错误",
                    "title-nodata": "等待获取任务信息中",
                    "caption-nodata": "service: {service}, creator id: {creatorId}, post id: {postId}",
                    "confirm-restart": {
                        label: "重新下载",
                        message: "确定要重新开始下载任务 <span class='text-primary'>{name}</span> 吗？<br>现有下载进度将丢失，从头开始下载",
                        header: "确认重新下载",
                        accept: "重新下载",
                        reject: "算了",
                        "delete-files": "同时删除已下载的文件"
                    },
                    "confirm-abort": {
                        label: "停止下载",
                        message: "确定要停止下载任务 <span class='text-primary'>{name}</span> 吗？<br>尚不支持断点续传，如需重新下载将会从头开始",
                        header: "确认停止下载",
                        accept: "停止",
                        reject: "算了",
                        "delete-files": "同时删除已下载的文件"
                    },
                    "confirm-remove": {
                        label: "移除下载任务",
                        message: "确定要移除下载任务 <span class='text-primary'>{name}</span> 吗？<br>将彻底移除下载任务，如需重新下载请重新在对应页面点击下载按钮",
                        header: "确认移除下载任务",
                        accept: "移除",
                        reject: "算了",
                        "delete-files": "同时删除已下载的文件"
                    }
                },
                file: {
                    caption: "下载进度: {percentage}%, {finished} / {total}"
                },
                post: {
                    caption: "共 {total} 个文件，已下载 {finished} 个"
                },
                posts: {
                    caption: "共 {total} 个帖子，已下载 {finished} 个"
                }
            }
        },
        settings: {
            label: "下载器",
            provider: {
                label: "下载方式",
                caption: "默认使用浏览器内置下载；其它下载方式有其独特优势，但需要自行测试和您的浏览器的兼容性",
                options: {
                    browser: "浏览器内置下载",
                    fsa: "File System API",
                    "aria2": "Aria2 RPC"
                }
            },
            filename: {
                label: "文件命名",
                caption: "可以使用模板进行文件命名，清空即可恢复默认文件名",
                // 注意：若修改了此处的templates，应该同时检查是否需要修改src\modules\downloader\gui\FilenameHelpComp.vue
                help: {
                    header: "以下模板可在自定义文件名中使用，不区分大小写，使用时需保留大括号（可直接点击复制）",
                    markup: "模板",
                    desc: "说明",
                    templates: {
                        PostID: "帖子内容ID",
                        CreatorID: "作者ID",
                        Service: "平台（如\"fanbox\"/\"fantia\"等等）",
                        P: "该文件在当前文件夹层级是第几个文件",
                        Name: "kemono服务器上的文件原名",
                        Base: "文件原名的非扩展名部分（如\"abc.jpg\"中的\"abc\"）",
                        Ext: "文件原名的扩展名部分（如\"abc.jpg\"中的\"jpg\"）",
                        Title: "帖子内容标题",
                        Creator: "创作者名",
                        Year: "四位数年份",
                        Month: "两位数月份",
                        Date: "两位数日期",
                        Hour: "两位数时间",
                        Minute: "两位数分钟",
                        Second: "两位数秒",
                        Timestamp: "纯数字时间戳",
                        Timetext: "文本时间戳",
                    },
                    footer: "注: 所有时间相关模板均基于内容的发布时间"
                },
                toast: {
                    copied: '已复制',
                },
            }
        }
    }
};