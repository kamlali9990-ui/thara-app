import { test, expect } from '@playwright/test';

test.describe('الصفحة الرئيسية', () => {
  test('تحميل الصفحة الرئيسية وعرض العناصر الأساسية', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await expect(page.locator('.app-tabbar')).toBeVisible();
    await expect(page.locator('.home-tab-container')).toBeVisible();
    await expect(page.locator('.app-header-new')).toBeVisible();
  });

  test('شريط التبويب السفلي يحتوي على جميع الأقسام', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    const tabs = ['الرئيسية', 'الأقسام', 'طلباتي', 'السلة', 'حسابي'];
    for (const tab of tabs) {
      await expect(page.locator('button.app-tab', { hasText: tab })).toBeVisible();
    }
  });

  test('زر البحث يعمل ويظهر النتائج', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    const searchInput = page.locator('input.app-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await expect(page.locator('.global-search-overlay')).toBeVisible();
    await searchInput.fill('');
    await expect(page.locator('.global-search-overlay')).not.toBeVisible();
  });

  test('التنقل بين التبويبات', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await page.locator('button.app-tab', { hasText: 'الأقسام' }).click();
    await expect(page.locator('.categories-tab')).toBeVisible();

    await page.locator('button.app-tab', { hasText: 'الرئيسية' }).click();
    await expect(page.locator('.home-tab-container')).toBeVisible();
  });

  test('عرض الأقسام في صفحة الأقسام', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);

    await page.locator('button.app-tab', { hasText: 'الأقسام' }).click();
    await page.waitForTimeout(1000);

    const categoryCards = page.locator('.category-tab-card');
    const count = await categoryCards.count();
    expect(count).toBeGreaterThan(1);
  });
});
