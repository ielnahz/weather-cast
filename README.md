# Weather Cast — 天气应用程序

> 前端技术作业：搜索地点、查看当前天气与预报，支持 Loading/Error 状态处理。

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

> 无需配置任何 API Key —— 本项目使用 [Open-Meteo](https://open-meteo.com/)，完全免费且无需注册。

## 技术栈

| 维度 | 选型 | 选型理由 |
|------|------|---------|
| 框架 | Next.js 16 (App Router) + React 19 | SSR/SEO 开箱即用，站在成熟方案上聚焦业务 |
| 语言 | TypeScript | 类型安全，全链路类型定义 |
| 状态管理 | MobX + React Context | MobX 管理天气/搜索数据（响应式），Context 管理 UI 状态（面板开关），分层使用避免过度设计 |
| HTTP | 原生 fetch 封装 | 不引入 axios——fetch + 自封装 httpClient 足够覆盖需求，减少依赖 |
| 天气 API | Open-Meteo | 零 Key、开源、免费，clone 即可运行 |
| 样式 | Tailwind CSS v4 | 原子化 CSS，开发效率高，配合响应式断点 |

## 架构设计

### API 三层架构

这是本项目的核心架构设计。每一层职责明确，可独立替换：

```
顶层 (Service Layer)
  weatherService.getCurrentWeather(city)
  weatherService.getWeatherAndForecast(city)    ← 并行请求优化
  → 业务语义化方法，组件直接调用

中层 (Adapter Layer)
  OpenMeteoAdapter     ← 字段映射、WMO code 转换、数据标准化
  [OpenWeatherAdapter] ← 预留，展示可扩展性
  → 统一输出格式，屏蔽 API 差异

底层 (HTTP Layer)
  httpClient.get(url, params)
  → fetch 封装：超时(AbortController)、重试、拦截器、错误标准化
```

**为什么分三层？**
- **底层**：HTTP 通用逻辑（超时、重试、拦截器）与业务无关，一处实现处处复用
- **中层**：每个 API 一个 Adapter，字段映射隔离在此层。切换 API 只需新增 Adapter，不影响上层
- **顶层**：Service 提供业务语义方法，组件不感知 API 细节

### 目录结构

```
src/
├── app/                    # Next.js App Router 页面 (SSR)
│   ├── layout.tsx          # 根布局（SEO metadata、全局 Provider）
│   ├── page.tsx            # 首页（SSR：默认城市天气）
│   ├── api/search/route.ts # 城市搜索代理（服务端调第三方 + 缓存）
│   ├── city/[name]/page.tsx# 城市详情页（SSR：动态路由）
│   ├── not-found-page/route.ts # 404 Route Handler（提交真实 404 状态码）
│   ├── error.tsx           # 全局错误边界
│   ├── loading.tsx         # 全局加载边界
│   └── not-found.tsx       # 404
├── proxy.ts                # Proxy（原 middleware）：/city/* 城市存在性校验
├── components/
│   ├── search/             # 搜索组件（SearchBar, SearchResults, SearchHistory, SearchPanel）
│   ├── weather/            # 天气展示（CurrentWeather, WeatherDetail, ForecastList, ForecastCard, TemperatureChart, WeatherDisplay）
│   ├── common/             # 通用组件（Loading, ErrorState, EmptyState, NotFoundContent, WeatherIcon）
│   └── layout/             # 布局（Header, Footer, PageShell, SidePanel）
├── stores/                 # MobX（WeatherStore, SearchStore, StoreProvider）
├── services/               # 顶层 Service
├── adapters/               # 中层 Adapter + 接口定义
├── http/                   # 底层 HTTP Client
├── contexts/               # React Context（UIContext）
├── utils/                  # 工具（weatherCodeMap, format, cookies, constants, defaultCity）
└── types/                  # 全局类型定义
```

### 组件设计原则

1. **单一职责**：容器组件负责数据协调，展示组件只负责渲染
2. **禁止传意义不明确的对象**：

```typescript
// ❌ 不做：传一个模糊的 data 对象
<CurrentWeather data={weather} />

// ✅ 正确：明确传递每个字段
<CurrentWeather
  city={current.city}
  temperature={current.temperature}
  weatherType={current.weatherType}
  feelsLike={current.feelsLike}
/>
```

3. **组件分类**：Container（数据协调） / Presentational（纯展示） / Common（通用 UI）

### 状态管理设计

| Store | 管理内容 | 使用场景 |
|-------|---------|---------|
| WeatherStore | 天气数据、预报、loading、error | 天气信息展示 |
| SearchStore | 搜索关键词、结果、loading、防抖 | 城市搜索 |
| UIContext (Context) | 搜索面板开关 | 简单 UI 状态 |

**设计取舍**：面板开关这种简单布尔状态用 Context 而非 MobX——避免过度设计。MobX 专注于需要响应式的数据流。

## 功能实现

### SSR (Server-Side Rendering)

所有页面均 SSR：

| 页面 | 路由 | SSR 内容 |
|------|------|---------|
| 首页 | `/` | 默认城市天气 + 7 天预报 |
| 城市详情页 | `/city/[name]` | 指定城市天气 + 7 天预报 |

**默认城市获取策略**（3 级降级）：
1. Cookie (`last_city`) — 用户上次查看的城市
2. IP 定位 — 服务端通过 IP 反查城市（用户 IP 不暴露到客户端）
3. 兜底 — 深圳

**数据流转**：
```
Server Component
  → getDefaultCity()                        // 确定城市
  → weatherService.getWeatherAndForecast()  // 并行请求天气+预报
  → 生成 HTML + SEO metadata
  → 客户端 hydrate（MobX store 注入 SSR 数据，不重复请求）
```

### Loading & Error 状态

- **Loading**：骨架屏（Skeleton），匹配实际内容布局，减少 CLS
- **Error**：分层错误处理，5 种错误类型（网络/城市不存在/频率限制/服务端/超时），友好的用户提示 + 重试按钮
- **Empty**：引导用户搜索

### 搜索功能

- 城市搜索（支持中文/英文）
- 300ms 防抖自动搜索
- 搜索历史（Cookie 存储，最多 8 个，首页快捷入口）
- 选择城市后写入 Cookie 并跳转

### 响应式设计

参考墨迹天气的 PC 版式，桌面端采用**双栏布局**（主内容 + 320px 吸顶侧栏），而非简单的居中放大。

| 断点 | 布局 |
|------|------|
| Mobile (<768px) | 单列，指标卡 2 列（第 5 张通栏），预报横向滚动，侧栏与温度图隐藏 |
| Tablet (768-1023px) | 单列，指标卡一行 5 个，温度图可见 |
| Desktop (≥1024px) | 双栏 `grid-cols-[minmax(0,1fr)_320px]`，侧栏 sticky，容器 `max-w-6xl` |

三端对齐由 `PageShell` 统一收敛（Header / Footer / 正文 / 侧栏共用同一套 `max-w-*` + `px-*`），避免各模块自行设置内边距导致的「左右不齐」。

### SEO

- 动态 `<title>`（如 "北京天气 - 晴 6°C | Weather Cast"）
- 动态 `<meta description>`（含城市名、天气、温度、湿度）
- Open Graph 标签（og:title, og:description, og:type, og:locale）
- 语义化 HTML（`<article>`, `<section>`, `<header>`, `<main>`, `<footer>`）
- `<html lang="zh-CN">`
- 语义化 URL（`/city/beijing`）
- **未知城市返回真实 404 状态码**（由 `proxy.ts` 判定 + `not-found-page` Route Handler 提交），并带 `X-Robots-Tag: noindex, follow`

> `notFound()` 在流式渲染下拿不到 404 状态码（Next.js 已 flush 响应外壳），详见下方「值得记录的工程细节」第 4 条。

### 安全性

| 风险点 | 措施 |
|--------|------|
| API Key 暴露 | Open-Meteo 无需 Key；架构上 Key 只在服务端使用 |
| XSS | React 默认转义；不将用户输入直接插入 HTML |
| 参数注入 | API 参数通过 URLSearchParams 编码；上游域名由代码固定，不接受用户输入 |
| SSRF | 服务端请求使用白名单域名 |
| Cookie 安全 | `samesite=lax`，30 天过期 |
| 搜索接口滥用 | `/api/search` 限制关键词长度（60 字符）；服务端缓存 |

### 性能优化

| 优化点 | 手段 |
|--------|------|
| 首屏性能 | SSR 直出 HTML，LCP 优化 |
| 请求并行 | 当前天气 + 预报 `Promise.all` 并行请求 |
| SSR 数据复用 | 客户端 hydrate 时注入 SSR 数据，不重复请求 |
| API 缓存 | Service 层 10 分钟内存缓存 |
| 渲染优化 | MobX 精确响应式更新，避免无效渲染 |
| 资源优化 | 天气图标用内联 SVG，无大图资源；温度图表纯 SVG 无图表库依赖 |
| CSS 优化 | Tailwind purge，按需生成 |

## 设计取舍 (Trade-offs)

| 决策 | 选择 | 替代方案 | 理由 |
|------|------|---------|------|
| HTTP 库 | fetch 封装 | axios | 减少依赖，fetch + 封装足够 |
| 图表库 | 纯 SVG | Chart.js / Recharts | 温度折线图简单，不值得引入库 |
| 状态管理 | MobX + Context 分层 | 全用 MobX / 全用 Context | 简单状态用 Context 避免过度设计 |
| 天气 API | Open-Meteo | OpenWeatherMap | 零 Key，面试官 clone 即可运行 |
| SSR 方案 | Next.js App Router | 自建 SSR | 理解 SSR 原理后选择成熟方案 |
| 多语言 | 架构预留，默认中文 | 全量 i18n | 4-6h 范围控制，架构支持即可 |
| IP 定位 | ipapi.co | 自建 IP 库 | 免费且够用 |
| 城市搜索 | 走自家 `/api/search` | 浏览器直连第三方 | 浏览器冷连接实测可达 22s，第三方延迟波动直接暴露给用户 |
| 404 处理 | `proxy.ts` + Route Handler | 组件内 `notFound()` | 流式渲染下 `notFound()` 只能拿到 200，SEO 会被污染 |

## API 可扩展性

架构设计支持切换天气 API，只需：

1. 新增一个实现 `WeatherAdapter` 接口的 Adapter（如 `OpenWeatherAdapter`）
2. 在 `WeatherService` 构造函数中注入新 Adapter

```typescript
// 切换到 OpenWeatherMap 只需：
const service = new WeatherService(new OpenWeatherAdapter());
```

上层组件和页面代码无需任何修改。

## 开发说明

```bash
# 开发
npm run dev

# 构建
npm run build

# 生产运行
npm run start

# Lint
npm run lint
```

## 自检脚本

`scripts/` 下提供回归验证脚本，可用于交付前确认功能与视觉无回归：

```bash
npm run build && npm start     # 另开终端保持运行

node scripts/e2e-check.js           # 端到端：默认城市 → 搜索 → 选城市 → Cookie → 刷新 → 城市路由 SSR
node scripts/screenshot.js          # 390 / 834 / 1440 三档截图 + console error 收集
node scripts/screenshot-gallery.js  # 图标检查表（/icon-gallery）
node scripts/screenshot-404.js      # 404 页截图 + 断言状态码为 404
node scripts/zoom-icon-gallery.js   # 逐个放大 12 个图标，像素级校验居中
```

`/icon-gallery` 是开发自查用路由，把 12 种天气图标以 96px 渲染并叠加十字准线，用于校验 SVG 几何是否精确居中。不对外链接。

当前自检结果：

```
$ node scripts/e2e-check.js
1. home city      : 深圳
2. search panel   : opened
3. search results : 7 match(es)
   first result   : 上海 / 上海市, 中国
4. after select   : 上海 / 上海市
   url            : http://127.0.0.1:3210/city/%E4%B8%8A%E6%B5%B7
5. last_city cookie: SET
6. history cookie  : SET
7. after reload   : 上海 (cookie-driven)
8. /city/Beijing  : 北京
   title          : 北京天气 - 晴 5°C | Weather Cast

errors: none
```

状态码矩阵：

| 路由 | 状态码 |
|------|--------|
| `/` | 200 |
| `/city/Beijing` | 200 |
| `/city/FakeXYZ` | **404** |
| `/no-such-page` | 404 |
| `/api/search?q=Beijing` | 200 |

## 三个值得记录的工程细节

### 1. GET 请求不要带 `Content-Type`

`httpClient` 只在**有 body 时**才设置 `Content-Type: application/json`。

原因：带 `Content-Type` 会让 GET 请求从 CORS「简单请求」升级为「非简单请求」，浏览器先发 `OPTIONS` 预检。Open-Meteo 的地理编码接口 `geocoding-api.open-meteo.com/v1/search` 未实现 OPTIONS，预检返回 404，整个请求被浏览器拦截（`net::ERR_FAILED`）——但 `curl` 不受同源策略约束，用 curl 测试完全正常，所以很容易误判为网络问题。

详见 `docs/architecture-design.md` 第三节「踩坑记录」。

### 2. Store 实例不能在 Provider 的 render body 里创建

```tsx
// ❌ 每次 render 都 new 一批新 store → effect 依赖变化 → 写 observable
//    → observer 重渲染 → 又是新 store → 无限循环，页面永远停在骨架屏
const stores = createStoreMap();

// ✅ 惰性初始化，整个挂载周期只创建一次
const [stores] = useState<StoreMap>(() => ({ ... }));
```

同理适用于任何「整个应用生命周期内唯一」的实例：连接池、计时器、事件监听。

### 3. 交互链路上的第三方调用要收回到服务端

城市搜索最初由浏览器直连 Open-Meteo 地理编码接口。用 CDP 抓网络事件发现：请求头是干净的（没有触发预检），但**响应经常不来**。

```
REQ  GET name=%E4%B8%8A%E6%B5%B7&count=10&language=zh&format=json
# 只有 REQ，没有 RES 也没有 FAIL
```

对比冷连接耗时：

| 发起方 | 冷连接耗时 |
|---|---|
| `curl`（服务端） | 1.1s ~ 1.4s |
| 浏览器（多次冷启动） | 2.6s / 4.6s / **22.3s** |

浏览器冷连接偶尔要 22 秒，超过 HTTP Client 的 10 秒超时，请求被静默 abort——表现就是「搜不到结果」，而且**时好时坏**。

修复方式是新增 `/api/search` 路由，把第三方调用收回服务端：服务端持有热连接 + 内存缓存，浏览器只访问同源地址。

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 首次搜索 | 0.1s ~ 22s（不稳定） | 1.2s |
| 重复搜索 | 每次重新请求 | **20ms**（缓存命中） |
| E2E 稳定性 | 5 次里 2 次失败 | **5 次全过，0 错误** |

详见 `docs/architecture-design.md` 第三节「踩坑记录：第三方 API 不应该由浏览器直连」。

### 4. 流式渲染会吃掉 404 状态码

`notFound()` 在 async Server Component 里抛出时，Next.js 已经 flush 了响应外壳，状态码提交为 **200**（[vercel/next.js#76474](https://github.com/vercel/next.js/issues/76474)）。爬虫会把 200 当作有效页面，污染索引。

修复方式是 Next.js 16 的 `proxy.ts`（middleware 的新名字）：在渲染之前判定城市是否存在，不存在就 rewrite 到 `/not-found-page`（Route Handler，能真正提交 404 状态）。判定结果通过 `x-resolved-city` 请求头传给页面，还顺带省掉一次地理编码往返——`/city/Beijing` 响应时间从 ~2.5s 降到 **17–32ms**。

详见 `docs/architecture-design.md` 第七节「踩坑记录」。

## 数据来源

- 天气数据：[Open-Meteo](https://open-meteo.com/)（免费、开源、无需 API Key）
- IP 定位：[ipapi.co](https://ipapi.co/)（免费）
