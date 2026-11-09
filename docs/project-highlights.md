# Weather Cast — 项目特色总结

> 本文档提炼项目的核心工程亮点，便于面试交流时快速回顾。

---

## 1. 三层 API 架构（可替换、可扩展）

```
httpClient（底层）    →  OpenMeteoAdapter（中层）  →  weatherService（顶层）
fetch 封装                字段映射 / WMO 转换          业务语义方法
超时 / 重试 / 错误标准化    统一输出格式                 组件直接调用
```

- **底层** `src/http/httpClient.ts`：基于原生 `fetch` 封装，提供 `AbortController` 超时（10s）、失败重试（1次）、错误标准化。不引入 axios，减少依赖。
- **中层** `src/adapters/OpenMeteoAdapter.ts`：将 Open-Meteo 原始字段映射为统一数据结构（`CurrentWeather`、`ForecastDay`、`CitySearchResult`），WMO weather_code 转人类可读描述。预留 `WeatherAdapter` 接口，切换 API 只需新增 Adapter。
- **顶层** `src/services/weatherService.ts`：提供 `getCurrentWeather()`、`getWeatherAndForecast()`（`Promise.all` 并行请求）、`searchCitiesFromBrowser()`（走同源代理）等业务方法，组件不感知 API 细节。

**价值**：切换天气数据源（如 OpenWeatherMap）只需新增一个 Adapter，上层组件和页面零改动。

---

## 2. SSR-First 渲染 + MobX 水合（三状态模式）

核心挑战：服务端渲染完整 HTML（SEO + LCP），客户端无缝切换为 MobX 响应式交互。

**三状态 `useRef` 模式**（`WeatherDisplay.tsx`）：

| 状态 | 条件 | 行为 |
|------|------|------|
| `isFirstRender` | `hydratedForCity.current === null` | SSR / 首次渲染，直接用 props 渲染，产出完整 HTML |
| `isSynced` | `hydratedForCity.current === ssrCity.name` | Store 已水合，用 MobX 数据渲染，支持响应式更新 |
| `isNavigating` | 两者皆否 | 软导航中（城市切换），显示 spinner 直到 effect 同步 |

**关键设计**：
- 刻意删除 `app/loading.tsx`（Suspense fallback 会先 flush spinner shell），让 Next.js 等待异步页面完成后返回完整 HTML
- 页面刷新：无 loading，直接看到天气内容（服务端返回 ~43KB 完整 HTML）
- 城市切换（软导航）：显示短暂 spinner，直到 Store 水合完成
- SEO 爬虫拿到的是包含天气数据的完整 HTML，不是空壳

---

## 3. 拼音搜索 + 相关性排序（小城市搜索覆盖）

GeoNames 数据库中小城市（如运城、河津）的主名存的是拼音（"Yuncheng"、"Hejin"），中文名在 `admin2` 字段（"运城市"）。

**搜索管线**：
1. `pinyinSearchVariants()`（`src/utils/pinyin.ts`）：用 `pinyin-pro` 将中文转拉丁，作为 fallback 查询
2. `rankByRelevance()`（`src/utils/relevance.ts`）：多信号排序——中文名匹配度、pinyin 精确度、feature_code 等级、人口规模
3. `pickDisplayName()`（`src/utils/displayName.ts`）：四规则选最佳显示名

| 规则 | 条件 | 示例 |
|------|------|------|
| Rule 1 | `name` 含中文 | 北京 → "北京" |
| Rule 2（Case C） | 用户查询 ≠ admin2（去后缀） | 河津 ≠ 运城市 → "河津" |
| Rule 3（Case B） | `admin2` 含中文 | Yuncheng → "运城市" |
| Rule 4 | 无中文 | fallback 到查询或原名 |

**效果**：运城→运城市（第 1 条结果），河津→河津（admin2 显示运城市/邯郸市/赣州市用于消歧）。

---

## 4. Proxy 拦截 + 真 404 状态码

Next.js 流式渲染下，`notFound()` 在 async Server Component 内抛出时，HTTP 状态码已提交为 200（[vercel/next.js#76474](https://github.com/vercel/next.js/issues/76474)）。爬虫把 200 当有效页面，污染索引。

**解决方案**（`src/proxy.ts`，Next.js 16 middleware 新名称）：

```
请求 /city/上海
  │
  ├─ Proxy: 查缓存（30min TTL）
  │           ├─ 命中且存在 → Base64 编码城市 JSON → x-resolved-city 头 → 放行
  │           ├─ 未命中 → 调地理编码 API（中文 → pinyin fallback）
  │           │   ├─ 存在 → 记缓存 + 带头放行
  │           │   └─ 不存在 → rewrite 到 /not-found-page（真 404）
  │           └─ 上游错误 → fail open（放行，不因第三方不稳定让真城市消失）
  │
  ├─ Page: 从 header 解码城市 → 不再重复调地理编码 → 渲染天气
  └─ /not-found-page (Route Handler) → status: 404 + X-Robots-Tag: noindex
```

**附带优化**：城市解析结果通过 `x-resolved-city` 请求头传给页面，省掉一次地理编码往返——`/city/Beijing` 从 ~2.5s 降到 17–32ms。

**关键细节**：HTTP 头是 ByteString（Latin-1），中文名需 Base64 编码：`Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64')`。

---

## 5. 服务端搜索代理（解决浏览器直连第三方延迟）

**问题**：浏览器直连 Open-Meteo 地理编码 API，冷连接耗时 2.6s / 4.6s / 22.3s（CDP 抓包），超过 httpClient 10s 超时被静默 abort，表现为"搜不到结果"且时好时坏。

**对比**：

| 发起方 | 冷连接耗时 |
|---|---|
| curl（服务端） | 1.1s / 1.4s / 1.4s |
| 浏览器 | 2.6s / 4.6s / 22.3s |

**方案**：新增 `/api/search` Route Handler，浏览器只访问同源地址：

```
浏览器 → fetch('/api/search?q=上海') → Next.js Route Handler
                                         ├─ 服务端持有热连接
                                         ├─ 内存缓存（关键词级）
                                         └─ fetch('geocoding-api.open-meteo.com/...')
```

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 首次搜索 | 0.1s ~ 22s（不稳定） | 1.2s |
| 重复搜索 | 每次重新请求 | 20ms（缓存命中） |
| E2E 稳定性 | 5 次里 2 次失败 | 5 次全过，0 错误 |

---

## 6. 纯 SVG 天气图标 + 几何规范

12 个手写内联 SVG 图标（`src/components/common/WeatherIcon.tsx`），无图片资源、无图标库依赖。

**几何规范**（64×64 viewBox）：

| 规则 | 说明 |
|------|------|
| 共享云朵路径 | 所有云图标共用同一个 `CLOUD_D` path，形状一致 |
| 云朵水平中心 | x = 32 |
| 云朵底边 | y = 38 |
| 降水元素范围 | y = 42 ~ 63 |
| 质心对齐（非锚点） | 雨丝倾斜时整体右移 1.5px，使中丝质心落在 x=32 |
| 闪电路径 | 折线极值 25/39，形心在 x=32 |
| 垂直居中 | 纯云图标 `translate(0 6)`；带降水 `translate(0 3)` |

**验证**：`/icon-gallery` 路由以 96px 渲染全部图标 + 红色十字准线，用于肉眼校验居中。配套脚本 `scripts/zoom-icon-gallery.js` 逐个放大检查。

---

## 7. 响应式布局（PageShell 收敛对齐）

参考墨迹天气 PC 版式，桌面端采用双栏布局（主内容 + 320px 侧栏）。

| 断点 | 宽度 | 布局 |
|------|------|------|
| Mobile | < 768px | 单列，指标卡 2 列，预报横向滚动，侧栏堆叠在下方 |
| Tablet | 768–1023px | 单列，指标卡 1 行 5 列，温度图可见 |
| Desktop | ≥ 1024px | 双栏 `grid-cols-[minmax(0,1fr)_320px]`，侧栏自然滚动 |

**对齐收敛**：`PageShell` 组件统一管理 `max-w-*` + `px-*`，Header / Footer / 正文 / 侧栏共用同一套间距，避免各模块自行设置内边距导致左右不齐。

**关键细节**：
- `lg:px-0`：桌面容器已居中且宽度受限，加内边距会整体内缩
- `minmax(0, 1fr)`：防止长内容（无空格英文城市名）撑破列宽
- `truncate` + `min-w-0`：长文本省略而非溢出
- 卡片固定高度（`h-[176px]`）：避免内容长度不同导致参差不齐
- 预报卡片：`flex-1 min-w-[78px]` 等分容器，最小宽度保证不挤压

---

## 8. Header 吸顶 + 侧栏自然滚动

- **Header**：`sticky top-0` + `bg-slate-800/80 backdrop-blur-md`（半透明 + 毛玻璃），滚动时固定在顶部，内容透过背景可见
- **SidePanel**：不使用 sticky 定位，随页面自然滚动，移动端堆叠在主内容下方（不再隐藏）

---

## 9. 四条踩坑记录（工程经验沉淀）

每条都有完整的「现象 → 根因分析 → 修复方案 → 通用教训」链条：

| # | 踩坑 | 根因 | 修复 |
|---|------|------|------|
| 1 | GET 请求带 Content-Type 导致 CORS 预检 404 | geocoding API 未实现 OPTIONS | 只在有 body 时才设 Content-Type |
| 2 | Store 在 render body 创建导致无限循环 | 每次 render 产出新实例 → effect 依赖变化 → 写 observable → 重渲染 → 循环 | `useState` 惰性初始化 |
| 3 | 浏览器直连第三方 API 搜索时好时坏 | 冷连接 22s 超过 10s 超时被静默 abort | 收回服务端 `/api/search` 代理 |
| 4 | `notFound()` 流式渲染拿不到 404 状态码 | Next.js 先 flush shell（200）再流式填充内容 | `proxy.ts` 预判 + Route Handler 返回真 404 |

---

## 技术栈一览

| 维度 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 16 (App Router) + React 19 | SSR/SEO 开箱即用 |
| 语言 | TypeScript | 全链路类型安全 |
| 状态管理 | MobX + React Context | MobX 管数据，Context 管 UI 开关，分层避免过度设计 |
| HTTP | 原生 fetch 封装 | 不引入 axios，减少依赖 |
| 天气 API | Open-Meteo | 零 Key，clone 即可运行 |
| 样式 | Tailwind CSS v4 | 原子化 CSS，响应式断点 |
| 图标 | 手写内联 SVG | 无图片资源，无库依赖 |
| 图表 | 纯 SVG 折线图 | 温度趋势简单，不值得引入图表库 |
| 搜索增强 | pinyin-pro | 中文→拉丁转换，覆盖小城市 |

---

## 自检脚本

```bash
npm run build && npm start          # 另开终端
node scripts/e2e-check.js           # 端到端：默认城市 → 搜索 → 选城市 → Cookie → 刷新 → SSR
node scripts/screenshot.js          # 390 / 834 / 1440 三档截图 + console error 收集
node scripts/screenshot-404.js      # 404 页截图 + 断言状态码
node scripts/zoom-icon-gallery.js   # 逐个放大 12 个图标，像素级校验居中
```

状态码矩阵：

| 路由 | 状态码 |
|------|--------|
| `/` | 200 |
| `/city/Beijing` | 200 |
| `/city/FakeXYZ` | **404** |
| `/no-such-page` | 404 |
| `/api/search?q=Beijing` | 200 |
