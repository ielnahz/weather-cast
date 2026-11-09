# Weather Cast — 项目架构设计文档

> 版本：v1.2（补充踩坑记录 + 响应式/图标规范落地）
> 日期：2026-11-09
>
> v1.1 → v1.2 变更：补充「GET 请求不能带 Content-Type」「Store 实例不能在 Provider 里直接创建」两处真实踩坑记录；细化响应式断点与布局对齐规范；补充天气图标 SVG 几何规范。

## 一、项目概述

天气应用程序，支持搜索地点、查看当前天气、天气预报，妥善处理 Loading/Error 状态。
重点展示：应用程序架构、组件设计、状态管理、API 集成、代码组织、错误处理、SSR、安全、性能优化、SEO。

## 二、技术栈选型

| 维度 | 选型 | 选型理由（Trade-off） |
|------|------|----------------------|
| 框架 | Next.js (App Router) + React | 自己封装过两套 SSR（58 中间件方案、欧科多框架渲染），理解 SSR 底层原理。选择 Next.js 不是"不会自建"，而是站在成熟方案上聚焦业务——工程决策 |
| 状态管理 | MobX + React Context | MobX 用于天气数据的响应式管理（有实战经验：拖拽布局项目）；Context 用于简单的 UI 状态（如主题、搜索面板开关），避免过度引入 |
| 样式 | CSS Modules + Tailwind CSS | CSS Modules 保证组件隔离；Tailwind 提升开发效率。两者组合兼顾隔离性和速度 |
| HTTP | 原生 fetch 封装 | 不引入 axios——fetch + 自封装的 httpClient 足够覆盖需求，减少依赖。README 中说明"为什么不选 axios" |
| 天气 API | Open-Meteo（主） | 零 Key，面试官 clone 即可运行。架构预留切换其他 API 的能力 |
| 语言 | TypeScript | 类型安全，体现代码质量意识 |
| 图表 | 自行实现轻量 SVG 折线图 | 不引入图表库——温度趋势图用 SVG 实现即可，减少体积 |

## 三、API 三层架构

```
┌─────────────────────────────────────────────────────┐
│  顶层 (Service Layer)                                │
│  weatherService.getCurrentWeather(city)              │
│  weatherService.getForecast(city)                    │
│  weatherService.searchCity(keyword)                  │
│  → 业务语义化方法，供组件/页面直接调用                   │
├─────────────────────────────────────────────────────┤
│  中层 (Adapter Layer)                                │
│  OpenMeteoAdapter     ← 主用：字段映射、数据标准化      │
│  [OpenWeatherAdapter] ← 预留：展示可扩展性             │
│  → 统一输出格式，屏蔽不同 API 的字段差异                 │
├─────────────────────────────────────────────────────┤
│  底层 (HTTP Layer)                                   │
│  httpClient.get(url, options)                        │
│  → fetch 封装：超时、重试、错误标准化、请求/响应拦截      │
└─────────────────────────────────────────────────────┘
```

### 设计要点

- **底层**：封装 fetch，统一处理超时（默认 10s）、重试（失败重试 1 次）、错误标准化、请求/响应拦截器
- **中层**：每个 API 一个 Adapter，负责字段映射（如 WMO weather_code → 人类可读描述）、数据格式标准化。**输出统一的数据结构**，上层不关心数据来源
- **顶层**：业务语义化方法，组件只调用 `weatherService.xxx()`，不感知底层 API 细节

### 踩坑记录：GET 请求不能带 `Content-Type`

这是本项目实际踩到并修复的一个真实问题，值得单独记录。

**现象**：城市搜索在浏览器中始终失败，`net::ERR_FAILED`，但同样的请求用 `curl` 或在页面里直接 `fetch` 却完全正常。

**根因**：HTTP Client 在**所有**请求上都无条件加了 `Content-Type: application/json`，包括没有 body 的 GET 请求。

浏览器对 CORS 的判定规则是：只有「简单请求」（方法为 GET/HEAD/POST，且只带 `Accept`、`Accept-Language`、`Content-Language`、`Content-Type` 之外的基础头）才不触发预检。一旦请求带了 `Content-Type: application/json`，即使方法仍是 GET，也会被判定为**非简单请求**，浏览器先发一个 `OPTIONS` 预检。

而 Open-Meteo 的地理编码接口 `geocoding-api.open-meteo.com/v1/search` **没有实现 OPTIONS**，预检直接返回 404，于是整个请求被浏览器拦掉——`curl` 不受同源策略约束，所以看不出来。

```bash
# 预检返回 404，接口并未实现 OPTIONS
$ curl -X OPTIONS -H "Origin: http://127.0.0.1:3210" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: content-type" \
    "https://geocoding-api.open-meteo.com/v1/search?name=x&format=json"
HTTP/1.1 404 Not Found
```

**修复**：只在真正有 body 时才设置 `Content-Type`。

```typescript
const fetchOptions: RequestInit = {
  method,
  // Only set Content-Type when there is a body. Sending it on a GET
  // makes the request "non-simple", which forces the browser into a
  // CORS preflight — and some third-party APIs do not implement OPTIONS.
  ...(body && method !== "GET"
    ? { headers: { "Content-Type": "application/json", ...headers } }
    : { headers }),
  signal,
};
```

**通用教训**：

1. 跨域调用第三方 API 时，**默认不要给 GET 请求加 `Content-Type`**。这会把简单请求变成非简单请求，白白引入一次预检往返。
2. 不同 API 对 `OPTIONS` 的支持程度不一致——`api.open-meteo.com`（天气接口）实现了 OPTIONS，`geocoding-api.open-meteo.com`（地理编码）没有。同一家厂商的两个接口行为都不统一，不能想当然。
3. 遇到「curl 正常、浏览器失败」时，优先怀疑 CORS 预检，而不是 API 本身或网络问题。

### 踩坑记录：第三方 API 不应该由浏览器直连

修掉 CORS 预检之后，搜索功能仍然**时好时坏**——同一个关键词，有时 7 条结果，有时 0 条。用 CDP 抓网络事件定位后发现：

```
REQ  GET name=%E4%B8%8A%E6%B5%B7&count=10&language=zh&format=json
     headers={"sec-ch-ua-platform":"\"Windows\"","Referer":"...","User-Agent":"..."}
# 只有 REQ，没有 RES，也没有 FAIL —— 请求发出去了，响应一直不来
```

请求头是干净的（没有 `Content-Type`，所以**没有**触发预检），接口本身也正常（`curl` 稳定 1.1–1.5s）。真正的差异在于**谁来发起这个连接**：

| 发起方 | 冷连接耗时 |
|---|---|
| `curl`（服务端） | 1.1s / 1.4s / 1.4s / 1.1s / 1.4s |
| 浏览器（多次冷启动） | 2.6s / 4.6s / **22.3s** |

浏览器的冷连接偶尔要 22 秒，而 HTTP Client 的默认超时是 10 秒——超时的请求被静默 abort，表现就是「搜不到任何结果」。

**根本问题**：把一个「延迟不可控的第三方接口」直接暴露在用户交互的关键路径上。搜索是用户输入后立即要看到结果的场景，链路上任何一跳慢都会直接变成体验问题。

**修复**：把搜索收回到我们自己的服务端，浏览器只访问同源地址。

```
浏览器 ──fetch('/api/search?q=上海')──> Next.js Route Handler
                                              │
                                              ├─ 服务端持有热连接
                                              ├─ 内存缓存（同一关键词直接命中）
                                              └─ fetch('geocoding-api.open-meteo.com/...')
```

对应三层架构里的位置：

- **底层**：`httpClient` 不变
- **中层**：`OpenMeteoAdapter.searchCities()` 不变
- **顶层**：`weatherService.searchCities()` 供服务端使用（SSR 页面、Route Handler）；新增 `weatherService.searchCitiesFromBrowser()` 供浏览器使用，内部改调 `/api/search`

```typescript
// src/services/weatherService.ts
async searchCitiesFromBrowser(keyword: string, signal?: AbortSignal) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  // ...
}
```

实测效果：

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 首次搜索 | 0.1s ~ 22s（不稳定） | 1.2s（服务端冷连接） |
| 重复搜索 | 每次都重新请求 | **20ms**（服务端内存缓存） |
| E2E 稳定性 | 5 次里 2 次失败 | **5 次全部通过，0 错误** |

**通用教训**：

1. 第三方 API 直连浏览器，等于把它的延迟波动直接暴露给用户。**凡是交互链路上的关键调用，都应该收回到自己服务端。**
2. 服务端到第三方通常有热连接，浏览器到第三方则是每次冷连接——同样的接口，两条路径的延迟特性完全不同。
3. 「接口偶发失败」的根因未必在代码。抓一次真实网络事件（CDP `Network.*` 事件），比反复读代码快得多。

### 统一数据结构

```typescript
// 统一输出格式——无论底层用哪个 API，上层看到的都是这个结构
interface CurrentWeather {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: string;       // 标准化后的天气类型：sunny / cloudy / rain / snow ...
  weatherDescription: string;
  updatedAt: string;         // ISO 时间
}

interface ForecastDay {
  date: string;
  weatherCode: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

interface CitySearchResult {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;           // 省/州
}
```

## 四、目录结构

```
weather-cast/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 根布局（SEO metadata + 全局 Provider）
│   │   ├── page.tsx                  # 首页（SSR：默认城市天气）
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts          # 城市搜索代理（服务端调第三方 + 缓存）
│   │   ├── city/
│   │   │   └── [name]/
│   │   │       └── page.tsx          # 城市详情页（SSR：动态路由）
│   │   ├── icon-gallery/
│   │   │   └── page.tsx              # 开发自查用：图标检查表（非对外链接）
│   │   ├── not-found-page/
│   │   │   └── route.ts              # 404 Route Handler（可提交真实 404 状态码）
│   │   ├── error.tsx                 # 全局错误边界
│   │   ├── loading.tsx               # 全局加载边界
│   │   └── not-found.tsx             # 404（robots: noindex）
│   │
│   ├── proxy.ts                      # Proxy（原 middleware）：/city/* 城市存在性校验
│   │                                 # → 不存在则 rewrite 到 /not-found-page（真 404）
│   │                                 # → 存在则通过 x-resolved-city 头把结果交给页面
│   │
│   ├── components/                   # 组件层
│   │   ├── search/                   # 搜索相关
│   │   │   ├── SearchBar.tsx         # 搜索输入框
│   │   │   ├── SearchResults.tsx     # 搜索结果列表
│   │   │   ├── SearchHistory.tsx     # 搜索历史（读 Cookie）
│   │   │   └── SearchPanel.tsx       # 搜索面板容器（组合）
│   │   │
│   │   ├── weather/                  # 天气展示
│   │   │   ├── CurrentWeather.tsx    # 当前天气卡片
│   │   │   ├── WeatherDetail.tsx     # 天气详情（湿度/风速/气压等）
│   │   │   ├── ForecastList.tsx      # 预报列表（横向滚动容器）
│   │   │   ├── ForecastCard.tsx      # 单日预报卡片
│   │   │   ├── TemperatureChart.tsx  # 温度趋势 SVG 图表
│   │   │   └── WeatherDisplay.tsx    # 客户端编排器（SSR 数据 → Store）
│   │   │
│   │   ├── common/                   # 通用组件
│   │   │   ├── Loading.tsx           # 加载状态组件
│   │   │   ├── ErrorState.tsx        # 错误状态组件
│   │   │   ├── EmptyState.tsx        # 空状态组件
│   │   │   ├── NotFoundContent.tsx   # 404 展示内容（not-found.tsx 与 route 共用）
│   │   │   └── WeatherIcon.tsx       # 天气图标映射（12 种手写 SVG）
│   │   │
│   │   └── layout/                   # 布局组件
│   │       ├── PageShell.tsx         # 响应式容器 + Section（对齐收敛点）
│   │       ├── SidePanel.tsx         # PC 侧栏（当前位置/生活指数/未来几天）
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── stores/                       # MobX 状态管理
│   │   ├── WeatherStore.ts           # 天气数据 store
│   │   ├── SearchStore.ts            # 搜索状态 store
│   │   └── index.tsx                 # StoreProvider + useStores（use client）
│   │
│   ├── services/                     # 顶层 Service
│   │   └── weatherService.ts         # 业务语义化 API 方法 + 内存缓存
│   │
│   ├── adapters/                     # 中层 Adapter
│   │   ├── OpenMeteoAdapter.ts       # Open-Meteo 适配器
│   │   └── types.ts                  # WeatherAdapter 接口定义
│   │
│   ├── http/                         # 底层 HTTP
│   │   ├── httpClient.ts             # fetch 封装（超时/重试/拦截器）
│   │   └── types.ts                  # HTTP 相关类型
│   │
│   ├── contexts/                     # React Context（简单状态）
│   │   └── UIContext.tsx             # UI 状态：搜索面板开关
│   │
│   ├── utils/                        # 工具函数
│   │   ├── weatherCodeMap.ts         # WMO 天气代码映射（zh/en）
│   │   ├── format.ts                 # 格式化工具
│   │   ├── cookies.ts                # Cookie 读写（服务端/客户端双模）
│   │   ├── defaultCity.ts            # 默认城市解析（Cookie → IP → 深圳）
│   │   └── constants.ts              # 常量定义
│   │
│   └── types/                        # 全局类型定义
│       └── index.ts
│
├── scripts/                          # 自检脚本（截图 / 端到端）
├── docs/                             # 文档
├── screenshots/                      # 截图产物
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

## 五、组件设计原则

### 1. 单一职责
每个组件只做一件事。容器组件负责数据获取和状态协调，展示组件只负责渲染。

### 2. 禁止传意义不明确的对象
```typescript
// ❌ 错误：传一个模糊的 data 对象，下层不知道里面有什么
<CurrentWeather data={weatherData} />

// ✅ 正确：明确传递具体字段
<CurrentWeather
  city={weather.city}
  temperature={weather.temperature}
  weatherCode={weather.weatherCode}
  feelsLike={weather.feelsLike}
/>
```

### 3. 组件分类

| 类型 | 职责 | 数据来源 | 示例 |
|------|------|---------|------|
| **Container** | 数据获取、状态协调 | MobX Store / Service | SearchPanel, WeatherPage |
| **Presentational** | 纯展示 | Props | CurrentWeather, ForecastCard, TemperatureChart |
| **Common** | 通用 UI | Props | Loading, ErrorState, EmptyState |

## 六、状态管理设计

### MobX Store（复杂数据）

```
WeatherStore
├── currentWeather: CurrentWeather | null
├── forecast: ForecastDay[]
├── loading: boolean
├── error: string | null
├── actions:
│   ├── fetchWeather(cityName)    → 调用 weatherService
│   └── clear()
│
SearchStore
├── keyword: string
├── results: CitySearchResult[]
├── loading: boolean
├── error: string | null
├── actions:
│   ├── search(keyword)
│   ├── clear()
│   └── selectCity(city)
```

### 踩坑记录：Store 实例不能在 Provider 里直接创建

**现象**：SSR 首屏 HTML 完全正常（服务端渲染出了完整天气数据），但浏览器端永远停在 loading 骨架屏，`main` 区域一片空白，控制台无报错。

**根因**：`StoreProvider` 里这样创建 store：

```tsx
// ❌ 错误写法
export function StoreProvider({ children }: { children: ReactNode }) {
  const stores = createStoreMap();      // 每次 render 都 new 一遍
  return <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>;
}
```

React 的函数组件**每次 render 都会重新执行**。这行代码意味着每次渲染都会产出一批全新的 Store 实例：

1. `WeatherDisplay` 的 `useEffect` 依赖数组里有 `weatherStore`；
2. Provider 重渲染 → 新 store 实例 → effect 依赖变化 → effect 重跑 → 调用 `hydrateFromSSR()` → 写入 store → **写 observable 就等于触发 observer 重渲染**；
3. 重渲染又产生新的 store 实例 → 回到第 2 步。

形成**无限重渲染循环**。因为每一帧都是「刚创建、刚写入、还没来得及把数据渲染出来」的状态，页面上就只剩骨架屏。

**修复**：用 `useState` 的惰性初始化，保证 store 在整个挂载周期内**只创建一次**。

```tsx
// ✅ 正确写法
export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores] = useState<StoreMap>(() => ({
    weatherStore: new WeatherStore(),
    searchStore: new SearchStore(),
  }));
  return <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>;
}
```

**通用教训**：

1. **任何"整个应用生命周期内唯一"的实例**（store、连接池、计时器、事件监听）都必须用 `useState(() => …)` / `useRef` / 模块级单例来持有，绝不能在 render body 里裸 `new`。
2. React DevTools 的 "Rendered more than X times" 警告和「白屏 + 无报错」组合出现时，优先怀疑这一类问题。
3. 排查手段：先确认服务端 HTML 正常（说明数据链路没问题），再确认客户端是否报错，最后对比两份数据——很多时候问题出在「数据到了但没渲染出来」。

### React Context（简单 UI 状态）

```
UIContext
├── isSearchPanelOpen: boolean
├── toggleSearchPanel()
```

**设计取舍**：不把 UI 状态也塞进 MobX——面板开关这种简单状态用 Context 更轻量，避免过度设计。

## 七、SSR 方案

### 页面清单（全部 SSR）

| 页面 | 路由 | SSR 数据 | 说明 |
|------|------|---------|------|
| 首页 | `/` | 默认城市天气 + 预报 | 根据默认城市策略获取城市 |
| 城市详情页 | `/city/[name]` | 指定城市天气 + 预报 | 动态路由，SEO 友好 |

### 默认城市获取策略

```
1. Cookie → 读取 last_city cookie（用户上次查看的城市）
2. IP 定位 → 通过服务端 IP 反查城市（使用免费 IP 定位 API）
3. 兜底 → 深圳（22.5431, 114.0579）
```

**实现方式**：首页 Server Component 中按序获取：
```typescript
async function getDefaultCity(request): Promise<CitySearchResult> {
  // 1. Cookie
  const cookieCity = request.cookies.get('last_city');
  if (cookieCity) return parseCityFromCookie(cookieCity);

  // 2. IP 定位（服务端执行，不暴露用户 IP 到客户端）
  const ip = request.headers.get('x-forwarded-for');
  const ipCity = await ipToCity(ip);
  if (ipCity) return ipCity;

  // 3. 兜底
  return DEFAULT_CITY_SHENZHEN;
}
```

### 数据流转

```
Server Component (RSC)
  → getDefaultCity(request)              // 服务端确定城市
  → weatherService.getCurrentWeather()   // 服务端并行请求天气+预报
  → weatherService.getForecast()
  → 生成 HTML + metadata
  → 客户端 hydrate
  → 后续交互走 MobX + 客户端调用
  → 用户切换城市时写入 cookie
```

### 性能意义

- 首屏 HTML 直出 → LCP 优化
- 语义化 HTML + metadata → SEO
- 客户端 hydrate 后交互正常 → INP 不受影响
- 当前天气 + 预报并行请求 → 减少服务端等待时间

### 踩坑记录：`notFound()` 在流式渲染下拿不到 404 状态码

这是本项目在 SEO 上踩到的真问题。

**现象**：`/city/FakeXYZ` 明明是一个不存在的城市，页面也正确渲染了「页面未找到」，但 HTTP 状态码却是 **200**：

```
$ curl -s -D- -o /dev/null http://localhost:3210/city/FakeXYZ
HTTP/1.1 200 OK          ← 应该是 404
```

**根因**：Next.js 会**先 flush 响应外壳（shell），再流式填充内容**。而 `notFound()` 是在 async Server Component 内部抛出的——等它抛出时，状态码已经提交为 200 了。这不是配置问题，而是框架的既定行为，也是 Next.js 的一个长期未解的 issue（[vercel/next.js#76474](https://github.com/vercel/next.js/issues/76474)）。

**为什么必须修**：SEO 上，爬虫把 200 的响应视为「有效页面」。一个随机的城市名 URL 如果都返回 200 + 一句「页面不存在」，等于在告诉搜索引擎「这里有内容」——这会污染索引，也会被判定为低质量页面。

**修复思路**：状态码只能在**响应体发出之前**决定。Proxy（Next.js 16 里 middleware 的新名字，`src/proxy.ts`）正好运行在这个时间点。

```
请求 /city/上海
   │
   ├─ Proxy: 查缓存 → 命中且城市存在 → 带上 x-resolved-city 头放行
   │            未命中 → 调地理编码接口判定
   │              ├─ 存在 → 记缓存 + 带上 x-resolved-city 头放行
   │              └─ 不存在 → rewrite 到 /not-found-page
   │
   ├─ Page: 从 header 取到城市 → 不再重复调地理编码接口 → 渲染天气
   │
   └─ /not-found-page (Route Handler) → 返回真正的 404 状态 + 样式化 404 页面
```

几个关键设计：

1. **Proxy 只做「存在性判定」，不重复取数据**。判定成功后，把解析出的城市通过请求头 `x-resolved-city` 传给页面，页面直接复用，省掉一次地理编码往返（实测 `/city/Beijing` 从 ~2.5s 降到 **17–32ms**）。

2. **请求头必须是 Base64**。HTTP 头是 ByteString（Latin-1），城市名「北京市」直接放进去会抛 `TypeError: Cannot convert argument to a ByteString`。所以用 `Buffer.from(json, 'utf-8').toString('base64')` 编码，读取端再解回来。

3. **判定失败时「失败开放」（fail open）**。地理编码接口超时或报错时，Proxy 放行请求交给页面处理，而不是直接返回 404——**一个不稳定的第三方接口不应该让真实城市「消失」**。

4. **404 页面用 Route Handler 而不是 `not-found.tsx`**。`not-found.tsx` 走的是同一条流式渲染管线，同样拿不到 404 状态；Route Handler 直接构造 `Response`，可以在发送前设定状态码：

   ```typescript
   return new Response(HTML, {
     status: 404,
     headers: {
       "Content-Type": "text/html; charset=utf-8",
       "X-Robots-Tag": "noindex, follow",
     },
   });
   ```

   正文是服务端渲染好的静态 HTML，无 JS 的爬虫和客户端也能拿到正确内容。

5. **双保险**。页面内部仍然保留 `notFound()` 调用——Proxy 判定失败时（fail open）由它兜底。

**效果对比**：

| 路由 | 修复前 | 修复后 |
|---|---|---|
| `/city/Beijing` | 200 | 200 |
| `/city/FakeXYZ` | **200**（内容是 404 页） | **404**（真状态码 + `X-Robots-Tag: noindex`） |
| `/city/北京` | 200 | 200 |
| `/no-such-page` | 404 | 404 |

**通用教训**：

1. **流式渲染会吃掉状态码**。凡是「必须返回特定状态码」的页面，不能依赖组件里抛 `notFound()`，得在渲染管线之外处理。
2. 框架的 issue 列表是很好的学习材料——遇到反直觉行为先去搜上游 issue，能省掉大量试错。
3. 「失败开放」是一个通用的可靠性原则：辅助判定失败 ≠ 目标不存在。

## 八、错误处理策略

### 分层错误处理

| 层级 | 处理策略 |
|------|---------|
| **HTTP Layer** | 超时重试 1 次；网络错误标准化为 `HttpClientError`；非 2xx 状态码抛出带状态信息的错误 |
| **Adapter Layer** | 字段缺失时使用默认值/标记为 null；数据格式异常时抛出 `DataAdapterError` |
| **Service Layer** | 捕获底层错误，转换为业务语义错误（如 "城市不存在" vs "服务暂时不可用"） |
| **Store Layer** | 捕获 Service 错误，设置 `error` 状态，触发 UI 错误展示 |
| **Component Layer** | Error Boundary 兜底；展示友好的 ErrorState 组件；提供重试按钮 |

### 错误分类

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',         // 网络错误
  CITY_NOT_FOUND = 'CITY_NOT_FOUND',       // 城市不存在
  API_RATE_LIMIT = 'API_RATE_LIMIT',       // 频率限制
  SERVER_ERROR = 'SERVER_ERROR',           // 服务端错误
  UNKNOWN = 'UNKNOWN',                     // 未知错误
}
```

### 用户体验

- Loading 状态：骨架屏（Skeleton），不是简单的 spinner
- Error 状态：友好提示 + 重试按钮，不暴露技术细节
- 空状态：引导用户搜索城市

## 九、安全性考量

| 风险点 | 措施 |
|--------|------|
| API Key 暴露 | Open-Meteo 不需要 Key；若切换到需要 Key 的 API，Key 只在服务端使用，不暴露到客户端 |
| XSS | React 默认转义；SSR 时注意不将用户输入直接插入 HTML |
| 参数注入 | API 请求参数做校验和编码 |
| SSRF | 服务端请求天气 API 时，URL 构建使用白名单域名，不拼接用户输入 |
| CSRF | Next.js App Router 默认处理；POST 请求做 CSRF token 校验 |

## 十、性能优化清单

| 优化点 | 手段 | 指标 |
|--------|------|------|
| 首屏性能 | SSR 直出 HTML | LCP < 2.5s |
| 请求优化 | 当前天气 + 预报并行请求 | 减少等待时间 |
| 资源懒加载 | 非首屏组件（预报图表）动态 import | 减少首屏 JS 体积 |
| 图片优化 | 天气图标用 SVG，按需加载 | 无大图资源 |
| 缓存 | API 响应做短时缓存（天气数据 10 分钟内有效） | 减少重复请求 |
| 渲染优化 | MobX 精确响应式更新，避免无效渲染 | 降低 INP |
| CSS 优化 | Tailwind purge + CSS Modules 隔离 | 减少无效 CSS |

## 十一、SEO 清单

| 项目 | 实现 |
|------|------|
| 页面标题 | 每个页面动态 `<title>`（如 "北京天气 - 当前温度、湿度、预报 | Weather Cast"） |
| Meta Description | 动态生成，包含城市名和天气描述 |
| Open Graph | og:title, og:description, og:type |
| 语义化 HTML | header, main, article, section 等标签 |
| 结构化数据 | JSON-LD（可选，展示对 SEO 的深入理解） |
| Sitemap | Next.js 自动生成或手动配置 |
| URL 设计 | `/city/beijing` 语义化 URL |

## 十二、需求确认（已确认）

| # | 需求 | 确认结果 |
|---|------|---------|
| 1 | SSR 页面 | 所有页面（首页 + 城市详情页）均 SSR |
| 2 | 多语言 | 架构预留，默认中文，不全量实现。说明处理范围 |
| 3 | 默认城市 | Cookie（last_city）→ IP 定位 → 兜底深圳 |
| 4 | 设计风格 | 参考墨迹天气：卡片式布局、天气动态背景、生活指数 |
| 5 | 搜索历史 | Cookie 存储，记录用户搜索过的城市，首页展示快捷入口 |
| 6 | 响应式 | 移动端 + 平板 + 桌面三端适配 |

## 十三、多语言处理方案（架构预留）

### 需要处理的内容

| 维度 | 说明 | 处理方式 |
|------|------|---------|
| UI 文案 | 搜索框占位、按钮、标签等 | 统一文案 key，通过 i18n 字典管理 |
| 天气描述 | WMO weather_code 的人类可读描述 | weatherCodeMap 支持多语言映射 |
| API 参数 | Open-Meteo 地理编码 `language=zh` | Adapter 层传入语言参数 |
| 路由 | URL 语言前缀（可选） | 预留 `/[locale]/...` 结构 |
| SEO | `<html lang>`、`hreflang` | layout.tsx 中动态设置 |
| 日期格式 | 不同语言的日期展示 | utils/format.ts 按 locale 格式化 |

### 实现策略

- **默认中文**，代码结构支持扩展
- 文案统一通过 `t('key')` 函数获取（简单实现，不引入 i18next 等库）
- `weatherCodeMap.ts` 导出 `zh` 和 `en` 两套描述
- README 中说明："架构支持多语言，当前默认中文，扩展只需增加翻译文件"

## 十四、搜索历史方案

### Cookie 存储

```
// Cookie: search_history
// 值：JSON 数组，最多 8 个城市
[{"name":"北京","lat":39.9,"lon":116.4}, {"name":"上海",...}]
```

### 交互

- 用户搜索并选择城市时，写入 cookie（去重，最新排前面）
- 首页展示搜索历史快捷入口（点击直接跳转城市页）
- Cookie 设置 `max-age=30天`，`same-site=lax`，`http-only=false`（客户端需读取展示）

## 十五、响应式设计方案

### 断点（实际实现）

| 断点 | Tailwind | 宽度 | 布局 |
|------|----------|------|------|
| Mobile | `< md` | < 768px | 单列，卡片全宽，预报横向滚动，隐藏侧栏与温度图 |
| Tablet | `md` | 768px – 1023px | 单列，指标卡一行 5 个，温度图可见 |
| Desktop | `lg` | ≥ 1024px | **双栏**：主内容列 + 320px 吸顶侧栏（墨迹天气 PC 版式） |

### 关键适配点

| 模块 | Mobile | Tablet | Desktop |
|------|--------|--------|----------|
| 容器宽度 | `max-w-2xl` | `max-w-2xl` | `max-w-6xl`（双栏） |
| 搜索面板 | 全屏浮层 + 遮罩 | 浮层 | Header 下拉面板（`md:absolute`） |
| 指标卡 | 2 列，第 5 张通栏 | 1 行 5 列 | 1 行 5 列 |
| 预报列表 | 横向滚动（`snap-x`） | 1 行 7 个 | 1 行 7 个 |
| 温度趋势图 | 隐藏（侧栏已覆盖该信息） | 可见 | 可见 |
| 侧栏（当前位置/生活指数/未来几天） | 隐藏 | 隐藏 | 可见，`sticky top-20` |

### 布局对齐的统一做法

三端「左右不齐」的根因是各模块各自为政地设置内边距。这里用统一的 `PageShell` 收敛：

```
PageShell
├── 容器：w-full max-w-2xl/max-w-6xl mx-auto px-4 md:px-6 lg:px-0
├── 桌面双栏：grid lg:grid-cols-[minmax(0,1fr)_320px]
└── Section 组件：标题与内容共享同一左右边界
```

要点：

1. **Header / Footer / PageShell 使用同一套 `max-w-*` + `px-*`**，保证 Logo、搜索按钮、正文、侧栏在同一条垂直线上。
2. `lg:px-0` —— 桌面端容器已居中且宽度受限，再加内边距会导致内容整体内缩，与 Header 对不齐。
3. `minmax(0, 1fr)` —— grid 子项默认 `min-width: auto`，长内容（如连续无空格的英文城市名）会撑破列宽；`minmax(0,1fr)` 强制允许收缩。
4. `truncate` + `min-w-0` —— 配合上条，长文本省略而不是溢出。
5. 卡片高度统一用**固定高度**（`h-[88px]`、`h-[176px]`）而非 `min-height`：后者会因内容长度不同而参差不齐。降水概率为 0 时也保留占位（显示 `—`），保证 7 张卡片高度完全一致。

### 天气图标的 SVG 几何规范

天气图标是手写内联 SVG，几何精度直接影响观感。规范如下（64×64 viewBox）：

| 规则 | 说明 |
|------|------|
| 云朵统一路径 | 所有云图标共用同一个 `CLOUD_D` path，杜绝形状不一致 |
| 云朵水平中心 | x = 32 |
| 云朵底边 | y = 38 |
| 降水元素范围 | y = 42 ~ 63 |
| **质心而非锚点对齐** | 雨丝倾斜（斜率 -3/+12）时整体右移 1.5，使中丝**质心**落在 x=32；雪flake、冰雹用镜像配对 |
| 闪电路径 | 折线左右极值取 25 / 39，保证形心在 x=32 |
| 垂直居中 | 纯云图标 `translate(0 6)`；带降水图标 `translate(0 3)`（降水占位更高，需上提） |

> 验证方式：`/icon-gallery` 路由把所有图标以 96px 渲染，并叠加红色十字准线用于肉眼校验居中。该页面仅用于开发自查，不对外链接。

## 十六、验证与脚本

`scripts/` 下提供自检脚本，可作为交付时的回归验证：

| 脚本 | 用途 |
|------|------|
| `screenshot.js` | 在 390 / 834 / 1440 三档宽度截图，并收集 console error |
| `screenshot-gallery.js` | 截取 `/icon-gallery` 图标检查表 |
| `screenshot-404.js` | 截取未知城市的 404 页，并断言 HTTP 状态码为 404 |
| `zoom-icon-gallery.js` | 逐个放大 12 个图标（带红色十字准线），像素级校验居中 |
| `zoom-icons.js` | 放大截取预报区图标，用于像素级校验 |
| `e2e-check.js` | 端到端验证：默认城市 → 搜索 → 选城市 → Cookie 写入 → 刷新后 Cookie 驱动 → 城市路由 SSR |
| `diag-search.js` | 诊断搜索：轮询结果数量 + 记录请求生命周期 |
| `diag-network.js` | 用 CDP 抓原始网络事件（区分预检失败 vs 响应迟滞） |
| `diag-signal.js` | 对比验证 AbortSignal 是否影响 fetch 行为 |

运行方式：

```bash
npm run build && npm start          # 另开终端
node scripts/e2e-check.js           # 端到端自检
node scripts/screenshot.js          # 三档截图
```

### 状态码自检

```bash
$ for p in "/" "/city/Beijing" "/city/FakeXYZ" "/no-such-page" "/api/search?q=Beijing"; do
    echo "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3210$p")  $p"
  done
200  /
200  /city/Beijing
404  /city/FakeXYZ
404  /no-such-page
200  /api/search?q=Beijing
```

