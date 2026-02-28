import { FileItem } from "@/modules/api/types/common";
import { PostApiResponse } from "@/modules/api/types/post";
import { PostsApiResponse } from "@/modules/api/types/posts";
import { ProfileApiResponse } from "@/modules/api/types/profile";
import { globalStorage } from "@/storage";
import { Nullable, ReplaceRule, safeBatchReplace } from "@/utils/main";

const storage = globalStorage.withKeys('downloader');

/**
 * 用于构建文件名的api数据和必要信息
 */
interface FilenameInfo {
    /** api数据 */
    data: {
        posts?: Nullable<PostsApiResponse>;
        post?: Nullable<PostApiResponse>;
        file?: Nullable<FileItem>;
        creator?: Nullable<ProfileApiResponse>;
    };

    /** 该文件在当前文件夹层级中是第几个文件 */
    p: number;
}

/**
 * 为一个文件，根据其api数据和用户设置的文件名模板构建文件名（路径）  
 * @param data 用于构建文件名的api数据和必要api信息
 * @param template 文件名模板，如果未传入，则从存储中读取
 * @param placeholder 当模板中某markup所需的信息在给定的信息中缺失时，该模板用什么填充；null代表使用模板自身填充
 */
export function constructFilename(
    info: FilenameInfo,
    template?: string,
    placeholder: Nullable<string> = null,
) {
    // 参数处理
    const data = info.data;
    template = template ?? storage.get('filename');

    // 模板数据所用到的值
    const dotIndex = data.file ? data.file.name.lastIndexOf('.') : null;
    const date = data.post?.post.published ? new Date(data.post?.post.published) : null;

    // 合成模板数据
    const templateData: Record<string, undefined | null | string | number> = {
        PostID: data.post?.post.id,
        CreatorID: data.post?.post.user,
        Service: data.post?.post.service,
        P: info.p,
        Name: data.file?.name,
        Base: data.file?.name.substring(0, dotIndex!),
        Ext: data.file?.name.substring(dotIndex! + 1),
        Title: data.post?.post.title,
        Creator: data.creator?.name,
        Year: date?.getFullYear(),
        Month: date ? date?.getMonth() + 1 : null,
        Date: date?.getDate(),
        Hour: date?.getHours(),
        Minute: date?.getMinutes(),
        Second: date?.getSeconds(),
        Timestamp: date?.getTime(),
        TimeText: date?.toLocaleString(),
    };
    // 模板数据转字符串，并将文件名非法字符转全角
    /**
     * 文件名非法字符与对应的全角字符映射表  
     * 目前只有windows版本，MacOS和Linux待补充
     */
    const replacements: Readonly<Record<string, string>> = {
        '<': '＜',
        '>': '＞',
        ':': '：',
        '"': '＂',
        '/': '／',
        '\\': '＼',
        '|': '｜',
        '?': '？',
        '*': '＊',
    };
    Object.entries(templateData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
            for (const [char, repl] of Object.entries(replacements)) {
                val = val.toString().replaceAll(char, repl);
            }
            templateData[key] = val
        }
    });

    // 合成文件名字符串
    const markups = Object.keys(templateData).filter(markup =>
        template!.toLowerCase().includes(markup.toLowerCase()));
    const rules: ReplaceRule[] = markups.map(markup => {
        const [key, val] = Object.entries(templateData)
            .find(([key, _val]) => key.toLowerCase() === markup.toLowerCase())!;
        const strPlaceholder = placeholder === null ? key : placeholder;
        return {
            search: '{' + key.toString() + '}',
            replace: val?.toString() ?? strPlaceholder,
        };
    })
    return safeBatchReplace(template!, rules);
}

/**
 * 将PostApiResonse中的文件根据api预览图部分提供的server服务器域名信息补全为完整的url  
 * 如果没有对应文件的预览信息，或预览信息中没有serve字段，就使用`'n1.${ location.host }'`
 */
export function getFullUrl(file: FileItem, data: PostApiResponse): string {
    const preview = data.previews.find(p => p.path === file.path);
    // preview.server be like: 'https://n3.kemono.cr'
    const server = preview?.server ?? `https://n1.${ location.host }`;
    return `${server}/data${file.path}`;
}