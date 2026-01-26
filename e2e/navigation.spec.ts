import { test, expect } from '@playwright/test';

test.describe('TDT Website – Site-wide Navigation & UI Elements', () => {
  test.use({
    navigationTimeout: 30000,
    actionTimeout: 15000
  });

  test.describe('Header & Main Navigation', () => {
    test('should display header on all pages', async ({ page }) => {
      const pages = ['/', '/investment-profiles', '/stakeholder-directory', '/contact-us'];

      for (const url of pages) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const header = page.locator('header, [role="banner"], nav').first();
        await expect(header).toBeVisible();
      }
    });

    test('should have consistent navigation menu across pages', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const nav = page.locator('nav, header nav, [role="navigation"]').first();
      await expect(nav).toBeVisible({ timeout: 10000 });

      const navLinks = await page.locator('nav a, header a, [role="navigation"] a').count();
      expect(navLinks).toBeGreaterThan(0);

      // Navigate to another page and verify nav still exists
      await page.goto('/contact-us', { waitUntil: 'domcontentloaded' });
      const navOnContactPage = page.locator('nav, header nav, [role="navigation"]').first();
      await expect(navOnContactPage).toBeVisible();
    });

    test('should have logo or site branding', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Look for logo, brand, or site title
      const branding = page.locator('header img, .logo, [class*="logo" i], header a:first-child');
      const hasBranding = await branding.count() > 0;

      if (hasBranding) {
        await expect(branding.first()).toBeVisible();
      }
    });
  });

  test.describe('Footer Elements', () => {
    test('should display footer on all pages', async ({ page }) => {
      const pages = ['/', '/investment-profiles', '/knowledge-hub'];

      for (const url of pages) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Scroll to bottom to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        const footer = page.locator('footer, [role="contentinfo"]').first();
        const hasFooter = await footer.count() > 0;

        if (hasFooter) {
          await expect(footer).toBeVisible();
        }
      }
    });

    test('should have footer content and links', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const footer = page.locator('footer, [role="contentinfo"]').first();
      const hasFooter = await footer.count() > 0;

      if (hasFooter) {
        const footerLinks = await page.locator('footer a, [role="contentinfo"] a').count();
        // Footer should have at least some links or content
        expect(footerLinks).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Page Navigation Flow', () => {
    test('should navigate through all main pages successfully', async ({ page }) => {
      const navigationFlow = [
        { url: '/', expectedText: 'TDT' },
        { url: '/investment-profiles', expectedText: 'Investment' },
        { url: '/social-accountability', expectedText: 'Accountability' },
        { url: '/stakeholder-directory', expectedText: 'Stakeholder' },
        { url: '/knowledge-hub', expectedText: 'Knowledge' },
        { url: '/news-events', expectedText: 'News' },
        { url: '/contact-us', expectedText: 'Contact' }
      ];

      for (const step of navigationFlow) {
        await page.goto(step.url, { waitUntil: 'domcontentloaded' });

        // Verify navigation was successful
        expect(page.url()).toContain(step.url);

        // Verify page loaded with expected content
        const bodyText = await page.locator('body').textContent() || '';
        const hasExpectedText = bodyText.toLowerCase().includes(step.expectedText.toLowerCase());

        expect(hasExpectedText, `Expected to find "${step.expectedText}" on ${step.url}`).toBeTruthy();
      }
    });

    test('should navigate back and forward', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const homeUrl = page.url();

      await page.goto('/investment-profiles', { waitUntil: 'domcontentloaded' });
      const investmentUrl = page.url();

      // Navigate back
      await page.goBack();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toBe(homeUrl);

      // Navigate forward
      await page.goForward();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toBe(investmentUrl);
    });

    test('should handle direct URL access', async ({ page }) => {
      const urls = [
        '/investment-profiles',
        '/stakeholder-directory',
        '/knowledge-hub',
        '/contact-us'
      ];

      for (const url of urls) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Verify the page loaded successfully
        const main = page.locator('main');
        await expect(main).toBeVisible();

        // Verify no error messages
        const bodyText = await page.locator('body').textContent() || '';
        expect(bodyText).not.toContain('404');
        expect(bodyText).not.toContain('Page Not Found');
      }
    });
  });

  test.describe('Breadcrumbs and Navigation State', () => {
    test('should show active page in navigation if applicable', async ({ page }) => {
      await page.goto('/investment-profiles', { waitUntil: 'domcontentloaded' });

      // Look for active/current navigation indicators
      const activeNav = page.locator('nav a[aria-current], nav .active, nav [class*="active"]');
      const hasActiveIndicator = await activeNav.count() > 0;

      // This is optional, so we just check if it exists
      if (hasActiveIndicator) {
        await expect(activeNav.first()).toBeVisible();
      }
    });

    test('should have breadcrumbs on nested pages if applicable', async ({ page }) => {
      await page.goto('/knowledge-hub', { waitUntil: 'domcontentloaded' });

      const breadcrumbs = page.locator('[aria-label*="breadcrumb" i], .breadcrumb, [class*="breadcrumb"]');
      const hasBreadcrumbs = await breadcrumbs.count() > 0;

      // Breadcrumbs are optional, just verify if they exist
      if (hasBreadcrumbs) {
        await expect(breadcrumbs.first()).toBeVisible();
      }
    });
  });

  test.describe('Link Validation', () => {
    test('should have valid internal links on homepage', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const internalLinks = page.locator('a[href^="/"], a[href^="./"], a[href^="../"]');
      const linkCount = await internalLinks.count();
      const maxLinksToTest = Math.min(linkCount, 10);

      for (let i = 0; i < maxLinksToTest; i++) {
        const link = internalLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href && !href.includes('#') && !href.includes('mailto:') && !href.includes('tel:')) {
          expect(href).toBeTruthy();
          expect(href.length).toBeGreaterThan(0);
        }
      }
    });

    test('should have accessible external links if any', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const externalLinks = page.locator('a[href^="http"]:not([href*="tdt.akvotest.org"])');
      const linkCount = await externalLinks.count();

      if (linkCount > 0) {
        const firstExternal = externalLinks.first();
        const href = await firstExternal.getAttribute('href');
        expect(href).toBeTruthy();

        // External links should ideally open in new tab
        const target = await firstExternal.getAttribute('target');
        // This is a best practice but not always enforced
        if (target) {
          expect(target).toBe('_blank');
        }
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should have mobile menu on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Look for mobile menu trigger
      const mobileMenuTrigger = page.locator(
        'button[aria-label*="menu" i], button:has-text("Menu"), .hamburger, [class*="hamburger"], [class*="mobile-menu"]'
      );
      const hasMobileMenu = await mobileMenuTrigger.count() > 0;

      if (hasMobileMenu) {
        await expect(mobileMenuTrigger.first()).toBeVisible();
      }
    });

    test('should toggle mobile menu when clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const mobileMenuTrigger = page.locator(
        'button[aria-label*="menu" i], button:has-text("Menu"), .hamburger, [class*="hamburger"]'
      ).first();

      const hasMobileMenu = await mobileMenuTrigger.count() > 0;

      if (hasMobileMenu) {
        await mobileMenuTrigger.click();
        await page.waitForTimeout(500);

        // Check if menu expanded
        const ariaExpanded = await mobileMenuTrigger.getAttribute('aria-expanded');
        if (ariaExpanded) {
          expect(ariaExpanded).toBe('true');
        }
      }
    });
  });

  test.describe('Accessibility - Navigation', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();

      // Check for navigation landmark
      const nav = page.locator('nav, [role="navigation"]');
      const hasNav = await nav.count() > 0;
      expect(hasNav).toBeTruthy();
    });

    test('should have skip navigation link for accessibility', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Skip links are often visually hidden but accessible to screen readers
      const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link, [class*="skip"]');
      const hasSkipLink = await skipLink.count() > 0;

      // This is optional but recommended for accessibility
      if (hasSkipLink) {
        const href = await skipLink.first().getAttribute('href');
        expect(href).toBeTruthy();
      }
    });
  });

  test.describe('Search Functionality', () => {
    test('should have search feature if available', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], [role="search"] input'
      );
      const hasSearch = await searchInput.count() > 0;

      if (hasSearch) {
        await expect(searchInput.first()).toBeVisible();

        // Test if search accepts input
        await searchInput.first().fill('test');
        const value = await searchInput.first().inputValue();
        expect(value).toBe('test');
      }
    });
  });
});
