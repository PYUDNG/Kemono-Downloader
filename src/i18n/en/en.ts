import dedent from "dedent";

export default {
    components: {
        "posts-selector": {
            "selection-buttons": {
                "select-all": 'Select All',
                clear: 'Clear',
            },
            list: {
                search: 'Search'
            },
            buttons: {
                "open-post": 'Open Post Page',
                ok: 'Download',
                cancel: 'Cancel',
            },
            "image-loading": 'Loading...',
        }
    },
    api: {
        name: 'Kemono API',
        settings: {
            "group-cache": 'Cache',
            "api-cache-expires": {
                label: 'API Cache Expiration',
                caption: 'Unit: minutes; expired cache will be automatically cleared',
            },
            "clear-api-cache": {
                label: 'Clear API Cache',
                caption: 'Ensure the latest data is fetched from the server',
                button: 'Clear',
                cleared: {
                    summary: 'API Cache Cleared',
                    detail: 'Cleared {count} cache entries',
                },
            },
        },
    },
    settings: {
        name: 'Settings',
        menu: {
            label: 'Settings',
        },
        gui: {
            title: 'Settings',
            "tabpanel-placeholder": 'Select a module to access its settings',
            "no-items-placeholder": 'Settings list is empty',
            "reload-to-apply": 'Changes to this setting will take effect after refreshing the page',
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
            "title-detail": 'Task Detail - {name}',
            "title-detail-noname": 'Task Detail',
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
                    retry: 'Retry',
                    more: 'More',
                    "confirm-delete-files": 'Also delete downloaded files',
                    "confirm-restart": {
                        label: 'Redownload',
                        message: 'Are you sure you want to restart the download task <span class="text-primary">{name}</span>?<br>Current progress will be lost.',
                        header: 'Confirm Redownload',
                        accept: 'Restart',
                        reject: 'Cancel',
                    },
                    "confirm-abort": {
                        label: 'Abort Download',
                        message: 'Are you sure you want to abort the task <span class="text-primary">{name}</span>?<br>Resuming is not supported; restarting will start from the beginning.',
                        header: 'Confirm Abort',
                        accept: 'Abort',
                        reject: 'Cancel',
                    },
                    "confirm-remove": {
                        label: 'Remove Task',
                        message: 'Are you sure you want to remove the task <span class="text-primary">{name}</span>?<br>The task will be permanently removed.',
                        header: 'Confirm Removal',
                        accept: 'Remove',
                        reject: 'Cancel',
                    }
                },
                save: {
                    caption: {
                        ongoing: 'Saving file...',
                        complete: 'File saved',
                    },
                },
                file: {
                    caption: 'Progress: {percentage}%, {finished} / {total}',
                },
                post: {
                    caption: '{total} files total, {finished} downloaded',
                    "caption-aborted": ', {aborted} aborted',
                },
                posts: {
                    caption: '{total} posts total, {finished} downloaded',
                    "caption-aborted": ', {aborted} aborted',
                },
            }
        },
        settings: {
            label: 'Downloader',
            "feature-not-supported": 'The current downloader ({provider}) does not support this setting',
            provider: {
                label: 'Provider',
                caption: 'Uses the browser default downloader by default. Others offer unique advantages but require compatibility testing.',
                options: {
                    browser: 'Browser Built-in',
                    fsa: 'File System API',
                    aria2: 'Aria2 RPC',
                },
                help: {
                    instruction: 'Different providers have different features. Compatibility tested for your browser/manager:',
                    table: {
                        corner: {
                            provider: 'Provider',
                            support: 'Features',
                        },
                        provider: {
                            browser: 'Built-in',
                            fsa: 'File System API',
                            aria2: 'Aria2 RPC',
                        },
                        support: {
                            self: 'Availability',
                            pause: 'Pause/Resume',
                            "abort-files": 'Delete files on abort',
                            dir: 'Create directory structure',
                        },
                    },
                    questionable: 'Compatibility is not 100% guaranteed; please test manually.',
                    aria2NeedInstall: dedent`
                        Aria2 needs to be installed and configured manually.
                        Using a professional Aria2 GUI client is recommended.
                    `.replaceAll('\n', '<br>'),
                    fsaMobile: 'Mobile browsers may experience file I/O issues.',
                },
            },
            filename: {
                label: 'Filenaming',
                caption: 'Use templates for custom filenaming. Clear to restore defaults.',
                help: {
                    header: dedent`
                        You can use slashes to create directory structures: "\" for Windows, "/" for Apple/Linux/Android.
                        If folders are not created despite using slashes, please try switching to another downloader, such as File System API or Aria2.
                        The following templates can be used in custom filenames (case-insensitive). Keep the curly braces (click to copy):
                    `.replaceAll('\n', '<br>'),
                    markup: 'Template',
                    desc: 'Description',
                    templates: {
                        PostID: 'Post Content ID',
                        CreatorID: 'Creator ID',
                        Service: 'Platform (e.g., "fanbox", "fantia")',
                        P: 'File index in current directory',
                        Name: 'Original filename on server',
                        Base: 'Filename without extension (e.g., "abc" from "abc.jpg")',
                        Ext: 'File extension (e.g., "jpg")',
                        Title: 'Post Title',
                        Creator: 'Creator Name',
                        Year: '4-digit Year',
                        Month: '2-digit Month',
                        Date: '2-digit Date',
                        Hour: '2-digit Hour',
                        Minute: '2-digit Minute',
                        Second: '2-digit Second',
                        Timestamp: 'Numeric Timestamp',
                        Timetext: 'Textual Timestamp',
                    },
                    footer: 'Note: All time-related templates are based on the content publish date.'
                },
                toast: {
                    copied: 'Copied',
                },
            },
            "no-cover-file": 'Do not download cover images',
            "abort-files": {
                label: 'Action on task abort',
                caption: 'May not be supported by all providers',
                options: {
                    prompt: 'Always ask',
                    delete: 'Delete downloaded files',
                    preserve: 'Keep downloaded files',
                },
            },
            concurrent: {
                label: 'Max Concurrent Downloads',
                caption: 'Number of files to download simultaneously',
                "feature-not-supported": {
                    browser: 'The current provider ({provider}) does not support this setting',
                    fsa: 'The current provider ({provider}) does not support this setting',
                    aria2: 'Using {provider}? Adjust this via server config or Aria2 GUI.',
                },
            },
            "text-content": {
                label: 'Download post text content',
                caption: 'Filename will be content.txt/content.html unless customized.',
                "feature-not-supported": {
                    browser: 'The current provider ({provider}) does not support this setting',
                    fsa: 'The current provider ({provider}) does not support this setting',
                    aria2: 'Not supported by {provider}',
                },
                options: {
                    none: 'None',
                    txt: 'Download as .txt',
                    html: 'Download as .html',
                },
            },
            "auto-retry": {
                label: 'Auto-Retry Attempts',
                caption: 'Maximum number of automatic retries when a download task fails; set to 0 to disable auto-retry; set to a negative value for infinite retries',
            },
            group: 'General',
        },
        provider: {
            browser: {
                settings: {
                    label: 'Provider: Browser Built-in',
                }
            },
            fsa: {
                settings: {
                    label: 'Provider: File System API',
                    directory: {
                        label: 'Download Folder',
                        caption: 'Click to change save location',
                        "not-selected": 'No folder selected',
                    },
                    "permission-check": {
                        label: 'Check Permissions',
                        caption: 'If authorization fails or errors occur, click here',
                        button: 'Authorize',
                        toast: {
                            granted: {
                                title: 'Permission Check',
                                message: 'Permission granted',
                            },
                            failed: {
                                title: 'Permission Check',
                                message: 'Unable to obtain read/write access',
                            },
                        },
                    },
                },
            },
            aria2: {
                settings: {
                    label: 'Provider: Aria2',
                    "disabled-text": 'Aria2 is not the current provider',
                    endpoint: {
                        label: 'Aria2 Server',
                        caption: 'Server endpoint, supports http(s)/ws(s)',
                    },
                    secret: {
                        label: 'Secret',
                        caption: 'Leave blank if not used',
                    },
                    dir: {
                        label: 'Download Path',
                        caption: 'Path to store downloads; leave blank to use server default',
                        help: dedent`
                            This overrides the server-side configuration.
                            Leave blank to use the default server path.
                            <span class="font-bold">Note: Required for custom filename subdirectories, otherwise they will be created in the Aria2 execution root.</span>
                        `.replaceAll('\n', '<br>'),
                    },
                    interval: {
                        label: 'Refresh Interval (sec)',
                        caption: 'How often to refresh task progress',
                    },
                    "connection-test": {
                        label: 'Test Connection',
                        caption: 'Try connecting to the Aria2 server with current settings',
                        button: 'Test',
                        toast: {
                            "not-enabled": {
                                title: 'Aria2 Not Enabled',
                                message: 'Set provider to Aria2 before testing',
                            },
                            "not-ready": {
                                title: 'Aria2 Not Ready',
                                message: 'Downloader not initialized, check config',
                            },
                            granted: {
                                title: 'Success',
                                message: 'Connected to Aria2 server, version {version}',
                            },
                            failed: {
                                title: 'Failed',
                                message: 'Connection failed, check config',
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
        name: 'Debug',
        settings: {
            "group-log": 'Logs',
            "save-logs": {
                label: 'Save Logs',
                caption: 'Saves logs to script storage for export; may slow down the script if kept on indefinitely',
            },
            "export-logs": {
                label: 'Export Logs',
                caption: 'To report a bug: enable logs, reproduce the bug, then click here to export',
                button: 'Export',
            },
            "clear-logs": {
                label: 'Clear Logs',
                caption: 'Delete recorded logs if no longer needed',
                button: 'Clear',
                cleared: {
                    summary: 'Logs Cleared',
                    detail: 'All logs deleted, {size} freed'
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