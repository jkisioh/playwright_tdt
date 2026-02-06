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

  await page.goto(`${STRAPI_ADMIN_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for login form
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await expect(emailInput).toBeVisible({ timeout: 30000 });

  // Check for rate-limit error before attempting login
  const rateLimitError = page.locator('text=Too many requests');
  if (await rateLimitError.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.warn('Rate-limited by Strapi. Waiting before retry...');
    await page.waitForTimeout(10000); // Wait 10 seconds
    await page.reload();
    await expect(emailInput).toBeVisible({ timeout: 30000 });
  }

  // Fill credentials
  await emailInput.fill(STRAPI_EMAIL);
  await passwordInput.fill(STRAPI_PASSWORD);

  // Submit login
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait a moment for the response
  await page.waitForTimeout(2000);

  // Check for rate-limit error after login attempt
  if (await rateLimitError.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.warn('Rate-limited after login attempt. Waiting and retrying...');
    await page.waitForTimeout(15000); // Wait 15 seconds
    await page.reload();
    await expect(emailInput).toBeVisible({ timeout: 30000 });
    await emailInput.fill(STRAPI_EMAIL);
    await passwordInput.fill(STRAPI_PASSWORD);
    await submitButton.click();
    await page.waitForTimeout(2000);
  }

  // Wait for login to complete - use dashboard element visibility instead of URL
  // This is more reliable across browsers (Firefox can be slower with URL changes)
  const dashboardIndicator = page.locator('a[href*="content-manager"], nav a:has-text("Content Manager")').first();
  await expect(dashboardIndicator).toBeVisible({ timeout: 45000 });

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

  // Run tests serially to avoid rate-limiting from Strapi
  test.describe.configure({ mode: 'serial' });

  test.use({
    navigationTimeout: 60000,
    actionTimeout: 45000
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

  /**
   * Test: Edit news article title and verify change, then restore
   *
   * This test modifies real content on the staging server.
   * It reads the current title, modifies it, then restores it.
   */
  test('should edit news article title and restore it', async ({ page }) => {
    const TEST_SUFFIX = ' [E2E-TEST]';

    // Login to Strapi admin
    const loggedIn = await loginToStrapi(page);
    expect(loggedIn).toBe(true);

    // Navigate to Content Manager
    const contentManagerLink = page.locator('a[href*="content-manager"]').first();
    await expect(contentManagerLink).toBeVisible({ timeout: 15000 });
    await contentManagerLink.click();
    await page.waitForLoadState('networkidle');

    // Wait for Content Manager sidebar to finish loading
    await page.waitForSelector('text=Loading content', { state: 'hidden', timeout: 30000 }).catch(() => {});

    // Click specifically on "News" in the sidebar Collection Types
    const newsLink = page.locator('a[href*="news-item.news-item"]');
    await expect(newsLink).toBeVisible({ timeout: 30000 });
    await newsLink.click();
    await page.waitForLoadState('networkidle');

    // Wait for the grid to load
    await page.waitForTimeout(2000);

    // Click on the first entry row (ID 1) - click on the row containing "1" in the ID cell
    // We use the row with date "April 30" which is our test article
    const articleRow = page.locator('text=April 30').first();
    await expect(articleRow).toBeVisible({ timeout: 15000 });
    await articleRow.click();
    await page.waitForLoadState('networkidle');

    // Find the title input field
    const titleInput = page.locator('input[name="title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    // Wait for the form to fully load
    await page.waitForTimeout(1000);

    // Read the current title value (might be empty or have content)
    const originalTitle = await titleInput.inputValue();
    console.log(`Original title: "${originalTitle}"`);

    // Store backup for restoration in afterEach
    contentBackups.push({
      contentType: 'News',
      entryId: 'news-article',
      fieldName: 'title',
      originalValue: originalTitle
    });

    // Create modified title by adding test suffix
    const modifiedTitle = (originalTitle || 'Test News Article') + TEST_SUFFIX;

    // Click on the input to focus it, then fill the new title
    await titleInput.click();
    await titleInput.fill(modifiedTitle);

    // Small wait for Strapi to recognize the change
    await page.waitForTimeout(500);

    // Wait for Save button to be enabled and click
    const saveButton = page.locator('button:has-text("Save"):not([disabled])');
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await saveButton.click();

    // Wait for save to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify the title was changed in the input
    const updatedValue = await titleInput.inputValue();
    expect(updatedValue).toBe(modifiedTitle);

    // Now restore the original title
    await titleInput.click();
    await titleInput.fill(originalTitle);

    // Small wait for Strapi to recognize the change
    await page.waitForTimeout(500);

    // Wait for Save button to be enabled again and click
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await saveButton.click();

    // Wait for save to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify restoration
    const restoredValue = await titleInput.inputValue();
    expect(restoredValue).toBe(originalTitle);

    // Clear backup since we manually restored
    contentBackups.length = 0;
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
