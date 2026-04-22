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

export function formatWeekLabel(value: Date | string): LocalizedCopy {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = normalized.getUTCDay() || 7;

  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((normalized.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const label = `KW ${weekNo}`;

  return {
    zh: label,
    en: label,
  };
}

export const recentCategoryLabels = {
  learning: defineCopy('学习新的技能', 'Learning'),
  certification: defineCopy('考证', 'Certification'),
  reading: defineCopy('阅读', 'Reading'),
  project: defineCopy('做项目', 'Project'),
} as const;

export const projectCategoryLabels = {
  all: defineCopy('全部', 'All'),
  web: defineCopy('Web 应用', 'Web Apps'),
  design: defineCopy('设计系统', 'Design Systems'),
  tool: defineCopy('工具', 'Tools'),
  mobile: defineCopy('移动端', 'Mobile'),
} as const;

export const thoughtLabelMap: Record<string, LocalizedCopy> = {
  观点: defineCopy('观点', 'Opinion'),
  学习: defineCopy('学习', 'Learning'),
  观察: defineCopy('观察', 'Observation'),
  设计: defineCopy('设计', 'Design'),
  技术: defineCopy('技术', 'Tech'),
  生活: defineCopy('生活', 'Life'),
  方法: defineCopy('方法', 'Method'),
  方法论: defineCopy('方法论', 'Methodology'),
  创作: defineCopy('创作', 'Creation'),
  写作: defineCopy('写作', 'Writing'),
  产品: defineCopy('产品', 'Product'),
  城市: defineCopy('城市', 'City'),
  成长: defineCopy('成长', 'Growth'),
  ADHD: defineCopy('ADHD', 'ADHD'),
};

export function localizeThoughtLabel(label?: string | null): LocalizedCopy | undefined {
  if (!label) return undefined;
  return thoughtLabelMap[label] ?? defineCopy(label, label);
}
