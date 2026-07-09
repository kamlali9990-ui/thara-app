import { test, expect } from '@playwright/test';

test.describe('لوحة التحكم', () => {
  test('التنقل إلى /admin يظهر صفحة تسجيل الدخول', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const isLoginForm = await page.locator('input[type="password"], input[type="email"], .admin-confirm-dialog, .auth-input').count();
    expect(isLoginForm).toBeGreaterThan(0);
  });

  test('زيارة /admin لا تظهر 404', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.status()).toBeLessThan(400);
  });

  test('زر العودة للمتجر موجود في Admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const storeLink = page.locator('a:has-text("المتجر"), a:has-text("العودة للمتجر")');
    await expect(storeLink).toBeVisible();
  });
});
