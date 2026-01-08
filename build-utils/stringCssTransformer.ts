import cssnano from 'cssnano';
import type { PluginOption } from 'vite';
import postcss from 'postcss';

/**
 * 将PrimeVue的css-in-js代码进行cssnano压缩的vite插件  
 * 相关css-in-js代码见 node_modules/@primeuix/styles/dist/button/index.mjs  
 * 实测压缩效果有限，在引入了Button一个组件时可减少大约6kb最终产物体积
 */
const stringCssTransformer = (): PluginOption => {
    return {
        name: 'string-css-transformer',
        async transform(code, id, _options) {
            const START = 'var style="';
            const END = '";export{style};';
            const pureCode = code.replace(/\/\/[^\r\n]*$/, '');
            
            if (
                pureCode.startsWith(START) &&
                pureCode.endsWith(END)
            ) {
                // 初步判断是PrimeVue的纯字符串css导出文件，尝试利用postcss和cssnano进行压缩
                const stringCode = pureCode.substring(
                    START.length - 1,
                    pureCode.lastIndexOf(END) + 1
                );
                const origCSS = JSON.parse(jsStr2JsonStr(stringCode));
                const processor = postcss([ cssnano({}) ]);
                let result;
                try {
                    result = await processor.process(origCSS, {
                        from: id,
                        to: id,
                    });
                } catch(err) {
                    // 如果压缩失败，就说明不是css代码
                    // 这时直接返回null，表示保留原始代码不进行更改
                    return null;
                }
                const transformedCSS = result!.css;
                const resultCode = `var style=${ JSON.stringify(transformedCSS) };export{style};`;

                return resultCode;
            }

            return null;

            /**
             * 将javascript格式的字符串字面量代码转换为JSON格式的字符串字面量代码
             * @param strCode javascript格式的字符串字面量
             */
            function jsStr2JsonStr(strCode: string): string {
                // 去除首尾引号
                strCode = strCode.substring(1, strCode.length - 1);

                // 步骤1：处理八进制转义（如\0、\0A0、\123等）→ 转为\uXXXX
                strCode = strCode.replace(/\\([0-7]{1,3})/g, (_match, octal) => {
                    // 八进制转十进制，再转Unicode转义
                    const decimal = parseInt(octal, 8);
                    return `\\u${decimal.toString(16).padStart(4, '0').toUpperCase()}`;
                });

                // 步骤2：处理十六进制转义（如\x20、\xA0等）→ 转为\uXXXX
                strCode = strCode.replace(/\\x([0-9A-Fa-f]{2})/g, (_match, hex) => {
                    return `\\u00${hex.toUpperCase()}`;
                });

                // 步骤3：转义所有反斜杠（JSON需要双重反斜杠）
                // 注意：先处理完其他转义，再转义反斜杠，避免重复转义
                strCode = strCode.replace('\\', '\\\\');

                // 加回首尾引号
                strCode = '"' + strCode + '"';

                return strCode;
            }
        },
    };
};

export default stringCssTransformer;