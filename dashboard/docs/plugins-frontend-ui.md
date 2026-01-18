# AstrBot Dashboard 插件页面（Frontend UI）开发指南

本指南面向：
- **插件用户**：想知道“为什么有的插件有页面、在哪里打开”。
- **插件开发者**：想为插件提供一个 Dashboard 页面，并通过 AstrBot 自动注册到路由 `/plugins/<插件名>`。

> 约定：插件页面入口**不会出现在侧边栏菜单**；用户在“插件管理”页面的**插件卡片/列表**上通过“打开界面”进入。

---

## 1. 用户视角：如何打开插件页面

当插件提供了前端页面，并且插件处于“启用/Activated”状态时：
- 在 Dashboard 的“插件管理 → 已安装插件”中，会出现 **“打开界面”**（或英文环境下 **“Open UI”**）按钮。
- 点击后会跳转到：

```
/plugins/<插件名>
```

如果你看不到按钮，通常是以下原因之一：
- 插件未启用（Activated=false）。
- 插件没有声明前端入口（`metadata.yaml` 中缺少 `frontend.entry`）。
- 你访问的不是同一个后端实例（例如 Vite dev 的 3000 没有正确代理到 6185）。

---

## 2. 开发者视角：整体机制概览

实现分为三段链路：

1) **插件声明前端入口**：在插件目录的 `metadata.yaml` 中配置 `frontend.entry`（以及可选的 `frontend.meta`）。

2) **后端暴露路由配置**：Dashboard 后端接口 `/api/plugin/frontend-routes` 会收集“已启用且存在 `frontend.entry`”的插件，并返回每个插件的：
- `plugin`：插件名
- `componentUrl`：前端入口模块 URL（远程 URL 或通过 `/api/file/<token>` 暴露的本地文件）
- `meta`：可选路由元信息（如标题）

3) **前端动态注册路由**：Dashboard 前端启动时会请求 `/api/plugin/frontend-routes`，并为每个插件注册：

```
{ path: `/plugins/${plugin}`, component: () => import(componentUrl) }
```

最终效果：
- 访问 `/plugins/<插件名>` 时，前端会动态加载该插件的入口模块。
- 插件列表 UI 会根据 `/api/plugin/get` 返回的 `has_page && activated` 决定是否显示“打开界面”。

---

## 3. 插件目录结构要求

一个最小可工作的插件（带页面）通常长这样：

```
data/
  plugins/
    astrbot_plugin_xxx/
      main.py
      metadata.yaml
      frontend/
        index.js
```

推荐把前端入口文件放在插件目录下的 `frontend/` 中，便于管理。

---

## 4. `metadata.yaml`：如何声明页面

在插件根目录新建或编辑 `metadata.yaml`：

```yaml
name: astrbot_plugin_frontend_demo
author: your_name
desc: 插件描述
version: 0.0.1
repo: ""

frontend:
  # 必填：前端入口
  # - 以 http(s) 开头：远程 ESM URL
  # - 否则：相对插件目录的文件路径（会通过 /api/file/<token> 暴露给浏览器）
  entry: frontend/index.js

  # 可选：路由/页面元信息（Dashboard 会原样传给前端）
  meta:
    title: My Plugin UI
```

### 4.1 `frontend.entry` 支持两种形式

A) **远程 ESM 模块**（推荐用于发布 CDN / GitHub Pages / 自建静态站点）：

```yaml
frontend:
  entry: https://example.com/my-plugin-ui/index.js
```

B) **本地相对路径**（最简单，随插件一起分发）：

```yaml
frontend:
  entry: frontend/index.js
```

> 注意：本地入口文件会在后端做路径安全校验（禁止目录穿越），必须位于插件目录内。

---

## 5. 前端入口模块怎么写（两种模式）

插件前端入口 `frontend.entry` 指向的文件必须是浏览器可执行的模块。

### 5.0 重要约束：不一定只能“纯 JS”，但必须是 ESM 模块

这里的“entry”并不是“只能写 JS 代码”的意思，真正的约束是：
- `frontend.entry` 最终必须能在浏览器里被 **`import()` 当作 ESM 模块加载**（也就是一个 `.js/.mjs` 模块 URL）。
- 这个模块需要满足以下两种导出协议之一：
  - **Vue 组件模式**：`export default` 一个 Vue 组件对象（Dashboard 会把它当页面组件渲染）。
  - **挂载模式**：`export function mount(el, ctx)`（可选 `unmount(el)`），由 Dashboard 在路由进入/离开时调用。

因此：
- **Vue 可以**：写 Vue 源码后打包成 ESM 产物即可；或直接使用你已有的 ESM 构建产物。
- **React/其他框架可以**：通常用“挂载模式”在 `mount` 里把 UI 渲染到 `el`；你需要确保依赖在浏览器端可用（建议把依赖打包进产物）。
- **纯 HTML 不能直接作为 entry**：因为当前实现是 `import(componentUrl)`，不是 `iframe src=`。
  - 但你可以写一个 `index.js` 作为 entry，在 `mount` 里用 `el.innerHTML = ...`、`fetch` 拉取 html，或用 `iframe` 嵌入你自己的页面。

### 模式 A：导出 Vue 组件（默认导出）

当入口模块 **`export default`** 一个 Vue 组件时，Dashboard 会把它当作页面组件直接渲染。

示例（伪代码）：

```js
// frontend/index.js
import MyPage from './MyPage.vue'
export default MyPage
```

适用场景：
- 你有自己的前端构建产物（打包成 ESM），或者发布到远程 URL。

### 模式 B：导出 `mount/unmount`（无需 Vue 构建）

当入口模块导出如下函数时，Dashboard 会用一个包装组件在进入路由时调用：

- `mount(el, ctx)`：把 UI 渲染到容器 DOM
- `unmount(el)`（可选）：离开路由时清理

示例：

```js
// frontend/index.js
export function mount(el, ctx) {
  el.innerHTML = ''

  const root = document.createElement('div')
  root.innerHTML = `
    <h2>Plugin UI</h2>
    <p>route: ${ctx?.route?.fullPath ?? ''}</p>
  `

  el.appendChild(root)
}

export function unmount(el) {
  el.innerHTML = ''
}
```

#### React 示例（使用 mount/unmount）

下面示例演示如何把 React 页面接到 Dashboard。你可以把这段作为入口模块的导出（最终仍需打包为浏览器可用的 ESM）：

```js
// frontend/index.js
import React from 'react'
import { createRoot } from 'react-dom/client'

let root = null

export function mount(el, ctx) {
  root = createRoot(el)
  root.render(
    React.createElement('div', null, [
      React.createElement('h2', { key: 'h' }, 'My Plugin UI'),
      React.createElement('div', { key: 'p' }, `route: ${ctx?.route?.fullPath ?? ''}`),
    ]),
  )
}

export function unmount() {
  root?.unmount()
  root = null
}
```

> 提示：如果你不想在运行时依赖外部 CDN，建议把 `react` / `react-dom` 打包进你的 ESM 产物，避免跨域/版本问题。

`ctx` 一般会包含（以实际实现为准）：
- `router`：Vue Router 实例
- `route`：当前路由对象

适用场景：
- 你只想写一个纯 JS 页面（不引入 Vue/打包工具），快速给插件提供简单配置页/信息页。

---

## 6. 路由规则与页面访问

- 路由固定为：`/plugins/<插件名>`
- 页面按钮跳转使用后端返回的 `page_path`，默认也是 `/plugins/<插件名>`
- 不会添加侧边栏入口（避免污染全局导航）

---

## 7. 调试与常见问题

### 7.1 “打开界面”按钮不出现

按钮显示条件：
- `activated === true`
- `has_page === true`（后端根据 `frontend_entry` 是否存在计算）

你可以直接用 API 验证：
- 登录拿 token：`POST /api/auth/login`
- 查看插件字段：`GET /api/plugin/get`

如果 `has_page=false`：
- 检查插件目录是否存在 `metadata.yaml`
- 检查 `metadata.yaml` 的 `frontend.entry` 是否写对
- 确保插件已重载/重启后端，使元数据重新加载

### 7.2 Vite dev（3000）看不到最新行为

当你使用 `pnpm dev` 启动前端时：
- 确保 Vite 的代理把 `/api` 转发到正确的后端（默认 6185）
- 确保你在前端已登录（token 写入 localStorage，axios 才会自动带上 `Authorization: Bearer <token>`）

### 7.3 本地入口文件加载失败

本地入口是通过 `/api/file/<token>` 暴露的。
- token 有有效期；刷新页面时会重新获取路由配置并拿到新 token。
- 入口文件必须是浏览器可执行模块；避免使用 Node.js 专用 API。

---

## 8. 参考实现

提供了一个最小示例插件：
- `https://github.com/Neo-Life/astrbot_plugins_demo`

你也可以对照这些关键实现：
- 前端动态路由注册：`dashboard/src/utils/pluginFrontendRoutes.ts`
- 后端提供路由配置：`astrbot/dashboard/routes/plugin.py`（`/api/plugin/frontend-routes`）
- 插件元数据加载：`astrbot/core/star/star_manager.py`（读取 `metadata.yaml` 的 `frontend` 字段）

---

## 9. 版本与兼容性说明

- 本机制依赖插件 `metadata.yaml` 的 `frontend.entry` 字段。
- 若你需要兼容旧插件元数据格式，请优先补齐 `metadata.yaml`，或与维护者确认兼容字段（例如 `frontend_entry`）。
