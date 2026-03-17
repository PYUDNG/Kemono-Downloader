/**
 * 一个页面的日志
 */
export interface LogPage {
    /**
     * 页面的performance.timeOrigin  
     * 用作页面唯一标识符
     */
    timeOrigin: number;

    /**
     * 日志条目列表
     */
    items: any[];

    /**
     * 页面url
     */
    url: string;
}