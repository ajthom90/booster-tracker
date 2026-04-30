import { expect, test } from '@playwright/test';

test('clicking a booster serial opens its detail page', async ({ page }) => {
	await page.goto('/boosters');
	const firstSerialLink = page.locator('tbody tr td a').first();
	const serial = (await firstSerialLink.textContent())?.trim() ?? '';
	expect(serial).toMatch(/^[A-Z0-9-]+$/i);
	await firstSerialLink.click();
	await expect(page).toHaveURL(new RegExp(`/boosters/${serial}`));
	// Detail page H1 includes the serial
	await expect(page.getByRole('heading', { level: 1 })).toContainText(serial);
});

test('non-existent booster returns 404', async ({ page }) => {
	const response = await page.goto('/boosters/NONEXISTENT_BOOSTER_XXX');
	expect(response?.status()).toBe(404);
});
