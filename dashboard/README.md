# Nebula Dashboard（AstrBot WebUI-based）

当前状态：

- 已完成 Dashboard 全量 TypeScript 化（不再依赖/引用本地 JS 源码）
- 构建目标已对齐到 ES2022，启用 TypeScript 严格模式（`"strict": true`）
- 在本目录下 `pnpm build` / `pnpm typecheck` / `pnpm lint:check` 均可通过

## 开发

在 `dashboard/` 目录下：

```bash
pnpm install
pnpm dev
```

## 类型检查 & 构建

```bash
pnpm typecheck
pnpm lint:check
pnpm check
pnpm build
```

说明：`pnpm build` 会先执行 `pnpm typecheck && pnpm lint:check`。

## 规划：后续计划

- ~~迁移至 Nuxt.js，实现前后端分离（待排期）。~~ (可能没必要迁移)
- （暂无）
