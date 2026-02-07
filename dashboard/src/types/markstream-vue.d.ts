declare module 'markstream-vue' {
  import type { DefineComponent } from 'vue';

  export const MarkdownRender: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export const MarkdownCodeBlockNode: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;

  export function enableKatex(loader?: unknown): void;
  export function enableMermaid(loader?: unknown): void;

  export function setCustomComponents(mapping: Record<string, unknown>): void;
  export function setCustomComponents(
    customId: string,
    mapping: Record<string, unknown>,
  ): void;
}
