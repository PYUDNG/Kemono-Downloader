export class UserscriptMeta {
    code = '';
    body = '';
    header = '';
    bodyPrefix = '';
    bodySuffix = '';
    meta = {};

    constructor(code) {
        this.code = code;
        this.#parse();
    }

    #parse() {
        const lines = this.code.split('\n');
        const headerStartIndex = lines.findIndex(line => line.trim() === '// ==UserScript==');
        const headerEndIndex = lines.findIndex(line => line.trim() === '// ==/UserScript==');

        if (headerStartIndex === -1)
            throw new Error('未找到用户脚本头部注释块开始标记 (// ==UserScript==)');
        if (headerEndIndex === -1)
            throw new Error('未找到用户脚本头部注释块结束标记 (// ==/UserScript==)');

        // 提取头部注释块
        const headerLines = lines.slice(headerStartIndex, headerEndIndex + 1);
        const codeLines = [...lines.slice(0, headerStartIndex), ...lines.slice(headerEndIndex + 1)];
        const header = headerLines.join('\n');
        const body = codeLines.join('\n');

        // 解析头部注释块
        const meta = {};
        headerLines.forEach(line => {
            const match = line.match(/^\/\/ *@([^ :]+)(:([^ ]+))? *([^\n]+)$/);
            if (!match) return;

            const [_comment, name, _colon, i18n, val] = match;

            if (i18n) {
                // i18n suffixed
                if (meta[name]) {
                    if (typeof meta[name] === 'object') {
                        meta[name][i18n] = val;
                    } else {
                        meta[name] = {
                            '': meta[name],
                            [i18n]: val,
                        };
                    }
                } else {
                    meta[name] = { [i18n]: val };
                }
            } else {
                // string or array
                if (meta[name]) {
                    // array
                    if (Array.isArray(meta[name])) {
                        meta[name].push(val);
                    } else {
                        meta[name] = [meta[name], val];
                    }
                } else {
                    // string (for now)
                    meta[name] = val;
                }
            }
        });

        this.body = body;
        this.header = header;
        this.meta = meta;
        this.#update();
    }

    set(key, val) {
        this.meta[key] = val;
        this.#update();
    }

    add(key, val) {
        if (Array.isArray(this.meta[key])) {
            this.meta[key].push(val);
        } else if (typeof this.meta[key] === 'string') {
            this.meta[key] = [
                this.meta[key],
                val,
            ];
        } else {
            throw new TypeError('i18n keys cannot use array values');
        }
        this.#update();
    }

    i18n(key, i18n, val) {
        if (Array.isArray(this.meta[key]) || typeof this.meta[key] === 'string') {
            throw new TypeError('Attempt to add i18n to not-i18n value');
        }

        this.meta[key][i18n] = val;
    }

    remove(key) {
        delete this.meta[key];
    }

    setBodyPrefix(str) {
        this.bodyPrefix = str;
        this.#update();
    }

    setBodySuffix(str) {
        this.bodySuffix = str;
        this.#update();
    }

    setBody(str) {
        this.body = str;
        this.#update();
    }

    #update() {
        let maxKeyLen = 0;
        this.header = [
            '// ==UserScript==',
            ...Object.entries(this.meta).reduce((lines, [key, val]) => {
                if (typeof val === 'string') {
                    // 字符串值：单一key对单一value
                    maxKeyLen = Math.max(maxKeyLen, key.length);
                    lines.push({ key, val });
                } else if (Array.isArray(val)) {
                    // 数组值：单一key对多个value
                    maxKeyLen = Math.max(maxKeyLen, key.length);
                    val.forEach(val => 
                        lines.push({ key, val })
                    );
                } else {
                    // 对象值：带i18n变体的key和多个value一一对应
                    Object.entries(val).forEach(([i18n, val]) => {
                        const lineKey = `${key}${i18n ? ':' : ''}${i18n}`;
                        maxKeyLen = Math.max(maxKeyLen, lineKey.length);
                        lines.push({
                            key: lineKey,
                            val: val,
                        });
                    });
                }

                return lines;
            }, []).map(line => `// @${line.key.padEnd(maxKeyLen, ' ')} ${line.val}`),
            '// ==/UserScript==',
        ].join('\n');
        this.code = [this.header, this.bodyPrefix, this.body, this.bodySuffix].join('\n');
    }

    toString() {
        return this.code;
    }
}
