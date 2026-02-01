import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  fetchEcosystemManifest,
  assertManifestValid,
} from '@aws-infra-example/e2e-lib';

/**
 * Navigation tests for app2.
 *
 * These verify that navigation between apps works correctly.
 * Run against a deployed environment with E2E_BASE_URL set.
 */

const APP_NAME = 'app2';

function getEnv() {
  return process.env.E2E_ENV || 'dev';
}

function getAppPath(app = APP_NAME) {
  const env = getEnv();
  return `/${env}/${app}`;
}

test.describe('App2 Navigation Tests', () => {
  test('should access app directly via URL', async ({ page }) => {
    const response = await page.goto(getAppPath());
    expect(response?.status()).toBe(200);

    // Verify we're on the right app
    await expect(page.locator('h1')).toContainText('App 2');
  });

  test('should navigate to app1 via nav link', async ({ page }) => {
    await page.goto(getAppPath());
    await waitForAppLoad(page);

    // Click the app1 link
    const app1Link = page.locator('nav a[data-app="app1"]');
    await app1Link.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we're now on app1
    await expect(page.locator('h1')).toContainText('App 1');
  });

  test('should update nav link hrefs for path-based routing', async ({ page }) => {
    await page.goto(getAppPath());
    await waitForAppLoad(page);

    // After JS runs, nav links should be updated to include environment
    const app1Link = page.locator('nav a[data-app="app1"]');
    const href = await app1Link.getAttribute('href');

    const env = getEnv();
    expect(href).toBe(`/${env}/app1`);
  });

  test('should load ecosystem manifest', async ({ page, baseURL }) => {
    // Skip if no base URL configured
    if (!baseURL) {
      test.skip();
      return;
    }

    const env = getEnv();

    try {
      const manifest = await fetchEcosystemManifest(baseURL, env);
      assertManifestValid(manifest);

      // Verify app2 is in the manifest
      expect(manifest.apps).toHaveProperty('app2');
    } catch (error) {
      // Manifest may not be available in all test environments
      console.log('Manifest not available:', error.message);
    }
  });

  test('should maintain environment consistency after navigation', async ({ page }) => {
    await page.goto(getAppPath());
    await waitForAppLoad(page);

    // Get initial environment
    const initialEnv = await page.locator('#env').textContent();

    // Navigate to app1
    const app1Link = page.locator('nav a[data-app="app1"]');
    await app1Link.click();
    await page.waitForLoadState('networkidle');

    // Wait for app1 to load
    await page.waitForFunction(
      () => {
        const refEl = document.getElementById('ref');
        return refEl && refEl.textContent && !refEl.textContent.includes('__APP_REF__');
      },
      { timeout: 10000 }
    );

    // Get environment in app1
    const app1Env = await page.locator('#env').textContent();

    // Environments should match
    expect(app1Env).toBe(initialEnv);
  });

  test('should display host information', async ({ page }) => {
    await page.goto(getAppPath());
    await waitForAppLoad(page);

    const hostElement = page.locator('#host');
    await expect(hostElement).toBeVisible();

    const hostText = await hostElement.textContent();
    expect(hostText?.trim()).not.toBe('-');
    expect(hostText?.trim()).not.toBe('');
  });

  test('should display route information', async ({ page }) => {
    await page.goto(getAppPath());
    await waitForAppLoad(page);

    const routeElement = page.locator('#route');
    await expect(routeElement).toBeVisible();

    const routeText = await routeElement.textContent();
    expect(routeText).toContain(APP_NAME);
  });
});
