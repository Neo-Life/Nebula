declare global {
  interface Window {
    monaco?: unknown;
  }
}

const monaco = typeof window !== 'undefined' ? window.monaco : undefined;
export default monaco;
export { monaco };
