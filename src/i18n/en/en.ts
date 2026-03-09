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
    settings: {
        menu: {
            label: 'Settings',
        },
        gui: {
            title: 'Settings',
            "tabpanel-placeholder": 'Select a module to enter its settings',
            "no-items-placeholder": 'Settings list is empty',
            "reload-to-apply": 'After modifying this setting, open pages need to be refreshed to take effect',
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
                    caption: 'Download progress: {percentage}%, {finished} / {total}',
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
                    pause: 'Pause download',
                    unpause: 'Unpause',
                    "confirm-delete-files": 'Also delete downloaded files',
                    "confirm-restart": {
                        label: 'Restart Download',
                        message: 'Are you sure you want to restart download task <span class="text-primary">{name}</span>?<br>Existing download progress will be lost and download will start from the beginning',
                        header: 'Confirm Restart Download',
                        accept: 'Restart',
                        reject: 'Cancel',
                    },
                    "confirm-abort": {
                        label: 'Stop (Cancel) Download',
                        message: 'Are you sure you want to stop (cancel) download task <span class="text-primary">{name}</span>?<br>Resume from breakpoint is not supported yet, if you need to restart download it will start from the beginning',
                        header: 'Confirm Stop (Cancel) Download',
                        accept: 'Stop',
                        reject: 'Cancel',
                    },
                    "confirm-remove": {
                        label: 'Remove Download Task',
                        message: 'Are you sure you want to remove download task <span class="text-primary">{name}</span>?<br>The download task will be completely removed, if you need to download again please click the download button on the corresponding page',
                        header: 'Confirm Remove Download Task',
                        accept: 'Remove',
                        reject: 'Cancel',
                    }
                },
                file: {
                    caption: 'Download Progress: {percentage}%, {finished} / {total}',
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
                label: 'Downloader',
                caption: 'Default uses browser built-in download; other downloaders have their unique advantages, but require testing compatibility with your browser',
                options: {
                    browser: 'Browser built-in download',
                    fsa: 'File System API',
                    "aria2": 'Aria2 RPC'
                }
            },
            filename: {
                label: 'File Naming',
                caption: 'You can use templates for file naming, clear to restore default filename',
                // Note: If modifying templates here, also check if src\modules\downloader\gui\FilenameHelpComp.vue needs to be updated
                help: {
                    header: 'The following templates can be used in custom filenames, case-insensitive, keep braces when using (click to copy)',
                    markup: 'Template',
                    desc: 'Description',
                    templates: {
                        PostID: 'Post content ID',
                        CreatorID: 'Creator ID',
                        Service: 'Platform (e.g., "fanbox"/"fantia", etc.)',
                        P: 'The file\'s sequence number in the current folder level',
                        Name: 'Original filename on kemono server',
                        Base: 'Non-extension part of original filename (e.g., "abc" in "abc.jpg")',
                        Ext: 'Extension part of original filename (e.g., "jpg" in "abc.jpg")',
                        Title: 'Post content title',
                        Creator: 'Creator name',
                        Year: 'Four-digit year',
                        Month: 'Two-digit month',
                        Date: 'Two-digit date',
                        Hour: 'Two-digit hour',
                        Minute: 'Two-digit minute',
                        Second: 'Two-digit second',
                        Timestamp: 'Pure numeric timestamp',
                        Timetext: 'Text timestamp',
                    },
                    footer: 'Note: All time-related templates are based on the content\'s publication time'
                },
                toast: {
                    copied: 'Copied',
                },
            },
            "no-cover-file": 'Do not download cover image files',
            "abort-files": {
                label: 'When canceling task, how to handle downloaded files',
                caption: 'Some downloaders may not support this feature',
                options: {
                    prompt: 'Ask every time',
                    delete: 'Delete',
                    preserve: 'Preserve',
                },
            },
            group: 'General Settings',
        },
        provider: {
            browser: {
                settings: {
                    label: 'Downloader: browser',
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
        gui: {
            "posts-selector": {
                header: 'Select posts to download',
            },
        },
    },
};