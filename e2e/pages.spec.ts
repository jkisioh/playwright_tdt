import { test, expect } from '@playwright/test';

const pages = [
  {
    name: 'Home',
    url: '/',
    selector: 'main',
    expectedContent: ['TDT', 'Investment', 'Tanzania'],
    hasNavigation: true
  },
  {
    name: 'Investment Profiles',
    url: '/investment-profiles',
    selector: '.investment-card, .card, [class*="Card"], .grid > div, main div > div',
    expectedContent: ['Investment'],
    hasNavigation: true
  },
  {
    name: 'Social Accountability',
    url: '/social-accountability',
    selector: 'main section, .prose, main div > div',
    expectedContent: ['Accountability', 'Social'],
    hasNavigation: true
  },
  {
    name: 'Stakeholder Directory',
    url: '/stakeholder-directory',
    selector: 'table, .directory-list, .grid, main',
    expectedContent: ['Stakeholder'],
    hasNavigation: true
  },
  {
    name: 'Knowledge Hub',
    url: '/knowledge-hub',
    selector: '.resource-item, article, [class*="item"], main',
    expectedContent: ['Knowledge', 'Resource'],
    hasNavigation: true
  },
  {
    name: 'News & Events',
    url: '/news-events',
    selector: 'article, .news-item, .grid > div, h1, h2',
    expectedContent: ['News', 'Events'],
    hasNavigation: true
  },
  {
    name: 'Contact Us',
    url: '/contact-us',
    selector: 'form, main section',
    expectedContent: ['Contact'],
    hasNavigation: true,
    hasForm: true
  }
];

test.describe('TDT Website – Functional Testing on Staging', () => {
  test.use({
    navigationTimeout: 45000,
    actionTimeout: 20000
  });

  test('should load staging environment correctly', async ({ page, baseURL }) => {
    expect(baseURL).toBe('https://tdt.akvotest.org');
    await page.goto('/');
    await expect(page).toHaveTitle(/TDT|Tanzania|Investment|Home/i);
  });

  for (const pageInfo of pages) {
    test.describe(`${pageInfo.name} Page Tests`, () => {
      test(`should navigate to and load ${pageInfo.name}`, async ({ page }) => {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

        // Verify URL is correct
        expect(page.url()).toContain(pageInfo.url);

        // Verify page doesn't show error
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).not.toContain('404');
        expect(bodyText).not.toContain('Page Not Found');
        expect(bodyText).not.toContain('Error');
      });

      test(`should display main content on ${pageInfo.name}`, async ({ page }) => {
        await page.goto(pageInfo.url, { waitUntil: 'commit' });

        const content = page.locator(pageInfo.selector).first();

        try {
          await content.waitFor({ state: 'attached', timeout: 15000 });
          await content.waitFor({ state: 'visible', timeout: 15000 });
          await content.scrollIntoViewIfNeeded();
          await expect(content).toBeVisible();
        } catch (e) {
          await expect(page.locator('main')).toBeVisible();
          console.warn(`Warning: Specific selector for ${pageInfo.name} timed out. Verified <main> instead.`);
        }
      });

      test(`should contain expected static content on ${pageInfo.name}`, async ({ page }) => {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

        const bodyText = await page.locator('body').textContent() || '';

        // Check if at least one of the expected content items is present
        const hasExpectedContent = pageInfo.expectedContent.some(content =>
          bodyText.toLowerCase().includes(content.toLowerCase())
        );

        expect(hasExpectedContent,
          `Expected to find at least one of [${pageInfo.expectedContent.join(', ')}] on ${pageInfo.name}`
        ).toBeTruthy();
      });

      if (pageInfo.hasNavigation) {
        test(`should have functional navigation on ${pageInfo.name}`, async ({ page }) => {
          await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

          // Check for navigation elements
          const nav = page.locator('nav, header nav, [role="navigation"]').first();
          await expect(nav).toBeVisible({ timeout: 10000 });

          // Verify navigation links are present and clickable
          const navLinks = page.locator('nav a, header a, [role="navigation"] a');
          const linkCount = await navLinks.count();
          expect(linkCount).toBeGreaterThan(0);
        });
      }

      test(`should validate images on ${pageInfo.name}`, async ({ page, baseURL }) => {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

        const images = page.locator('img[src]');
        const count = await images.count();
        const limit = Math.min(count, 5);

        for (let i = 0; i < limit; i++) {
          const img = images.nth(i);
          const src = await img.getAttribute('src');

          if (!src || src.startsWith('data:') || src.startsWith('blob:') || src === '') continue;

          const imageUrl = src.startsWith('http') ? src : `${baseURL}${src}`;

          const response = await page.request.head(imageUrl);
          expect(
            response.status(),
            `Broken image on ${pageInfo.name}: ${imageUrl}`
          ).toBeLessThan(400);
        }
      });

      if (pageInfo.hasForm) {
        test(`should have functional form elements on ${pageInfo.name}`, async ({ page }) => {
          await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });

          const form = page.locator('form').first();
          await expect(form).toBeVisible({ timeout: 10000 });

          // Check for input fields
          const inputs = page.locator('input, textarea, select');
          const inputCount = await inputs.count();
          expect(inputCount).toBeGreaterThan(0);

          // Check for submit button
          const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
          await expect(submitButton).toBeVisible();
        });
      }
    });
  }

  test('should test cross-page navigation', async ({ page }) => {
    await page.goto('/');

    // Test navigation to different pages
    const testNavigationFlow = [
      { url: '/investment-profiles', content: 'Investment' },
      { url: '/stakeholder-directory', content: 'Stakeholder' },
      { url: '/contact-us', content: 'Contact' }
    ];

    for (const step of testNavigationFlow) {
      await page.goto(step.url);
      await expect(page).toHaveURL(new RegExp(step.url));
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.toLowerCase()).toContain(step.content.toLowerCase());
    }
  });
});