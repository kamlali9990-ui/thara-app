import { test, expect } from '@playwright/test';

test.describe('سلة المشتريات', () => {
  test('فتح السلة تظهر رسالة "السلة فارغة"', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await page.locator('button.app-tab', { hasText: 'السلة' }).click();
    await expect(page.locator('.cart-screen-body')).toBeVisible();
    await expect(page.locator('.cart-screen-empty')).toBeVisible();
  });

  test('إغلاق السلة بالضغط على الخلفية', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await page.locator('button.app-tab', { hasText: 'السلة' }).click();
    await expect(page.locator('.cart-screen-overlay')).toBeVisible();
    await page.locator('.cart-screen-overlay').click({ position: { x: 10, y: 10 } });
  });

  test('زر تأكيد الطلب معطل عندما السلة فارغة', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await page.locator('button.app-tab', { hasText: 'السلة' }).click();
    await expect(page.locator('button.cart-screen-checkout-btn')).toBeDisabled();
  });
});
