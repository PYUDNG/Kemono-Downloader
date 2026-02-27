export default {
    components: {
        "posts-selector": {
            list: {
                search: '搜尋'
            },
            buttons: {
                "open-post": '開啟貼文頁面',
                ok: '下載',
                cancel: '取消',
            },
        }
    },
    settings: {
        menu: {
            label: '設定',
        },
        gui: {
            title: '設定',
            "tabpanel-placeholder": '選擇一個模組以進入其設定',
            "no-items-placeholder": '設定列表為空',
            "reload-to-apply": '修改此設定後，已開啟的頁面需要重新整理後才能生效',
            "help-header": '幫助 - {name}',
        }
    },
    downloader: {
        "show-ui": '下載管理器',
        gui: {
            title: '下載器',
            "title-detail": '任務詳情 - {name}',
            "title-detail-noname": '任務詳情',
            tabs: {
                init: '初始化',
                queue: '排隊中',
                paused: '已暫停',
                ongoing: '下載中',
                complete: '已完成',
                aborted: '已取消',
                error: '存在錯誤'
            },
            "task-component": {
                common: {
                    caption: '下載進度: {percentage}%, {finished} / {total}',
                    unknown: '未知',
                    init: '初始化',
                    queue: '排隊中',
                    ongoing: '下載中',
                    paused: '已暫停',
                    complete: '已完成',
                    aborted: '已取消',
                    error: '存在錯誤',
                    "title-nodata": '等待取得任務資訊中',
                    "caption-nodata": 'service: {service}, creator id: {creatorId}, post id: {postId}',
                    pause: '暫停下載',
                    unpause: '取消暫停',
                    "confirm-delete-files": '同時刪除已下載的檔案',
                    "confirm-restart": {
                        label: '重新下載',
                        message: '確定要重新開始下載任務 <span class="text-primary">{name}</span> 嗎？<br>現有下載進度將丟失，從頭開始下載',
                        header: '確認重新下載',
                        accept: '重新下載',
                        reject: '算了',
                    },
                    "confirm-abort": {
                        label: '停止（取消）下載',
                        message: '確定要停止（取消）下載任務 <span class="text-primary">{name}</span> 嗎？<br>尚不支援斷點續傳，如需重新下載將會從頭開始',
                        header: '確認停止（取消）下載',
                        accept: '停止',
                        reject: '算了',
                    },
                    "confirm-remove": {
                        label: '移除下載任務',
                        message: '確定要移除下載任務 <span class="text-primary">{name}</span> 嗎？<br>將徹底移除下載任務，如需重新下載請重新在對應頁面點擊下載按鈕',
                        header: '確認移除下載任務',
                        accept: '移除',
                        reject: '算了',
                    }
                },
                file: {
                    caption: '下載進度: {percentage}%, {finished} / {total}'
                },
                post: {
                    caption: '共 {total} 個檔案，已下載 {finished} 個'
                },
                posts: {
                    caption: '共 {total} 個貼文，已下載 {finished} 個'
                }
            }
        },
        settings: {
            label: '下載器',
            "feature-not-supported": '目前下載器（{provider}）不支援此功能',
            provider: {
                label: '下載器',
                caption: '預設使用瀏覽器內建下載；其它下載器有其獨特優勢，但需要自行測試和您的瀏覽器的相容性',
                options: {
                    browser: '瀏覽器內建下載',
                    fsa: 'File System API',
                    "aria2": 'Aria2 RPC'
                }
            },
            filename: {
                label: '檔案命名',
                caption: '可以使用範本進行檔案命名，清空即可恢復預設檔名',
                // 注意：若修改了此處的templates，應該同時檢查是否需要修改src\modules\downloader\gui\FilenameHelpComp.vue
                help: {
                    header: '以下範本可在自訂檔名中使用，不區分大小寫，使用時需保留大括號（可直接點擊複製）',
                    markup: '範本',
                    desc: '說明',
                    templates: {
                        PostID: '貼文內容ID',
                        CreatorID: '作者ID',
                        Service: '平台（如"fanbox"/"fantia"等等）',
                        P: '該檔案在目前資料夾層級是第幾個檔案',
                        Name: 'kemono伺服器上的檔案原名',
                        Base: '檔案原名的非副檔名部分（如"abc.jpg"中的"abc"）',
                        Ext: '檔案原名的副檔名部分（如"abc.jpg"中的"jpg"）',
                        Title: '貼文內容標題',
                        Creator: '創作者名',
                        Year: '四位數年份',
                        Month: '兩位數月份',
                        Date: '兩位數日期',
                        Hour: '兩位數時間',
                        Minute: '兩位數分鐘',
                        Second: '兩位數秒',
                        Timestamp: '純數字時間戳',
                        Timetext: '文字時間戳',
                    },
                    footer: '註: 所有時間相關範本均基於內容的發佈時間'
                },
                toast: {
                    copied: '已複製',
                },
            },
            "no-cover-file": '不下載封面圖檔案',
            "abort-files": {
                label: '取消任務時，如何處理已下載檔案',
                caption: '部分下載器可能不支援此功能',
                options: {
                    prompt: '每次都詢問',
                    delete: '刪除',
                    preserve: '保留',
                },
            },
            group: '常規設定',
        },
        provider: {
            browser: {
                settings: {
                    label: '下載器: browser',
                }
            },
            fsa: {
                settings: {
                    label: '下載器: File System API',
                    directory: {
                        label: '下載資料夾',
                        caption: '點擊更改下載檔案儲存位置',
                    },
                },
            },
        },
    },
    creator: {
        gui: {
            "posts-selector": {
                header: '選擇要下載的貼文',
            },
        },
    },
};