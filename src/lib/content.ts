import { getCollection, type CollectionEntry } from 'astro:content';

export type HomeSettings = CollectionEntry<'siteHome'>['data'];
export type PageSettings = CollectionEntry<'sitePages'>['data'];
export type ChannelSettings = CollectionEntry<'siteChannel'>['data'];
export type RecentItem = HomeSettings['recentItems'][number];

export const defaultHomeSettings: HomeSettings = {
  name: 'Robin Lu',
  nameEn: 'Robin Lu',
  status: '个人主页',
  statusEn: 'Personal website',
  roles: [],
  heroDescriptionParagraphs: [],
  aboutTitle: '关于我',
  aboutParagraphs: [],
  recentTitle: '最近在做',
  recentItems: [],
  findMeLinks: [],
};

export const defaultPageSettings: PageSettings = {
  home: {
    navLabel: '首页',
    navLabelEn: 'Home',
  },
  portfolio: {
    sectionNumber: '02',
    navLabel: '作品集',
    navLabelEn: 'Portfolio',
    intro: '这里收录我正在做和已经完成的项目。从最初的想法，到设计、搭建与迭代，它们记录了我如何把抽象的概念变成具体的结果。',
    introEn: 'This is where I keep the projects I am building and the ones I have already finished.',
  },
  thoughts: {
    sectionNumber: '03',
    navLabel: '想法',
    navLabelEn: 'Thoughts',
    intro: '这里整理我持续关心的问题与观察。是观点，是方法，是哲学，是我试着把复杂事情讲清楚的过程。',
    introEn: 'This is where I organize the questions and observations I keep returning to.',
  },
  life: {
    sectionNumber: '04',
    navLabel: '生活',
    navLabelEn: 'Life',
    intro: '这里留下生活本身的痕迹，还有那些值得被记住一下的普通时刻。',
    introEn: 'This is where I leave traces of life itself and ordinary moments worth remembering.',
  },
  channel: {
    sectionNumber: '05',
    navLabel: '频道',
    navLabelEn: 'Channels',
    intro: '这里连接我在不同平台上的持续表达。视频、笔记与日常更新会先在那里发生，再慢慢沉淀成这里的一部分。',
    introEn: 'This connects the ongoing work I share across different platforms.',
  },
};

export const defaultChannelSettings: ChannelSettings = {
  channels: [],
};

export async function getHomeSettings(): Promise<HomeSettings> {
  const [entry] = await getCollection('siteHome').catch(() => []);
  return entry?.data ?? defaultHomeSettings;
}

export async function getPageSettings(): Promise<PageSettings> {
  const [entry] = await getCollection('sitePages').catch(() => []);
  return entry?.data ?? defaultPageSettings;
}

export async function getChannelSettings(): Promise<ChannelSettings> {
  const [entry] = await getCollection('siteChannel').catch(() => []);
  return entry?.data ?? defaultChannelSettings;
}

export async function getPublishedProjects() {
  return (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPublishedThoughts() {
  return (await getCollection('thoughts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getLifeEntries() {
  return (await getCollection('life'))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getCatEntries() {
  return (await getCollection('cats'))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function sortRecentItems(items: RecentItem[]) {
  return items.slice().sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
