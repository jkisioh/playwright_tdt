import { test, expect } from '@playwright/test';

// Configuration for Strapi API
const STRAPI_URL = 'https://tdt.akvotest.org/cms/admin'; 
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const CONTENT_ID = '1'; // The ID of the content entry to test

test.describe('TDT Functional Tests', () => {

  test('Navigate and check static content', async ({ page }) => {
    await page.goto('https://tdt.akvotest.org/');
    
    // Check key static content (adjust selectors based on your actual site)
    await expect(page).toHaveTitle(/Akvotest/i); 
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check interactivity: Navigation links
    const aboutLink = page.getByRole('link', { name: /About/i });
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
    }
  });

  test('Strapi Content Change & Sync Verification', async ({ page, request }) => {
    const originalTitle = "Original Heading";
    const testTitle = `Automated Test Title ${Date.now()}`;

    // 1. Change content in Strapi via API
    const updateResponse = await request.put(`${STRAPI_URL}/api/articles/${CONTENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: { data: { title: testTitle } }
    });
    expect(updateResponse.ok()).toBeTruthy();

    // 2. Check the frontend result
    await page.goto('https://tdt.akvotest.org/');
    // Verify the UI shows the new title (update selector to your specific element)
    await expect(page.locator('h1')).toContainText(testTitle);

    // 3. Change it back (Teardown)
    const revertResponse = await request.put(`${STRAPI_URL}/api/articles/${CONTENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
      },
      data: { data: { title: originalTitle } }
    });
    expect(revertResponse.ok()).toBeTruthy();
  });
});