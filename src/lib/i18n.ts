export type Language = 'zh' | 'en';

export interface LocalizedCopy {
  zh: string;
  en: string;
}

export const DEFAULT_LANGUAGE: Language = 'zh';

export function defineCopy(zh: string, en?: string): LocalizedCopy {
  return {
    zh,
    en: en ?? zh,
  };
}

export function formatLocalizedDate(value: Date | string): LocalizedCopy {
  const date = value instanceof Date ? value : new Date(value);

  return {
    zh: date.toLocaleDateString('zh-CN'),
    en: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  };
}

export const projectCategoryLabels = {
  all: defineCopy('全部', 'All'),
  web: defineCopy('Web 应用', 'Web Apps'),
  design: defineCopy('设计系统', 'Design Systems'),
  tool: defineCopy('工具', 'Tools'),
  mobile: defineCopy('移动端', 'Mobile'),
} as const;
