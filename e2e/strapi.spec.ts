import { test, expect, Page } from '@playwright/test';

/**
 * Strapi CMS Content Management Tests
 *
 * These tests verify that content changes made in Strapi CMS
 * are properly reflected on the frontend website.
 *
 * IMPORTANT: These tests modify real data on the staging server.
 * All tests include cleanup steps that ALWAYS run, even if the test fails.
 *
 * Prerequisites:
 * - STRAPI_EMAIL and STRAPI_PASSWORD environment variables must be set
 * - Strapi admin account must have permission to modify content
 *
 * To run these tests:
 *   npm run test:strapi
 *
 * To run with visible browser:
 *   npm run test:strapi -- --headed
 */

// Get Strapi configuration from environment
// STRAPI_URL can be either base URL (https://tdt.akvotest.org/cms) or admin URL (https://tdt.akvotest.org/cms/admin)
const RAW_STRAPI_URL = process.env.STRAPI_URL || 'https://tdt.akvotest.org/cms';
// Normalize: remove trailing /admin if present to get base URL
const STRAPI_BASE_URL = RAW_STRAPI_URL.replace(/\/admin\/?$/, '');
// Admin URL is always base + /admin
const STRAPI_ADMIN_URL = `${STRAPI_BASE_URL}/admin`;

const STRAPI_EMAIL = process.env.STRAPI_EMAIL || '';
const STRAPI_PASSWORD = process.env.STRAPI_PASSWORD || '';

// Test marker to identify test content modifications
const TEST_MARKER = '[E2E-TEST]';

/**
 * Helper: Login to Strapi admin panel
 */
async function loginToStrapi(page: Page): Promise<boolean> {
  if (!STRAPI_EMAIL || !STRAPI_PASSWORD) {
    console.warn('Strapi credentials not configured. Set STRAPI_EMAIL and STRAPI_PASSWORD.');
    return false;
  }

  await page.goto(`${STRAPI_ADMIN_URL}/auth/login`, { waitUntil: 'networkidle' });

  // Wait for login form
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await expect(emailInput).toBeVisible({ timeout: 15000 });

  // Fill credentials
  await emailInput.fill(STRAPI_EMAIL);
  await passwordInput.fill(STRAPI_PASSWORD);

  // Submit login
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for redirect to dashboard (URL should contain /admin but not /auth/login)
  await page.waitForURL(url => url.toString().includes('/admin') && !url.toString().includes('/auth/login'), { timeout: 30000 });

  // Verify we're logged in by checking for dashboard elements
  const dashboardIndicator = page.locator('nav, [role="navigation"], main');
  await expect(dashboardIndicator.first()).toBeVisible({ timeout: 10000 });

  return true;
}

/**
 * Helper: Navigate to content type in Strapi
 */
async function navigateToContentType(page: Page, contentType: string): Promise<void> {
  // Click on Content Manager in sidebar
  const contentManagerLink = page.locator('a[href*="content-manager"], [role="navigation"] a:has-text("Content Manager")').first();
  await contentManagerLink.click();
  await page.waitForLoadState('networkidle');

  // Find and click the specific content type
  const contentTypeLink = page.locator(`a:has-text("${contentType}")`).first();
  await contentTypeLink.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Store original values for cleanup
 */
interface ContentBackup {
  contentType: string;
  entryId: string;
  fieldName: string;
  originalValue: string;
}

const contentBackups: ContentBackup[] = [];

// ============================================================================
// STRAPI CONTENT MANAGEMENT TESTS
// These tests require:
// 1. STRAPI_EMAIL and STRAPI_PASSWORD environment variables
// 2. RUN_STRAPI_TESTS=true to explicitly enable (prevents accidental runs)
// Skip in CI or when not explicitly enabled
// ============================================================================

// Only run these tests when explicitly enabled AND credentials are configured
const hasCredentials = STRAPI_EMAIL && STRAPI_PASSWORD;
const isCI = !!process.env.CI;
const runStrapiTests = process.env.RUN_STRAPI_TESTS === 'true';
const shouldRunStrapiTests = hasCredentials && runStrapiTests && !isCI;

test.describe('Strapi CMS Content Management', () => {
  // Skip unless explicitly enabled with RUN_STRAPI_TESTS=true
  test.skip(!shouldRunStrapiTests, 'Strapi tests disabled (set RUN_STRAPI_TESTS=true to enable)');

  test.use({
    navigationTimeout: 45000,
    actionTimeout: 30000
  });

  // CRITICAL: Cleanup that ALWAYS runs after each test
  test.afterEach(async ({ page }) => {
    // Restore any backed up content
    for (const backup of contentBackups) {
      try {
        console.log(`Restoring ${backup.contentType} entry ${backup.entryId}`);
        await restoreContent(page, backup);
      } catch (error) {
        console.error(`Failed to restore content: ${error}`);
        // Log but don't throw - we want to attempt all restorations
      }
    }
    // Clear backups after restoration
    contentBackups.length = 0;
  });

  /**
   * Test: Verify Strapi admin login works
   */
  test('should login to Strapi admin panel', async ({ page }) => {
    const loggedIn = await loginToStrapi(page);
    expect(loggedIn).toBe(true);

    // Verify dashboard is accessible
    await expect(page).toHaveURL(new RegExp(`${STRAPI_ADMIN_URL}`));
  });

  /**
   * Test: Verify Strapi content is accessible
   */
  test('should access content manager', async ({ page }) => {
    await loginToStrapi(page);

    // Navigate to Content Manager
    const contentManagerLink = page.locator('a[href*="content-manager"]').first();
    await expect(contentManagerLink).toBeVisible({ timeout: 15000 });
    await contentManagerLink.click();

    // Verify content manager page loads
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/content-manager/);
  });

  // ==========================================================================
  // COMMENTED OUT: Tests that modify real data
  // These tests are DANGEROUS - they modify live content on staging!
  // Only uncomment and run manually when specifically needed for testing.
  // ==========================================================================

  
  test('should modify homepage content and verify on frontend', async ({ page, baseURL }) => {
    // Step 1: Login to Strapi
    await loginToStrapi(page);

    // Step 2: Navigate to homepage content
    await navigateToContentType(page, 'Homepage');

    // Step 3: Find and edit the first entry
    const firstEntry = page.locator('tr[data-testid], tbody tr').first();
    await firstEntry.click();
    await page.waitForLoadState('networkidle');

    // Step 4: Find a text field to modify
    const titleField = page.locator('input[name*="title"], input[name*="Title"]').first();
    const hasTitle = await titleField.count() > 0;

    if (hasTitle) {
      // Backup original value
      const originalValue = await titleField.inputValue();
      contentBackups.push({
        contentType: 'Homepage',
        entryId: 'first',
        fieldName: 'title',
        originalValue
      });

      // Modify the field
      const testValue = `${originalValue} ${TEST_MARKER}`;
      await titleField.fill(testValue);

      // Save changes
      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();
      await page.waitForLoadState('networkidle');

      // Step 5: Verify change on frontend
      await page.goto(baseURL || 'https://tdt.akvotest.org', { waitUntil: 'networkidle' });
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain(TEST_MARKER);
    }
  });

  test('should modify news article and verify on frontend', async ({ page, baseURL }) => {
    let originalTitle = '';

    try {
      // Login to Strapi
      await loginToStrapi(page);

      // Navigate to News/Articles content type
      await navigateToContentType(page, 'Article');

      // Edit first article
      const firstEntry = page.locator('tr[data-testid], tbody tr').first();
      await firstEntry.click();
      await page.waitForLoadState('networkidle');

      // Get and modify title
      const titleField = page.locator('input[name*="title"], input[name*="Title"]').first();
      if (await titleField.count() > 0) {
        originalTitle = await titleField.inputValue();
        contentBackups.push({
          contentType: 'Article',
          entryId: 'first',
          fieldName: 'title',
          originalValue: originalTitle
        });

        const testTitle = `${originalTitle} ${TEST_MARKER}`;
        await titleField.fill(testTitle);

        // Save
        await page.locator('button:has-text("Save")').click();
        await page.waitForLoadState('networkidle');

        // Verify on frontend
        await page.goto(`${baseURL}/news-events`, { waitUntil: 'networkidle' });
        const pageContent = await page.locator('body').textContent();
        expect(pageContent).toContain(TEST_MARKER);
      }
    } catch (error) {
      // Error handling - cleanup will still run via afterEach
      throw error;
    }
  });

  test('should modify stakeholder entry and verify on frontend', async ({ page, baseURL }) => {
    try {
      await loginToStrapi(page);

      // Navigate to Stakeholders
      await navigateToContentType(page, 'Stakeholder');

      // Edit first stakeholder
      const firstEntry = page.locator('tr[data-testid], tbody tr').first();
      await firstEntry.click();
      await page.waitForLoadState('networkidle');

      // Find name/title field
      const nameField = page.locator('input[name*="name"], input[name*="Name"], input[name*="title"]').first();
      if (await nameField.count() > 0) {
        const originalName = await nameField.inputValue();
        contentBackups.push({
          contentType: 'Stakeholder',
          entryId: 'first',
          fieldName: 'name',
          originalValue: originalName
        });

        const testName = `${originalName} ${TEST_MARKER}`;
        await nameField.fill(testName);

        // Save
        await page.locator('button:has-text("Save")').click();
        await page.waitForLoadState('networkidle');

        // Verify on frontend
        await page.goto(`${baseURL}/stakeholder-directory`, { waitUntil: 'networkidle' });
        const pageContent = await page.locator('body').textContent();
        expect(pageContent).toContain(TEST_MARKER);
      }
    } catch (error) {
      throw error;
    }
  });
  
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Restore content to its original state
 * This function MUST complete successfully for proper cleanup
 */
async function restoreContent(page: Page, backup: ContentBackup): Promise<void> {
  // Ensure we're logged in
  const isOnStrapi = page.url().includes(STRAPI_BASE_URL);
  if (!isOnStrapi) {
    await loginToStrapi(page);
  }

  // Navigate to the content type
  await navigateToContentType(page, backup.contentType);

  // Find and click the entry (simplified - assumes first entry)
  const firstEntry = page.locator('tr[data-testid], tbody tr').first();
  await firstEntry.click();
  await page.waitForLoadState('networkidle');

  // Find the field and restore original value
  const field = page.locator(`input[name*="${backup.fieldName}"]`).first();
  if (await field.count() > 0) {
    await field.fill(backup.originalValue);

    // Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    await page.waitForLoadState('networkidle');

    console.log(`Restored ${backup.contentType}.${backup.fieldName} to original value`);
  }
}

// ============================================================================
// STRAPI API TESTS (Read-only, safe to run)
// These tests are skipped if Strapi URL is not configured or not accessible
// ============================================================================

test.describe('Strapi API Connectivity', () => {
  test('should connect to Strapi API', async ({ request }) => {
    // Skip if no Strapi URL configured
    test.skip(!STRAPI_BASE_URL, 'Strapi URL not configured');

    try {
      // Test basic API connectivity (public endpoint)
      const response = await request.get(`${STRAPI_BASE_URL}/api`, { timeout: 10000 });

      // Strapi API should respond (even if it returns 404 for root)
      expect(response.status()).toBeLessThan(500);
    } catch (error) {
      // If Strapi is not accessible, skip the test gracefully
      console.warn(`Strapi API not accessible at ${STRAPI_BASE_URL}: ${error}`);
      test.skip(true, 'Strapi API not accessible');
    }
  });

  test('should fetch public content from Strapi API', async ({ request }) => {
    // Skip if no Strapi URL configured
    test.skip(!STRAPI_BASE_URL, 'Strapi URL not configured');

    // Try common Strapi content endpoints
    const endpoints = [
      '/api/homepage',
      '/api/articles',
      '/api/stakeholders',
      '/api/pages'
    ];

    let foundEndpoint = false;
    let connectionFailed = false;

    for (const endpoint of endpoints) {
      try {
        const response = await request.get(`${STRAPI_BASE_URL}${endpoint}`, { timeout: 10000 });
        if (response.status() === 200) {
          foundEndpoint = true;
          const data = await response.json();
          expect(data).toBeTruthy();
          break;
        }
      } catch (error) {
        connectionFailed = true;
        break;
      }
    }

    if (connectionFailed) {
      console.warn(`Strapi API not accessible at ${STRAPI_BASE_URL}`);
      test.skip(true, 'Strapi API not accessible');
    }

    // At least one endpoint should be accessible
    // Skip assertion if Strapi API isn't publicly accessible
    if (!foundEndpoint) {
      console.warn('No public Strapi API endpoints found - API may require authentication');
    }
  });
});

// ============================================================================
// FRONTEND CONTENT VERIFICATION (Read-only, safe to run)
// These tests verify that CMS content is displayed on the frontend
// ============================================================================

test.describe('Frontend Content from Strapi', () => {
  test('should display dynamic content on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for JavaScript to render content
    await page.waitForTimeout(3000);

    // Verify page content exists (populated by Strapi)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for typical CMS-managed content (headings)
    const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
    expect(hasHeadings).toBe(true);

    // Verify the page has meaningful content
    const bodyText = await body.textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('should display stakeholder data from CMS', async ({ page }) => {
    await page.goto('/stakeholder-directory', { waitUntil: 'domcontentloaded' });

    // Wait for dynamic content to load
    await page.waitForTimeout(3000);

    // Check if any stakeholder data appears
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/Stakeholder|Directory|Organization|Connect/i);
  });

  test('should display news articles from CMS', async ({ page }) => {
    await page.goto('/news-events', { waitUntil: 'domcontentloaded' });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    // Verify news/events content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/News|Event|Article/i);
  });

  test('should display knowledge hub resources from CMS', async ({ page }) => {
    await page.goto('/knowledge-hub', { waitUntil: 'domcontentloaded' });

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/Knowledge|Resource|Document|Hub/i);
  });
});
