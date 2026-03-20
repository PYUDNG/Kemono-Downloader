import dedent from "dedent";

export default {
    components: {
        "posts-selector": {
            list: {
                search: 'Search'
            },
            buttons: {
                "open-post": 'Open Post Page',
                ok: 'Download',
                cancel: 'Cancel',
            },
        }
    },
    api: {
        name: 'Kemono API',
    },
    settings: {
        name: 'Settings',
        menu: {
            label: 'Settings',
        },
        gui: {
            title: 'Settings',
            "tabpanel-placeholder": 'Select a module to enter its settings',
            "no-items-placeholder": 'Settings list is empty',
            "reload-to-apply": 'Changes will take effect after refreshing the page',
            "help-header": 'Help - {name}',
            "mobile-dialog": {
                ok: 'Save',
                cancel: 'Cancel',
            },
            "value-string": {
                switch: {
                    true: 'Enabled',
                    false: 'Disabled',
                }
            }
        }
    },
    downloader: {
        "show-ui": 'Download Manager',
        name: 'Downloader',
        gui: {
            title: 'Downloader',
            "title-detail": 'Task Details - {name}',
            "title-detail-noname": 'Task Details',
            tabs: {
                init: 'Initializing',
                queue: 'Queued',
                paused: 'Paused',
                ongoing: 'Downloading',
                complete: 'Completed',
                aborted: 'Aborted',
                error: 'Error'
            },
            "task-component": {
                common: {
                    caption: 'Progress: {percentage}%, {finished} / {total}',
                    unknown: 'Unknown',
                    init: 'Initializing',
                    queue: 'Queued',
                    ongoing: 'Downloading',
                    paused: 'Paused',
                    complete: 'Completed',
                    aborted: 'Aborted',
                    error: 'Error',
                    "title-nodata": 'Waiting for task information',
                    "caption-nodata": 'service: {service}, creator id: {creatorId}, post id: {postId}',
                    pause: 'Pause',
                    unpause: 'Resume',
                    "confirm-delete-files": 'Also delete downloaded files',
                    "confirm-restart": {
                        label: 'Redownload',
                        message: 'Are you sure you want to restart the download task <span class="text-primary">{name}</span>?<br>Current progress will be lost and the download will start from the beginning',
                        header: 'Confirm Redownload',
                        accept: 'Redownload',
                        reject: 'Cancel',
                    },
                    "confirm-abort": {
                        label: 'Stop (Abort) Download',
                        message: 'Are you sure you want to stop (abort) the download task <span class="text-primary">{name}</span>?<br>Resuming is not currently supported; you will have to restart from the beginning if needed',
                        header: 'Confirm Abort',
                        accept: 'Stop',
                        reject: 'Cancel',
                    },
                    "confirm-remove": {
                        label: 'Remove Task',
                        message: 'Are you sure you want to remove the download task <span class="text-primary">{name}</span>?<br>The task will be permanently removed; you must click the download button again on the original page to restart',
                        header: 'Confirm Removal',
                        accept: 'Remove',
                        reject: 'Cancel',
                    }
                },
                file: {
                    caption: 'Progress: {percentage}%, {finished} / {total}',
                },
                post: {
                    caption: '{total} files in total, {finished} downloaded',
                    "caption-aborted": ', {aborted} aborted',
                },
                posts: {
                    caption: '{total} posts in total, {finished} downloaded',
                    "caption-aborted": ', {aborted} aborted',
                },
            }
        },
        settings: {
            label: 'Downloader',
            "feature-not-supported": 'The current downloader ({provider}) does not support modifying this setting',
            provider: {
                label: 'Downloader Provider',
                caption: 'Defaults to Browser Built-in; other downloaders have unique advantages but require compatibility testing with your browser/manager',
                options: {
                    browser: 'Browser Built-in',
                    fsa: 'File System API',
                    aria2: 'Aria2 RPC',
                },
                help: {
                    instruction: 'Different downloaders have different characteristics. The following table shows compatibility data tested against your browser and script manager:',
                    table: {
                        corner: {
                            provider: 'Provider',
                            support: 'Features',
                        },
                        provider: {
                            browser: 'Browser Built-in',
                            fsa: 'File System API',
                            aria2: 'Aria2 RPC',
                        },
                        support: {
                            self: 'Provider Availability',
                            pause: 'Pause/Resume',
                            "abort-files": 'Delete files when aborting',
                            dir: 'Create folder structure',
                        },
                    },
                    questionable: 'Developer cannot guarantee 100% compatibility for this item; please test it yourself',
                    aria2NeedInstall: dedent`
                        Aria2 needs to be installed and configured manually.
                        A professional Aria2 client GUI is also recommended.
                    `.replaceAll('\n', '<br>'),
                    fsaMobile: 'Mobile browsers may encounter file read/write issues; please test it yourself',
                },
            },
            filename: {
                label: 'File Naming',
                caption: 'Use templates for custom naming; leave empty to restore default filenames',
                help: {
                    header: dedent`
                        You can use slashes to create directory structures: "\\" for Windows, and "/" for Apple/Linux/Android.
                        The following templates can be used in custom filenames (case-insensitive); keep the curly braces when using them (click to copy).
                    `.replaceAll('\n', '<br>'),
                    markup: 'Template',
                    desc: 'Description',
                    templates: {
                        PostID: 'Post ID',
                        CreatorID: 'Creator ID',
                        Service: 'Platform (e.g., "fanbox", "fantia", etc.)',
                        P: 'The index of the file in the current folder level',
                        Name: 'Original filename on Kemono server',
                        Base: 'Filename without extension (e.g., "abc" from "abc.jpg")',
                        Ext: 'File extension (e.g., "jpg" from "abc.jpg")',
                        Title: 'Post Title',
                        Creator: 'Creator Name',
                        Year: '4-digit Year',
                        Month: '2-digit Month',
                        Date: '2-digit Date',
                        Hour: '2-digit Hour',
                        Minute: '2-digit Minute',
                        Second: '2-digit Second',
                        Timestamp: 'Numeric Timestamp',
                        Timetext: 'Readable Timestamp',
                    },
                    footer: 'Note: All time-related templates are based on the content\'s publication time'
                },
                toast: {
                    copied: 'Copied',
                },
            },
            "no-cover-file": 'Do not download cover images',
            "abort-files": {
                label: 'Action when aborting a task',
                caption: 'Some downloaders may not support this feature',
                options: {
                    prompt: 'Always ask',
                    delete: 'Delete downloaded files',
                    preserve: 'Keep downloaded files',
                },
            },
            concurrent: {
                label: 'Max Concurrent Downloads',
                caption: 'Maximum number of files to download simultaneously',
                "feature-not-supported": {
                    browser: 'The current downloader ({provider}) does not support modifying this setting',
                    fsa: 'The current downloader ({provider}) does not support modifying this setting',
                    aria2: 'Your current downloader is {provider}; please adjust this setting via the server configuration file or a professional Aria2 interface',
                },
            },
            group: 'General Settings',
        },
        provider: {
            browser: {
                settings: {
                    label: 'Downloader: Browser Built-in',
                }
            },
            fsa: {
                settings: {
                    label: 'Downloader: File System API',
                    directory: {
                        label: 'Download Folder',
                        caption: 'Click to change the download destination',
                        "not-selected": 'No folder selected',
                    },
                    "permission-check": {
                        label: 'Check Folder Permissions',
                        caption: 'If authorization isn\'t triggered or errors occur during saving, click here',
                        button: 'Authorize',
                        toast: {
                            granted: {
                                title: 'Permission Check',
                                message: 'Permission granted',
                            },
                            failed: {
                                title: 'Permission Check',
                                message: 'Unable to acquire read/write permissions for the folder',
                            },
                        },
                    },
                },
            },
            aria2: {
                settings: {
                    label: 'Downloader: Aria2',
                    "disabled-text": 'Aria2 is not the current downloader',
                    endpoint: {
                        label: 'Aria2 Server',
                        caption: 'Server endpoint, supports http(s)/ws(s) protocols',
                    },
                    secret: {
                        label: 'Secret',
                        caption: 'Leave empty if no secret is required',
                    },
                    dir: {
                        label: 'Download Path',
                        caption: 'Folder path for saving downloads; leave empty to use default',
                        help: dedent`
                            If you have configured a download location on the Aria2 server, this option will override it.
                            To use the server-side configuration, please leave this field empty.
                            <span class="font-bold">Note: If you intend to create folders via custom filenames, this field must be specified; otherwise, custom folders will be created in the Aria2 execution directory instead of the server's download directory.</span>
                        `.replaceAll('\n', '<br>'),
                    },
                    interval: {
                        label: 'Task Refresh Interval (sec)',
                        caption: 'The time interval for refreshing task progress during download',
                    },
                    "connection-test": {
                        label: 'Test Connection',
                        caption: 'Attempt to connect to the Aria2 server with current settings',
                        button: 'Test',
                        toast: {
                            "not-enabled": {
                                title: 'Aria2 Not Enabled',
                                message: 'Please set the downloader to Aria2 before testing',
                            },
                            "not-ready": {
                                title: 'Aria2 Not Connected',
                                message: 'Aria2 downloader is not ready; please check the configuration and test the connection',
                            },
                            granted: {
                                title: 'Connection Successful',
                                message: 'Connected to Aria2 server, version {version}',
                            },
                            failed: {
                                title: 'Connection Failed',
                                message: 'Unable to connect, please check your settings',
                            },
                        },
                    },
                }
            },
        },
    },
    creator: {
        name: 'Creator Page',
        gui: {
            download: 'Download',
            "posts-selector": {
                header: 'Select posts to download',
            },
        },
    },
    post: {
        name: 'Post Page',
        gui: {
            download: 'Download',
        },
    },
    debugging: {
        name: 'Debugging',
        settings: {
            "group-log": 'Logs',
            "save-logs": {
                label: 'Save Logs',
                caption: 'Save runtime logs in the script storage for later export; only enable when necessary, as excessive logs may slow down the script',
            },
            "export-logs": {
                label: 'Export Logs',
                caption: 'To report a bug, please enable the "Save Logs" button above, refresh the page to reproduce the bug, and then click here to export the log file for feedback',
                button: 'Export',
            },
            "clear-logs": {
                label: 'Clear Logs',
                caption: 'If recorded logs are no longer needed, click here to delete them',
                button: 'Clear',
                cleared: {
                    summary: 'Logs Cleared',
                    detail: 'All logs have been deleted, freeing up {size} of space'
                }
            },
        },
    },
    self: {
        name: 'About',
        settings: {
            label: 'About',
            version: {
                label: 'Version',
            },
            github: {
                label: 'GitHub Repository',
            },
            greasyfork: {
                label: 'Greasyfork Script',
            },
        },
    },
};