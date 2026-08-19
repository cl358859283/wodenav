/**
 * 分类链接默认数据 & 搜索引擎配置
 * 可独立修改本文件来调整默认导航与搜索引擎
 *
 * 由导航页「同步 → 导出 data.js」生成
 * 生成时间: 2026-08-15T09:55:42.843Z
 *
 * 部署到 GitHub Pages / Cloudflare Pages 后：
 * 其他设备清除本地导航数据即可加载本文件中的默认配置，实现多端同步。
 */
/** 默认分类与链接数据 */
export const DEFAULT_DATA = [
    {
        "id": "g1",
        "title": "常用",
        "desc": "日常高频常用网站合集",
        "collapsed": false,
        "activeSubId": "s1",
        "subGroups": [
            {
                "id": "s1",
                "title": "AI",
                "fold": false,
                "links": [
                    {
                        "id": 1786787601994,
                        "name": "豆包",
                        "desc": "",
                        "url": "https://www.doubao.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786787619726,
                        "name": "Google",
                        "desc": "",
                        "url": "https://gemini.google.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": true
                    },
                    {
                        "id": 1786787632307,
                        "name": "Grok",
                        "desc": "",
                        "url": "https://grok.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": true
                    }
                ],
                "manageCollapsed": true
            }
        ],
        "links": [],
        "manageCollapsed": true,
        "structureCollapsed": false
    },
    {
        "id": "g2",
        "title": "工具",
        "desc": "各类工具集合",
        "collapsed": false,
        "activeSubId": "s3",
        "subGroups": [
            {
                "id": "s3",
                "title": "代码仓库",
                "fold": false,
                "links": [
                    {
                        "id": 1786785697706,
                        "name": "Cloudflare",
                        "desc": "",
                        "url": "https://www.cloudflare.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786787678500,
                        "name": "Github",
                        "desc": "",
                        "url": "https://github.com",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": true
                    }
                ],
                "manageCollapsed": true
            }
        ],
        "links": [],
        "manageCollapsed": true,
        "structureCollapsed": true
    },
    {
        "id": "g_1786785749739",
        "title": "游戏",
        "desc": "",
        "collapsed": false,
        "activeSubId": "s_1786785749739",
        "subGroups": [
            {
                "id": "s_1786785749739",
                "title": "下载",
                "fold": false,
                "links": [
                    {
                        "id": 1786785846644,
                        "name": "Gamer520",
                        "desc": "",
                        "url": "https://www.gamer520.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786785879544,
                        "name": "Gamefreer",
                        "desc": "",
                        "url": "https://www.gamefreer.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786785928111,
                        "name": "Gamefreer",
                        "desc": "",
                        "url": "https://byrutgame.org/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": true
                    },
                    {
                        "id": 1786785960487,
                        "name": "Fitgirl-repacks",
                        "desc": "",
                        "url": "https://fitgirl-repacks.site/popular-repacks/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": true
                    }
                ],
                "manageCollapsed": true
            },
            {
                "id": "s_1786785777818",
                "title": "论坛",
                "fold": false,
                "links": [],
                "manageCollapsed": true
            },
            {
                "id": "s_1786786007847",
                "title": "Galgame",
                "fold": false,
                "links": [
                    {
                        "id": 1786786034560,
                        "name": "青桔网",
                        "desc": "",
                        "url": "https://x.qingju.org/zh-CN",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786786056554,
                        "name": "月幕",
                        "desc": "",
                        "url": "https://www.ymgal.games/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    },
                    {
                        "id": 1786786210230,
                        "name": "鲲",
                        "desc": "",
                        "url": "https://www.kungal.com/",
                        "localIcon": "",
                        "isExternal": true,
                        "isRocket": false
                    }
                ],
                "manageCollapsed": true
            }
        ],
        "links": [],
        "structureCollapsed": true,
        "manageCollapsed": true
    }
];

/** 默认搜索引擎配置 */
export const DEFAULT_ENGINES = {
    "local": {
        "name": "本站",
        "url": "#localSearch:",
        "isRocket": false
    },
    "baidu": {
        "name": "百度",
        "url": "https://www.baidu.com/s?wd=",
        "isRocket": false
    },
    "sogou": {
        "name": "搜狗",
        "url": "https://www.sogou.com/web?query=",
        "isRocket": false
    },
    "so360": {
        "name": "360",
        "url": "https://www.so.com/s?q=",
        "isRocket": false
    },
    "bingCN": {
        "name": "必应国内版",
        "url": "https://cn.bing.com/search?q=",
        "isRocket": false
    },
    "google": {
        "name": "谷歌",
        "url": "https://www.google.com/search?q=",
        "isRocket": true
    },
    "bingGlobal": {
        "name": "必应国际版",
        "url": "https://www.bing.com/search?q=",
        "isRocket": true
    },
    "duckduckgo": {
        "name": "DuckDuckGo",
        "url": "https://duckduckgo.com/?q=",
        "isRocket": true
    },
    "yandex": {
        "name": "Yandex",
        "url": "https://yandex.com/search/?text=",
        "isRocket": true
    }
};
