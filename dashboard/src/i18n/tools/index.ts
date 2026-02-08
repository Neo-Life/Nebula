// 导出核心组件
export { I18nValidator } from '../validator';
export { I18nLoader } from '../loader';
export type * from '../types';

// 实用工具函数
export function generateMissingKeys(
  sourceTranslations: Record<string, unknown>,
  targetTranslations: Record<string, unknown>,
): string[] {
  const missing: string[] = [];

  const isObjectLike = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  function traverse(source: unknown, target: unknown, path: string = '') {
    if (!isObjectLike(source)) return;
    const targetObj: Record<string, unknown> = isObjectLike(target)
      ? target
      : {};

    for (const key in source) {
      const currentPath = path ? `${path}.${key}` : key;

      const sourceValue = source[key];
      const targetValue = targetObj[key];

      if (typeof sourceValue === 'object' && sourceValue !== null) {
        if (!targetValue) {
          missing.push(currentPath);
        } else {
          traverse(sourceValue, targetValue, currentPath);
        }
      } else {
        if (!(key in targetObj)) {
          missing.push(currentPath);
        }
      }
    }
  }

  traverse(sourceTranslations, targetTranslations);
  return missing;
}
