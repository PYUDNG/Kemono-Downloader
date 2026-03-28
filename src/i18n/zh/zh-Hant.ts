import dedent from "dedent";

export default {
    components: {
        "posts-selector": {
            "selection-buttons": {
                "select-all": '全選',
                clear: '清空',
            },
            list: {
                search: '搜尋'
            },
            buttons: {
                "open-post": '打開貼文頁面',
                ok: '下載',
                cancel: '取消',
            },
            "image-loading": '載入中...',
        }
    },
    api: {
        name: 'Kemono API',
        settings: {
            "group-cache": '快取',
            "clear-api-cache": {
                label: '清理 API 快取',
                caption: '確保從伺服器獲取最新數據',
                button: '清理',
                cleared: {
                    summary: 'API 快取清理',
                    detail: '清理了 {count} 條快取',
                },
            },
        },
    },
    settings: {
        name: '設定',
        menu: {
            label: '設定',
        },
        gui: {
            title: '設定',
            "tabpanel-placeholder": '選擇一個模組以進入其設定',
            "no-items-placeholder": '設定列表為空',
            "reload-to-apply": '修改此設定後，已打開的頁面需要重新整理後才能生效',
            "help-header": '說明 - {name}',
            "mobile-dialog": {
                ok: '儲存',
                cancel: '取消',
            },
            "value-string": {
                switch: {
                    true: '已開啟',
                    false: '已關閉',
                }
            }
        }
    },
    downloader: {
        "show-ui": '下載管理員',
        name: '下載器',
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
                error: '發生錯誤'
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
                    error: '發生錯誤',
                    "title-nodata": '正在等待獲取任務資訊',
                    "caption-nodata": 'service: {service}, creator id: {creatorId}, post id: {postId}',
                    pause: '暫停下載',
                    unpause: '取消暫停',
                    retry: '重試',
                    more: '更多',
                    "confirm-delete-files": '同時刪除已下載的檔案',
                    "confirm-restart": {
                        label: '重新下載',
                        message: '確定要重新開始下載任務 <span class="text-primary">{name}</span> 嗎？<br>現有的下載進度將遺失，並從頭開始下載',
                        header: '確認重新下載',
                        accept: '重新下載',
                        reject: '算了',
                    },
                    "confirm-abort": {
                        label: '停止（取消）下載',
                        message: '確定要停止（取消）下載任務 <span class="text-primary">{name}</span> 嗎？<br>目前尚不支援斷點續傳，如需重新下載將會從頭開始',
                        header: '確認停止（取消）下載',
                        accept: '停止',
                        reject: '算了',
                    },
                    "confirm-remove": {
                        label: '移除下載任務',
                        message: '確定要移除下載任務 <span class="text-primary">{name}</span> 嗎？<br>這將徹底移除下載任務，如需重新下載請回到對應頁面點擊下載按鈕',
                        header: '確認移除下載任務',
                        accept: '移除',
                        reject: '算了',
                    }
                },
                save: {
                    caption: {
                        ongoing: '正在儲存檔案...',
                        complete: '檔案已儲存',
                    },
                },
                file: {
                    caption: '下載進度: {percentage}%, {finished} / {total}',
                },
                post: {
                    caption: '共 {total} 個檔案，已下載 {finished} 個',
                    "caption-aborted": '，已取消 {aborted} 個',
                },
                posts: {
                    caption: '共 {total} 篇貼文，已下載 {finished} 篇',
                    "caption-aborted": '，已取消 {aborted} 篇',
                },
            }
        },
        settings: {
            label: '下載器',
            "feature-not-supported": '當前下載器（{provider}）不支援修改此設定',
            provider: {
                label: '下載器',
                caption: '預設使用瀏覽器內建下載器；其他下載器有其獨特優勢，但需要自行測試與瀏覽器的相容性',
                options: {
                    browser: '瀏覽器內建下載器',
                    fsa: 'File System API',
                    aria2: 'Aria2 RPC',
                },
                help: {
                    instruction: '不同的下載器有不同的特性，下表為根據您的瀏覽器與指令碼管理員測試出的相容性數據：',
                    table: {
                        corner: {
                            provider: '下載器',
                            support: '功能',
                        },
                        provider: {
                            browser: '瀏覽器內建',
                            fsa: 'File System API',
                            aria2: 'Aria2 RPC',
                        },
                        support: {
                            self: '下載器本身可用性',
                            pause: '暫停/繼續下載',
                            "abort-files": '取消任務時刪除已下載檔案',
                            dir: '儲存檔案時建立資料夾結構',
                        },
                    },
                    questionable: '開發者無法 100% 確定此項的相容性與可用性，請自行測試',
                    aria2NeedInstall: dedent`
                        需要自行安裝並配置好 Aria2
                        同時建議使用專業的 Aria2 客戶端 GUI
                    `.replaceAll('\n', '<br>'),
                    fsaMobile: '行動裝置瀏覽器可能會出現檔案讀寫問題，請自行測試',
                },
            },
            filename: {
                label: '檔案命名',
                caption: '可以使用範本進行檔案命名，清空即可恢復預設檔名',
                help: {
                    header: dedent`
                        您可以使用斜線建立目錄結構，Windows 使用 "\\"，Apple/Linux/Android 使用 "/"
                        以下範本可在自訂檔名中使用，不區分大小寫，使用時需保留大括號（點擊即可複製）
                    `.replaceAll('\n', '<br>'),
                    markup: '範本',
                    desc: '說明',
                    templates: {
                        PostID: '貼文內容 ID',
                        CreatorID: '作者 ID',
                        Service: '平台（如 "fanbox"/"fantia" 等）',
                        P: '該檔案在目前資料夾層級中的序號',
                        Name: 'Kemono 伺服器上的原始檔名',
                        Base: '原始檔名的主檔名部分（如 "abc.jpg" 中的 "abc"）',
                        Ext: '原始檔名的副檔名部分（如 "abc.jpg" 中的 "jpg"）',
                        Title: '貼文標題',
                        Creator: '創作者名稱',
                        Year: '四位數年份',
                        Month: '兩位數月份',
                        Date: '兩位數日期',
                        Hour: '兩位數小時',
                        Minute: '兩位數分鐘',
                        Second: '兩位數秒數',
                        Timestamp: '純數字時間戳記',
                        Timetext: '文字格式時間戳記',
                    },
                    footer: '註：所有時間相關範本均基於內容的發佈時間'
                },
                toast: {
                    copied: '已複製',
                },
            },
            "no-cover-file": '不下載封面圖',
            "abort-files": {
                label: '取消任務時，如何處理已下載檔案',
                caption: '部分下載器可能不支援此功能',
                options: {
                    prompt: '每次詢問',
                    delete: '刪除',
                    preserve: '保留',
                },
            },
            concurrent: {
                label: '最大並行下載數量',
                caption: '最多同時下載幾個檔案',
                "feature-not-supported": {
                    browser: '當前下載器（{provider}）不支援修改此設定',
                    fsa: '當前下載器（{provider}）不支援修改此設定',
                    aria2: '您當前的下載器是 {provider}，請透過伺服端設定檔或專業 Aria2 介面調整此設定',
                },
            },
            "text-content": {
                label: '同時下載貼文文字內容',
                caption: '使用檔案命名功能自訂檔名時，此檔案的原始檔名為 content.txt/content.html',
                "feature-not-supported": {
                    browser: '當前下載器（{provider}）不支援修改此設定',
                    fsa: '當前下載器（{provider}）不支援修改此設定',
                    aria2: '{provider} 不支援此功能',
                },
                options: {
                    none: '不下載文字內容',
                    txt: '下載為 .txt 檔案',
                    html: '下載為 .html 檔案',
                },
            },
            "auto-retry": {
                label: '自動重試次數',
                caption: '下載任務失敗時最多自動重試幾次；設定為 0 則不自動重試；設定為負數則無限自動重試',
            },
            group: '常規設定',
        },
        provider: {
            browser: {
                settings: {
                    label: '下載器：瀏覽器內建下載器',
                }
            },
            fsa: {
                settings: {
                    label: '下載器：File System API',
                    directory: {
                        label: '下載資料夾',
                        caption: '點擊更改下載檔案儲存位置',
                        "not-selected": '尚未選擇資料夾',
                    },
                    "permission-check": {
                        label: '檢查資料夾權限',
                        caption: '如果下載時無法正常觸發授權且儲存錯誤，請點這裡',
                        button: '授權',
                        toast: {
                            granted: {
                                title: '權限檢查',
                                message: '權限已授予',
                            },
                            failed: {
                                title: '權限檢查',
                                message: '無法獲取可讀寫的資料夾權限',
                            },
                        },
                    },
                },
            },
            aria2: {
                settings: {
                    label: '下載器：Aria2',
                    "disabled-text": 'Aria2 並非目前使用的下載器',
                    endpoint: {
                        label: 'Aria2 伺服器',
                        caption: '伺服端連結，支援 http(s)/ws(s) 協定',
                    },
                    secret: {
                        label: '金鑰',
                        caption: '留空則不使用金鑰',
                    },
                    dir: {
                        label: '下載位置',
                        caption: '儲存下載檔案的資料夾路徑，留空則不指定',
                        help: dedent`
                            如果您曾在 Aria2 伺服端設定過下載位置，此選項會覆蓋該設定
                            如需使用伺服端預設配置，請將此處留空
                            <span class="font-bold">請注意：如果您希望透過自訂檔名建立資料夾，則此項不可省略，否則資料夾將會在 Aria2 執行目錄而非下載目錄下建立</span>
                        `.replaceAll('\n', '<br>'),
                    },
                    interval: {
                        label: '任務重新整理間隔（秒）',
                        caption: '下載時，每隔多久重新整理一次任務進度',
                    },
                    "connection-test": {
                        label: '測試連線',
                        caption: '使用目前配置嘗試連線至 Aria2 伺服器',
                        button: '測試',
                        toast: {
                            "not-enabled": {
                                title: '未啟用 Aria2 下載器',
                                message: '請先將下載器設定為 Aria2 再進行測試',
                            },
                            "not-ready": {
                                title: '未連接 Aria2 下載器',
                                message: 'Aria2 下載器尚未就緒，請檢查配置後測試',
                            },
                            granted: {
                                title: '連線成功',
                                message: '已連線至 Aria2 伺服器，版本 {version}',
                            },
                            failed: {
                                title: '連線失敗',
                                message: '無法連線，請檢查配置',
                            },
                        },
                    },
                }
            },
        },
    },
    creator: {
        name: '創作者頁面',
        gui: {
            download: '下載',
            "posts-selector": {
                header: '選擇要下載的貼文',
            },
        },
    },
    post: {
        name: '貼文頁面',
        gui: {
            download: '下載',
        },
    },
    debugging: {
        name: '偵錯',
        settings: {
            "group-log": '記錄檔',
            "save-logs": {
                label: '記錄記錄檔',
                caption: '將執行記錄儲存在指令碼儲存空間中以便匯出；非必要請勿開啟，記錄過多會導致速度變慢',
            },
            "export-logs": {
                label: '匯出記錄檔',
                caption: '如需回報 Bug，請先開啟上方的「記錄記錄檔」並重新整理頁面觸發 Bug，最後點擊此處匯出',
                button: '匯出',
            },
            "clear-logs": {
                label: '清空記錄檔',
                caption: '如果不再需要已記錄的內容，點擊此處刪除',
                button: '清空',
                cleared: {
                    summary: '記錄檔清理',
                    detail: '已刪除所有記錄，釋放 {size} 空間'
                }
            },
        },
    },
    self: {
        name: '關於',
        settings: {
            label: '關於',
            version: {
                label: '版本號',
            },
            github: {
                label: 'GitHub 儲存庫',
            },
            greasyfork: {
                label: 'Greasyfork 指令碼',
            },
        },
    },
};