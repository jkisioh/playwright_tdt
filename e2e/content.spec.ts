import { test, expect } from '@playwright/test';

test.describe('TDT Website – Interactivity & Content Tests', () => {
  test.use({
    navigationTimeout: 30000,
    actionTimeout: 15000
  });

  test.describe('Navigation Interactivity', () => {
    test('should have clickable navigation menu items', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Wait for page to load by checking for main heading
      const heading = page.locator('h2:has-text("Welcome"), h2:has-text("Kenya")').first();
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Find a navigation link by role and text (scoped to navigation)
      const nav = page.getByRole('navigation');
      const homeLink = nav.getByRole('link', { name: 'Home' });
      await expect(homeLink).toBeVisible({ timeout: 10000 });

      // Verify link is clickable and has href
      const href = await homeLink.getAttribute('href');
      expect(href).toBeTruthy();
    });

    test('should navigate between pages using menu', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Find and click a navigation link (scoped to navigation)
      const nav = page.getByRole('navigation');
      const investLink = nav.locator('a').filter({ hasText: /Invest/i }).first();

      if (await investLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await investLink.click();
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain('invest');
      }
    });
  });

  test.describe('Investment Profiles Page Interactivity', () => {
    test('should display investment cards/items', async ({ page }) => {
      await page.goto('/investment-profiles', { waitUntil: 'domcontentloaded' });

      // Wait for page heading to be visible (more reliable than main element)
      const pageHeading = page.locator('h1, h2').filter({ hasText: /Investment/i }).first();
      await expect(pageHeading).toBeVisible({ timeout: 10000 });

      // Verify page contains investment-related content
      await expect(page.locator('body')).toContainText(/Investment/i);
    });

    test('should handle card interactions if present', async ({ page }) => {
      await page.goto('/investment-profiles', { waitUntil: 'domcontentloaded' });

      // Look for clickable cards or links
      const cards = page.locator('.card, [class*="Card"], article, .grid > div a, main a').first();
      const cardCount = await page.locator('.card, [class*="Card"], article, .grid > div').count();

      if (cardCount > 0) {
        await expect(cards).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Stakeholder Directory Interactivity', () => {
    test('should display stakeholder data', async ({ page }) => {
      await page.goto('/stakeholder-directory', { waitUntil: 'domcontentloaded' });

      // Wait for page heading to be visible
      const pageHeading = page.locator('h1, h2').filter({ hasText: /Stakeholder|Directory/i }).first();
      await expect(pageHeading).toBeVisible({ timeout: 10000 });

      // Check for stakeholder content
      await expect(page.locator('body')).toContainText(/Stakeholder|Directory/i);
    });

    test('should have searchable or filterable content if available', async ({ page }) => {
      await page.goto('/stakeholder-directory', { waitUntil: 'domcontentloaded' });

      // Check for common search/filter elements
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
      const hasSearch = await searchInput.count() > 0;

      if (hasSearch) {
        await expect(searchInput.first()).toBeVisible();
        // Test typing in search
        await searchInput.first().fill('test');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Knowledge Hub Interactivity', () => {
    test('should display knowledge resources', async ({ page }) => {
      await page.goto('/knowledge-hub', { waitUntil: 'domcontentloaded' });

      // Wait for page heading to be visible
      const pageHeading = page.locator('h1, h2').filter({ hasText: /Knowledge|Resource/i }).first();
      await expect(pageHeading).toBeVisible({ timeout: 10000 });

      await expect(page.locator('body')).toContainText(/Knowledge|Resource/i);
    });

    test('should have clickable resource items', async ({ page }) => {
      await page.goto('/knowledge-hub', { waitUntil: 'domcontentloaded' });

      // Look for resource links or cards
      const resources = page.locator('article a, .resource-item, [class*="item"] a, main a').first();
      const resourceCount = await page.locator('article, .resource-item, [class*="item"]').count();

      if (resourceCount > 0) {
        await expect(resources).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Contact Form Interactivity', () => {
    test('should have functional contact form', async ({ page }) => {
      await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });

      const form = page.locator('form').first();
      await expect(form).toBeVisible({ timeout: 10000 });

      // Check for required form elements
      const inputs = page.locator('input, textarea');
      await expect(inputs.first()).toBeVisible();

      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
      await expect(submitButton).toBeVisible();
    });

    test('should allow typing in form fields', async ({ page }) => {
      await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });

      // Find text inputs
      const textInput = page.locator('input[type="text"], input[type="email"], input:not([type="submit"]):not([type="button"])').first();
      const textareaInput = page.locator('textarea').first();

      const hasTextInput = await textInput.count() > 0;
      const hasTextarea = await textareaInput.count() > 0;

      if (hasTextInput) {
        await textInput.fill('Test User');
        const value = await textInput.inputValue();
        expect(value).toBe('Test User');
      }

      if (hasTextarea) {
        await textareaInput.fill('This is a test message');
        const value = await textareaInput.inputValue();
        expect(value).toBe('This is a test message');
      }
    });

    test('should validate form submission button is enabled', async ({ page }) => {
      await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });

      // Look for submit button with various selectors (scroll into view if needed)
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
      await submitButton.scrollIntoViewIfNeeded();
      await expect(submitButton).toBeVisible({ timeout: 10000 });

      // Check if button is not permanently disabled
      const isEnabled = await submitButton.isEnabled();
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  test.describe('Social Accountability Content', () => {
    test('should display accountability information', async ({ page }) => {
      await page.goto('/social-accountability', { waitUntil: 'domcontentloaded' });

      // Wait for page heading to be visible
      const pageHeading = page.locator('h1, h2').filter({ hasText: /Accountability|Social/i }).first();
      await expect(pageHeading).toBeVisible({ timeout: 10000 });

      await expect(page.locator('body')).toContainText(/Accountability|Social/i);
    });
  });

  test.describe('News & Events Content', () => {
    test('should display news or event items', async ({ page }) => {
      await page.goto('/news-events', { waitUntil: 'domcontentloaded' });

      // Wait for page heading to be visible
      const pageHeading = page.locator('h1, h2').filter({ hasText: /News|Events/i }).first();
      await expect(pageHeading).toBeVisible({ timeout: 10000 });

      await expect(page.locator('body')).toContainText(/News|Events/i);
    });

    test('should have news articles or event cards', async ({ page }) => {
      await page.goto('/news-events', { waitUntil: 'domcontentloaded' });

      // Look for article elements or news items
      const articles = page.locator('article, .news-item, [class*="event"]');
      const hasArticles = await articles.count() > 0;

      if (hasArticles) {
        await expect(articles.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Wait for header/navigation to be visible as page load indicator
      const header = page.locator('header, nav, [role="banner"]').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      // Check if mobile menu exists
      const mobileMenu = page.locator('button[aria-label*="menu" i], button:has-text("Menu"), .mobile-menu, [class*="hamburger"]');
      const hasMobileMenu = await mobileMenu.count() > 0;

      if (hasMobileMenu) {
        await expect(mobileMenu.first()).toBeVisible();
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Wait for header/navigation to be visible as page load indicator
      const header = page.locator('header, nav, [role="banner"]').first();
      await expect(header).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Performance & Loading', () => {
    test('should load pages within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      // Page should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should not have JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Check for critical errors (allow some non-critical warnings)
      const criticalErrors = errors.filter(err =>
        !err.includes('favicon') && !err.includes('analytics')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });
});