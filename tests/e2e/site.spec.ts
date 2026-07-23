import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/portfolio', '/thoughts', '/life', '/channel', '/lucky-cat', '/404.html'];

function parseRgb(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported computed color: ${color}`);
  }
  return channels;
}

function relativeLuminance(color: string) {
  const [red, green, blue] = parseRgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectReadableText(page: import('@playwright/test').Page, selector: string) {
  const colors = await page.locator(selector).first().evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
}

for (const route of publicRoutes) {
  test(`${route} renders without horizontal page overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('language switch updates copy and document language', async ({ page }) => {
  await page.goto('/');
  const englishButton = page.locator('[data-set-language="en"]:visible').first();
  await englishButton.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(englishButton).toHaveClass(/active/);
  await expect(page).toHaveTitle(/Home|Robin Lu/);
});

test('mobile menu opens and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile navigation behavior');
  await page.goto('/');
  await page.locator('#menuBtn').click();
  await expect(page.locator('#sidebar')).toHaveClass(/open/);
  const viewport = page.viewportSize();
  await page.mouse.click((viewport?.width ?? 412) - 8, 300);
  await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
});

test('portfolio filtering keeps matching cards visible', async ({ page }) => {
  await page.goto('/portfolio');
  const filters = page.locator('.filter-btn');
  test.skip(await filters.count() < 2, 'Only one category is available');
  await filters.nth(1).click();
  await expect(filters.nth(1)).toHaveClass(/active/);
  const visibleCards = page.locator('.portfolio-card:not([hidden])');
  await expect(visibleCards.first()).toBeVisible();
});

test('portfolio and thought details have top and bottom back links', async ({ page }) => {
  await page.goto('/portfolio');
  const projectHref = await page.locator('.portfolio-card').first().getAttribute('href');
  expect(projectHref).toBeTruthy();
  await page.goto(projectHref!);
  await expect(page.locator('.detail-back-link')).toHaveCount(2);
  await expect(page.locator('.prose')).toBeVisible();

  await page.goto('/thoughts');
  const thoughtHref = await page.locator('.post-item').first().getAttribute('href');
  expect(thoughtHref).toBeTruthy();
  await page.goto(thoughtHref!);
  await expect(page.locator('.detail-back-link')).toHaveCount(2);
  await expect(page.locator('.prose')).toBeVisible();
});

test('article attachments link to a responsive preview when content provides one', async ({ page }) => {
  await page.goto('/portfolio');
  const projectHref = await page.locator('.portfolio-card').first().getAttribute('href');
  expect(projectHref).toBeTruthy();
  await page.goto(projectHref!);

  const attachmentCards = page.locator('.attachment-card');
  test.skip(await attachmentCards.count() === 0, 'No published article currently has attachments');

  await expect(attachmentCards.first()).toBeVisible();
  const previewHref = await attachmentCards.first().locator('.attachment-preview-link').getAttribute('href');
  expect(previewHref).toMatch(/^\/attachments\//);
  await page.goto(previewHref!);
  await expect(page.locator('.attachment-preview-page')).toBeVisible();
  await expect(page.locator('.detail-back-link')).toHaveCount(2);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('life timeline and cat collection content render', async ({ page }) => {
  await page.goto('/life');
  await expect(page.locator('.life-timeline-item:visible').first()).toBeVisible();
  await expect(page.locator('.life-story-card').first()).toBeVisible();

  await page.goto('/lucky-cat');
  await expect(page.locator('.cat-card').first()).toBeVisible();
});

test('information-bearing text meets the default contrast target', async ({ page }) => {
  await page.goto('/');
  await expectReadableText(page, '.hero-summary p');
  await expectReadableText(page, '.nav-link');

  await page.goto('/thoughts');
  await expectReadableText(page, '.shared-page-intro');
  await expectReadableText(page, '.post-item p');
  await expectReadableText(page, '.post-date');

  const thoughtHref = await page.locator('.post-item').first().getAttribute('href');
  expect(thoughtHref).toBeTruthy();
  await page.goto(thoughtHref!);
  await expectReadableText(page, '.prose');
});

test('system contrast preference further strengthens secondary text', async ({ page }) => {
  await page.goto('/thoughts');
  const defaultColor = await page.locator('.post-date').first().evaluate(
    (element) => getComputedStyle(element).color,
  );

  await page.emulateMedia({ contrast: 'more' });
  await page.reload();
  const enhancedColor = await page.locator('.post-date').first().evaluate(
    (element) => getComputedStyle(element).color,
  );
  const background = await page.locator('body').evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  expect(contrastRatio(enhancedColor, background)).toBeGreaterThan(
    contrastRatio(defaultColor, background),
  );
});
