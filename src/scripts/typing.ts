import { getPreferredLanguage } from './language';

export function initTypingAnimation() {
  const element = document.querySelector<HTMLElement>('#typingText');
  if (!element) return;

  let characterIndex = 0;
  let deleting = false;
  let timerId: number | undefined;

  const getWord = () => {
    const raw = getPreferredLanguage() === 'en'
      ? element.dataset.wordsEn
      : element.dataset.wordsZh;

    try {
      const words: unknown = JSON.parse(raw ?? '[]');
      return Array.isArray(words) && typeof words[0] === 'string' ? words[0] : '';
    } catch {
      return '';
    }
  };

  const schedule = (callback: () => void, delay: number) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, delay);
  };

  const tick = () => {
    const word = getWord();
    if (!word) {
      element.textContent = '';
      return;
    }

    characterIndex += deleting ? -1 : 1;
    element.textContent = word.slice(0, characterIndex);

    if (!deleting && characterIndex >= word.length) {
      deleting = true;
      schedule(tick, 1800);
      return;
    }

    if (deleting && characterIndex <= 0) deleting = false;
    schedule(tick, deleting ? 60 : 110);
  };

  const reset = () => {
    characterIndex = 0;
    deleting = false;
    element.textContent = '';
    schedule(tick, 120);
  };

  document.addEventListener('site:language-change', reset);
  reset();
}
