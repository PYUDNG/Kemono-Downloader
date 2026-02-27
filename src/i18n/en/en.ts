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
                    caption: 'Download progress: {percentage}%, {finished} / {total}'
                },
                post: {
                    caption: 'Total {total} files, {finished} downloaded'
                },
                posts: {
                    caption: 'Total {total} posts, {finished} downloaded'
                }
            }
        },
        settings: {
            label: 'Downloader',
            "feature-not-supported": 'Current downloader ({provider}) does not support this feature',
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
                        label: 'Download folder',
                        caption: 'Click to change download file save location',
                    },
                },
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