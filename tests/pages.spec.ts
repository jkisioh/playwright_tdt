import { test, expect } from '@playwright/test';

// Define the pages to be tested
const contentPages = [
  { name: 'Investment Profiles', url: '/investment-profiles' },
  { name: 'Social Accountability', url: '/social-accountability' },
  { name: 'Stakeholder Directory', url: '/stakeholder-directory' },
  { name: 'Knowledge Hub', url: '/knowledge-hub' },
  { name: 'News & Events', url: '/news-events' },
  { name: 'Contact Us', url: '/contact-us' },
];

test.describe('Akvotest TDT Content Pages', () => {
  // Base URL is prepended automatically if configured in playwright.config.ts
  const baseUrl = 'https://tdt.akvotest.org';

  for (const pageInfo of contentPages) {
    test(`Verify content and stability of: ${pageInfo.name}`, async ({ page }) => {
      // 1. Navigate to the page
      await page.goto(`${baseUrl}${pageInfo.url}`);

      // 2. Check Page Title (generic check for 'Akvotest' or specific names)
      await expect(page).toHaveTitle(new RegExp(pageInfo.name, 'i'));

      // 3. Verify Key UI Elements
      const header = page.locator('header');
      const footer = page.locator('footer');
      const mainContent = page.locator('main');

      await expect(header).toBeVisible();
      await expect(footer).toBeVisible();
      await expect(mainContent).toBeVisible();

      // 4. Verify specific heading exists for the page
      // Assuming pages use h1 or h2 for titles
      const heading = page.getByRole('heading', { level: 1, name: new RegExp(pageInfo.name, 'i') })
                      .or(page.getByRole('heading', { level: 2, name: new RegExp(pageInfo.name, 'i') }));
      
      await expect(heading.first()).toBeVisible();

      // 5. Interactivity Check: Ensure links in the navigation are present
      const navLinks = page.locator('nav a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});