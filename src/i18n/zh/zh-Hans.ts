import dedent from "dedent";

export default {
    components: {
        "posts-selector": {
            list: {
                search: '搜索'
            },
            buttons: {
                "open-post": '打开帖子页面',
                ok: '下载',
                cancel: '取消',
            },
        }
    },
    settings: {
        menu: {
            label: '设置',
        },
        gui: {
            title: '设置',
            "tabpanel-placeholder": '选择一个模块以进入其设置',
            "no-items-placeholder": '设置列表为空',
            "reload-to-apply": '修改此设置后，已打开的页面需要刷新后才能生效',
            "help-header": '帮助 - {name}',
            "mobile-dialog": {
                ok: '保存',
                cancel: '取消',
            },
            "value-string": {
                switch: {
                    true: '已开启',
                    false: '已关闭',
                }
            }
        }
    },
    downloader: {
        "show-ui": '下载管理器',
        gui: {
            title: '下载器',
            "title-detail": '任务详情 - {name}',
            "title-detail-noname": '任务详情',
            tabs: {
                init: '初始化',
                queue: '排队中',
                paused: '已暂停',
                ongoing: '下载中',
                complete: '已完成',
                aborted: '已取消',
                error: '存在错误'
            },
            "task-component": {
                common: {
                    caption: '下载进度: {percentage}%, {finished} / {total}',
                    unknown: '未知',
                    init: '初始化',
                    queue: '排队中',
                    ongoing: '下载中',
                    paused: '已暂停',
                    complete: '已完成',
                    aborted: '已取消',
                    error: '存在错误',
                    "title-nodata": '等待获取任务信息中',
                    "caption-nodata": 'service: {service}, creator id: {creatorId}, post id: {postId}',
                    pause: '暂停下载',
                    unpause: '取消暂停',
                    "confirm-delete-files": '同时删除已下载的文件',
                    "confirm-restart": {
                        label: '重新下载',
                        message: '确定要重新开始下载任务 <span class="text-primary">{name}</span> 吗？<br>现有下载进度将丢失，从头开始下载',
                        header: '确认重新下载',
                        accept: '重新下载',
                        reject: '算了',
                    },
                    "confirm-abort": {
                        label: '停止（取消）下载',
                        message: '确定要停止（取消）下载任务 <span class="text-primary">{name}</span> 吗？<br>尚不支持断点续传，如需重新下载将会从头开始',
                        header: '确认停止（取消）下载',
                        accept: '停止',
                        reject: '算了',
                    },
                    "confirm-remove": {
                        label: '移除下载任务',
                        message: '确定要移除下载任务 <span class="text-primary">{name}</span> 吗？<br>将彻底移除下载任务，如需重新下载请重新在对应页面点击下载按钮',
                        header: '确认移除下载任务',
                        accept: '移除',
                        reject: '算了',
                    }
                },
                file: {
                    caption: '下载进度: {percentage}%, {finished} / {total}',
                },
                post: {
                    caption: '共 {total} 个文件，已下载 {finished} 个',
                    "caption-aborted": '，已取消 {aborted} 个',
                },
                posts: {
                    caption: '共 {total} 个帖子，已下载 {finished} 个',
                    "caption-aborted": '，已取消 {aborted} 个',
                },
            }
        },
        settings: {
            label: '下载器',
            "feature-not-supported": '当前下载器（{provider}）不支持修改此设置',
            provider: {
                label: '下载器',
                caption: '默认使用浏览器内置下载；其它下载器有其独特优势，但需要自行测试和您的浏览器的兼容性',
                options: {
                    browser: '浏览器内置下载',
                    fsa: 'File System API',
                    aria2: 'Aria2 RPC',
                },
                // 注意：若修改了此处的templates，应该同时检查是否需要修改src\modules\downloader\gui\setting-help\Provider.vue
                help: {
                    instruction: '不同的下载器有着不同的特性，以下表格为对您的浏览器和脚本管理器测试得出的兼容性数据：',
                    table: {
                        corner: {
                            provider: '下载器',
                            support: '功能',
                        },
                        provider: {
                            browser: '浏览器内置下载',
                            fsa: 'File System API',
                            aria2: 'Aria2 RPC',
                        },
                        support: {
                            self: '下载器自身可用性',
                            pause: '暂停/继续下载',
                            "abort-files": '取消任务时删除已下载文件',
                            dir: '保存文件时创建文件夹结构',
                        },
                    },
                    questionable: '开发者并不能100%确定此项的兼容性和可用性，请自行测试',
                    aria2NeedInstall: dedent`
                        需要自行安装并配置好aria2
                        同时推荐使用专业的aria2客户端GUI
                    `.replaceAll('\n', '<br>'),
                    fsaMobile: '移动端浏览器可能会出现文件读写问题，请自行测试',
                },
            },
            filename: {
                label: '文件命名',
                caption: '可以使用模板进行文件命名，清空即可恢复默认文件名',
                // 注意：若修改了此处的templates，应该同时检查是否需要修改src\modules\downloader\gui\setting-help\Filename.vue
                help: {
                    header: dedent`
                        您可以使用斜杠创建目录结构，windows使用"\\"，苹果/linux/安卓使用"/"
                        以下模板可在自定义文件名中使用，不区分大小写，使用时需保留大括号（可直接点击复制）
                    `.replaceAll('\n', '<br>'),
                    markup: '模板',
                    desc: '说明',
                    templates: {
                        PostID: '帖子内容ID',
                        CreatorID: '作者ID',
                        Service: '平台（如"fanbox"/"fantia"等等）',
                        P: '该文件在当前文件夹层级是第几个文件',
                        Name: 'kemono服务器上的文件原名',
                        Base: '文件原名的非扩展名部分（如"abc.jpg"中的"abc"）',
                        Ext: '文件原名的扩展名部分（如"abc.jpg"中的"jpg"）',
                        Title: '帖子内容标题',
                        Creator: '创作者名',
                        Year: '四位数年份',
                        Month: '两位数月份',
                        Date: '两位数日期',
                        Hour: '两位数时间',
                        Minute: '两位数分钟',
                        Second: '两位数秒',
                        Timestamp: '纯数字时间戳',
                        Timetext: '文本时间戳',
                    },
                    footer: '注: 所有时间相关模板均基于内容的发布时间'
                },
                toast: {
                    copied: '已复制',
                },
            },
            "no-cover-file": '不下载封面图文件',
            "abort-files": {
                label: '取消任务时，如何处理已下载文件',
                caption: '部分下载器可能不支持此功能',
                options: {
                    prompt: '每次都询问',
                    delete: '删除',
                    preserve: '保留',
                },
            },
            group: '常规设置',
        },
        provider: {
            browser: {
                settings: {
                    label: '下载器: 浏览器内置下载',
                }
            },
            fsa: {
                settings: {
                    label: '下载器: File System API',
                    directory: {
                        label: '下载文件夹',
                        caption: '点击更改下载文件保存位置',
                        "not-selected": '尚未选择文件夹',
                    },
                    "permission-check": {
                        label: '检查文件夹权限',
                        caption: '如果下载时无法正常触发授权、且保存文件出错，点这里',
                        button: '授权',
                        toast: {
                            granted: {
                                title: '权限检查',
                                message: '权限已授予',
                            },
                            failed: {
                                title: '权限检查',
                                message: '无法获取可读写的文件夹权限',
                            },
                        },
                    },
                },
            },
            aria2: {
                settings: {
                    label: '下载器: Aria2',
                    "disabled-text": 'Aria2并不是当前下载器',
                    endpoint: {
                        label: 'Aria2服务器',
                        caption: '服务端的链接，同时支持http(s)/ws(s)协议',
                    },
                    secret: {
                        label: '密钥',
                        caption: '留空则不使用密钥',
                    },
                    dir: {
                        label: '下载位置',
                        caption: '存储下载文件的文件夹路径，留空以不指定下载位置',
                        help: dedent`
                            如果您曾在Aria2服务端配置过下载位置，此选项会覆盖您的服务端配置
                            如需使用服务端配置，请将此选项留空
                            <span class="font-bold">请注意：如果您希望通过自定义文件名创建文件夹，那么此项不可省略，否则自定义文件夹将会在aria2运行目录而非服务端配置的下载目录下创建</span>
                        `.replaceAll('\n', '<br>'),
                    },
                    interval: {
                        label: '任务刷新间隔（秒）',
                        caption: '下载时，每隔多长时间刷新一下任务进度',
                    },
                    "connection-test": {
                        label: '测试连接',
                        caption: '使用当前配置尝试连接Aria2服务器',
                        button: '测试',
                        toast: {
                            "not-enabled": {
                                title: '未启用aria2下载器',
                                message: '请先将下载器设置为aria2，再进行测试',
                            },
                            "not-ready": {
                                title: '未连接aria2下载器',
                                message: 'aria2下载器尚未准备好，请检查配置进行测试',
                            },
                            granted: {
                                title: '连接成功',
                                message: '已连接到Aria2服务器，版本 {version}',
                            },
                            failed: {
                                title: '连接失败',
                                message: '无法连接，请检查配置',
                            },
                        },
                    },
                }
            },
        },
    },
    creator: {
        gui: {
            download: '下载',
            "posts-selector": {
                header: '选择要下载的帖子',
            },
        },
    },
    post: {
        gui: {
            download: '下载',
        },
    },
    debugging: {
        settings: {
            label: '调试',
            "save-logs": {
                label: '记录日志',
                caption: '将运行日志保存在脚本存储空间中，以便导出；非必要不开启，存储过多的日志会导致脚本速度变慢',
            },
            "export-logs": {
                label: '导出日志',
                caption: '如需反馈bug，请先开启上方的“记录日志”按钮，然后在刷新页面后触发一遍bug，最后点击此处导出日志文件进行反馈',
                button: '导出',
            },
            "clear-logs": {
                label: '清空日志',
                caption: '如果不再需要已记录的日志，可点击这里删除',
                button: '清空',
                cleared: {
                    summary: '日志清理',
                    detail: '已删除所有日志，释放 {size} 空间'
                }
            },
        },
    },
};