declare global {
  interface Window {
    monaco?: any;
  }
}

const monaco = typeof window !== 'undefined' ? window.monaco : undefined;
export default monaco;
export { monaco };
