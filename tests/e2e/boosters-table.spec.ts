import { expect, test } from '@playwright/test';

test('boosters page renders with the table', async ({ page }) => {
	await page.goto('/boosters');
	await expect(page).toHaveTitle(/Boosters/);
	await expect(page.getByRole('heading', { name: 'Boosters' })).toBeVisible();
	// At least one body row in the table
	await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('clicking a sort header updates the URL', async ({ page }) => {
	await page.goto('/boosters');
	// Column headers are uppercase; match case-insensitively
	const flightsHeader = page.getByRole('columnheader').filter({ hasText: /Flights/i });
	await flightsHeader.click();
	await expect(page).toHaveURL(/\?v=/);
});

test('export menu produces a CSV link with the current view state', async ({ page }) => {
	await page.goto('/boosters');
	// The Export button toggles a dropdown
	await page.getByRole('button', { name: /Export/i }).click();
	const csv = page.getByRole('link', { name: /CSV/i });
	await expect(csv).toBeVisible();
	const href = await csv.getAttribute('href');
	expect(href).toMatch(/^\/api\/boosters\/export\?format=csv/);
});
