import type { ToastColor, ToastOptions } from '@/stores/toast';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $toast: {
      toast: (
        message: string,
        color?: ToastColor,
        opts?: ToastOptions | number,
      ) => void;
      success: (msg: string, opts?: ToastOptions | number) => void;
      error: (msg: string, opts?: ToastOptions | number) => void;
      info: (msg: string, opts?: ToastOptions | number) => void;
      warning: (msg: string, opts?: ToastOptions | number) => void;
    };
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $toast: {
      toast: (
        message: string,
        color?: ToastColor,
        opts?: ToastOptions | number,
      ) => void;
      success: (msg: string, opts?: ToastOptions | number) => void;
      error: (msg: string, opts?: ToastOptions | number) => void;
      info: (msg: string, opts?: ToastOptions | number) => void;
      warning: (msg: string, opts?: ToastOptions | number) => void;
    };
  }
}

declare global {
  type BivariantCallback<Args extends unknown[] = unknown[], R = void> = {
    bivarianceHack: (...args: Args) => R;
  }['bivarianceHack'];

  type D3SelectionLike = {
    remove: () => void;
    append: (name: string) => D3SelectionLike;
    attr: (name: string, value: unknown) => D3SelectionLike;
    classed: (name: string, value: boolean) => D3SelectionLike;
    call: (arg: unknown) => D3SelectionLike;
    on: (
      name: string,
      listener: BivariantCallback<unknown[], void>,
    ) => D3SelectionLike;
    selectAll: (selector: string) => D3SelectionLike;
    data: (data: unknown) => D3SelectionLike;
    join: (name: string) => D3SelectionLike;
    text: (value: unknown) => D3SelectionLike;
    style: (name: string, value: unknown) => D3SelectionLike;
  } & Record<string, unknown>;

  type D3ZoomBehaviorLike = {
    scaleExtent: (range: [number, number]) => D3ZoomBehaviorLike;
    on: (
      name: string,
      listener: BivariantCallback<unknown[], void>,
    ) => D3ZoomBehaviorLike;
  } & Record<string, unknown>;

  type D3DragBehaviorLike = {
    on: (
      name: string,
      listener: BivariantCallback<unknown[], void>,
    ) => D3DragBehaviorLike;
  } & Record<string, unknown>;

  type D3ForceLinkLike = {
    id: (fn: (d: { id: string }) => string) => D3ForceLinkLike;
    distance: (distance: number) => D3ForceLinkLike;
    links?: (links: unknown[]) => void;
  } & Record<string, unknown>;

  type D3ForceManyBodyLike = {
    strength: (value: number) => D3ForceManyBodyLike;
  } & Record<string, unknown>;

  type D3ForceCollideLike = {
    radius: (value: number) => D3ForceCollideLike;
  } & Record<string, unknown>;

  type D3LinkForceLike = {
    links: (links: unknown[]) => void;
  } & Record<string, unknown>;

  type D3SimulationLike = {
    stop: () => void;
    nodes: (nodes: unknown[]) => D3SimulationLike;
    on: (name: string, listener: () => void) => D3SimulationLike;
    force: {
      (name: 'link'): D3LinkForceLike;
      (name: string): unknown;
      (name: string, force: unknown): D3SimulationLike;
    };
    alpha: (alpha: number) => D3SimulationLike;
    restart: () => D3SimulationLike;
    alphaTarget: (alpha: number) => D3SimulationLike;
  } & Record<string, unknown>;

  const d3: {
    select: (selector: string) => D3SelectionLike;
    zoom: () => D3ZoomBehaviorLike;
    drag: () => D3DragBehaviorLike;
    forceSimulation: () => D3SimulationLike;
    forceLink: () => D3ForceLinkLike;
    forceManyBody: () => D3ForceManyBodyLike;
    forceCenter: (x: number, y: number) => unknown;
    forceCollide: () => D3ForceCollideLike;
  } & Record<string, unknown>;
}

export {};
