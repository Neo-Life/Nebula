import axios from 'axios'
import { defineAsyncComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Router, RouteRecordRaw } from 'vue-router'

type PluginFrontendRouteConfig = {
  name: string
  plugin: string
  componentUrl: string
  meta?: Record<string, unknown>
}

export async function initPluginFrontendRoutes(router: Router, parentRouteName: string | null = 'main') {
  try {
    const resp = await axios.get('/api/plugin/frontend-routes')
    const routeConfigs = (resp?.data?.data || []) as PluginFrontendRouteConfig[]

    if (!Array.isArray(routeConfigs) || routeConfigs.length === 0) return

    for (const cfg of routeConfigs) {
      if (!cfg?.plugin || !cfg?.componentUrl) continue

      const routeName = `plugin-${cfg.plugin}`
      if (router.hasRoute(routeName)) continue

      const component = defineAsyncComponent(async () => {
        const mod = await import(/* @vite-ignore */ cfg.componentUrl)

        const maybeMount = (mod as any).mount
        if (typeof maybeMount === 'function') {
          return {
            name: routeName,
            setup() {
              const container = ref<HTMLElement | null>(null)
              const currentRouter = useRouter()
              const currentRoute = useRoute()

              onMounted(() => {
                try {
                  ;(mod as any).mount(container.value, {
                    plugin: cfg.plugin,
                    routeName,
                    url: window.location.href,
                    router: currentRouter,
                    route: currentRoute
                  })
                } catch (e) {
                  console.error('❌ 插件页面 mount() 失败:', e)
                }
              })

              onBeforeUnmount(() => {
                try {
                  const unmount = (mod as any).unmount
                  if (typeof unmount === 'function') {
                    unmount(container.value)
                  }
                } catch (e) {
                  console.error('❌ 插件页面 unmount() 失败:', e)
                }
              })

              return () => h('div', { ref: container })
            }
          }
        }

        return (mod as any).default ?? mod
      })

      const route: RouteRecordRaw = {
        name: routeName,
        path: `/plugins/${cfg.plugin}`,
        component,
        meta: {
          requiresAuth: true,
          ...(cfg.meta || {})
        }
      }

      if (parentRouteName && router.hasRoute(parentRouteName)) {
        router.addRoute(parentRouteName, route)
      } else {
        router.addRoute(route)
      }
    }
  } catch (error) {
    console.error('❌ 插件前端路由加载失败:', error)
  }
}
