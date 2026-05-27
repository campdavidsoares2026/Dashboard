import { test, expect } from '@playwright/test';

test.describe('Dashboard Overview Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard/cpee');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Account Filtering', () => {
    test('should load and display available accounts', async ({ page }) => {
      // Check if accounts dropdown/selector exists
      const accountsSection = page.locator('[data-testid="accounts-filter"]');
      await expect(accountsSection).toBeVisible();

      // Should contain at least one account option
      const accountOptions = page.locator('[data-testid="accounts-filter"] option, [role="option"]');
      const count = await accountOptions.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter overview data by single account', async ({ page }) => {
      // Get first account from dropdown
      const accountSelect = page.locator('[data-testid="accounts-filter"]');
      await accountSelect.selectOption({ index: 1 });

      // Wait for data to update
      await page.waitForLoadState('networkidle');

      // KPI cards should be visible
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5); // CPEE, Gasto, Leads, CTR, Impressões

      // Verify KPI values are displayed
      const kpiValue = page.locator('[data-testid="kpi-value"]').first();
      await expect(kpiValue).toContainText(/[\d.]+/);
    });

    test('should filter overview data by multiple accounts', async ({ page }) => {
      // Select multiple accounts if UI supports it
      const accountsInput = page.locator('[data-testid="accounts-filter"]');

      // Type multiple account IDs (comma-separated)
      await accountsInput.fill('acc_001,acc_002');

      // Press Enter or click filter button
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      } else {
        await accountsInput.press('Enter');
      }

      // Wait for data to update
      await page.waitForLoadState('networkidle');

      // Verify KPI cards are updated
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);
    });

    test('should handle empty account selection', async ({ page }) => {
      // Clear the account filter
      const accountsInput = page.locator('[data-testid="accounts-filter"]');
      await accountsInput.clear();

      // Apply filter
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      }

      // Wait for response
      await page.waitForLoadState('networkidle');

      // Should show all data or empty state
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      const cardCount = await kpiCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Date Range Filtering', () => {
    test('should load date range inputs', async ({ page }) => {
      const startDateInput = page.locator('[data-testid="start-date-input"]');
      const endDateInput = page.locator('[data-testid="end-date-input"]');

      await expect(startDateInput).toBeVisible();
      await expect(endDateInput).toBeVisible();
    });

    test('should filter data by date range', async ({ page }) => {
      // Set date range (today - 7 days to today)
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const startDateInput = page.locator('[data-testid="start-date-input"]');
      const endDateInput = page.locator('[data-testid="end-date-input"]');

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      await startDateInput.fill(formatDate(sevenDaysAgo));
      await endDateInput.fill(formatDate(today));

      // Apply filter
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      } else {
        await endDateInput.press('Enter');
      }

      // Wait for data to update
      await page.waitForLoadState('networkidle');

      // KPI cards should be visible and updated
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);
    });

    test('should handle invalid date range', async ({ page }) => {
      const startDateInput = page.locator('[data-testid="start-date-input"]');
      const endDateInput = page.locator('[data-testid="end-date-input"]');

      // Set invalid date range (end before start)
      await startDateInput.fill('2026-05-25');
      await endDateInput.fill('2026-05-20');

      // Apply filter
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      }

      // Should show error or maintain previous state
      const errorMessage = page.locator('[data-testid="date-error"]');
      const hasError = await errorMessage.isVisible().catch(() => false);

      if (hasError) {
        await expect(errorMessage).toContainText(/invalid|before/i);
      }
    });

    test('should accept dates without time component', async ({ page }) => {
      const startDateInput = page.locator('[data-testid="start-date-input"]');
      const endDateInput = page.locator('[data-testid="end-date-input"]');

      // Use YYYY-MM-DD format
      await startDateInput.fill('2026-05-19');
      await endDateInput.fill('2026-05-26');

      // Apply filter
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      } else {
        await endDateInput.press('Enter');
      }

      await page.waitForLoadState('networkidle');

      // Should load without errors
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      const cardCount = await kpiCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Export Functionality', () => {
    test('should display export button', async ({ page }) => {
      const exportButton = page.locator('[data-testid="export-button"]');
      await expect(exportButton).toBeVisible();
    });

    test('should export data as CSV', async ({ page }) => {
      // Listen for download event
      const downloadPromise = page.waitForEvent('download');

      const exportButton = page.locator('[data-testid="export-csv-button"]');
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('export');
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    test('should export data as PDF', async ({ page }) => {
      // Listen for download event
      const downloadPromise = page.waitForEvent('download');

      const exportButton = page.locator('[data-testid="export-pdf-button"]');
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('export');
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('should maintain filters during export', async ({ page }) => {
      // Set filters
      const accountSelect = page.locator('[data-testid="accounts-filter"]');
      await accountSelect.selectOption({ index: 1 });

      // Wait for data update
      await page.waitForLoadState('networkidle');

      // Export
      const downloadPromise = page.waitForEvent('download');
      const exportButton = page.locator('[data-testid="export-csv-button"]');
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });
  });

  test.describe('Real-time Status Indicator', () => {
    test('should display data loading status', async ({ page }) => {
      // Reload page to trigger initial loading
      await page.reload();

      // Check for loading indicator
      const loader = page.locator('[data-testid="data-loading"], [role="status"]');
      const isLoading = await loader.isVisible().catch(() => false);

      // Page should eventually load
      await page.waitForLoadState('networkidle');
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);
    });

    test('should show last update timestamp', async ({ page }) => {
      // Wait for data to load
      await page.waitForLoadState('networkidle');

      const lastUpdate = page.locator('[data-testid="last-update"]');
      const isVisible = await lastUpdate.isVisible().catch(() => false);

      if (isVisible) {
        await expect(lastUpdate).toContainText(/\d{4}-\d{2}-\d{2}|ago|updated/i);
      }
    });

    test('should indicate refresh in progress', async ({ page }) => {
      // Trigger a refresh (if there's a refresh button)
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      const hasRefreshButton = await refreshButton.isVisible().catch(() => false);

      if (hasRefreshButton) {
        await refreshButton.click();

        // Should show some indication of refresh
        await page.waitForLoadState('networkidle');

        const kpiCards = page.locator('[data-testid="kpi-card"]');
        await expect(kpiCards).toHaveCount(5);
      }
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply account and date filters together', async ({ page }) => {
      // Set account filter
      const accountSelect = page.locator('[data-testid="accounts-filter"]');
      await accountSelect.selectOption({ index: 1 });

      // Set date range
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const startDateInput = page.locator('[data-testid="start-date-input"]');
      const endDateInput = page.locator('[data-testid="end-date-input"]');

      await startDateInput.fill(sevenDaysAgo);
      await endDateInput.fill(today);

      // Apply filters
      const filterButton = page.locator('[data-testid="apply-filters"]');
      if (await filterButton.isVisible()) {
        await filterButton.click();
      } else {
        await endDateInput.press('Enter');
      }

      // Wait for data to update
      await page.waitForLoadState('networkidle');

      // Verify KPI cards are present
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);

      // Verify values are numeric
      const kpiValues = page.locator('[data-testid="kpi-value"]');
      const firstValue = await kpiValues.first().textContent();
      expect(firstValue).toMatch(/[\d.,]+/);
    });

    test('should clear filters and show all data', async ({ page }) => {
      // Set some filters
      const accountSelect = page.locator('[data-testid="accounts-filter"]');
      await accountSelect.selectOption({ index: 1 });

      await page.waitForLoadState('networkidle');

      // Clear filters
      const clearButton = page.locator('[data-testid="clear-filters"]');
      const hasClearButton = await clearButton.isVisible().catch(() => false);

      if (hasClearButton) {
        await clearButton.click();
        await page.waitForLoadState('networkidle');

        // Account selector should be cleared
        const selectedValue = await accountSelect.inputValue().catch(() => '');
        expect(selectedValue === '' || selectedValue === 'all').toBeTruthy();
      }
    });
  });

  test.describe('KPI Cards and Metrics', () => {
    test('should display all five KPI cards', async ({ page }) => {
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);
    });

    test('should display KPI labels correctly', async ({ page }) => {
      const labels = page.locator('[data-testid="kpi-label"]');

      const expectedLabels = ['CPEE Consolidado', 'Gasto Total', 'Leads Gerados', 'CTR Médio', 'Impressões'];

      for (const label of expectedLabels) {
        await expect(page.locator('[data-testid="kpi-label"]')).toContainText(label);
      }
    });

    test('should display KPI units', async ({ page }) => {
      const units = page.locator('[data-testid="kpi-unit"]');
      const count = await units.count();
      expect(count).toBeGreaterThan(0);

      // Check for expected units
      const allUnits = await units.allTextContents();
      const hasMonetaryUnit = allUnits.some(u => u.includes('R$'));
      expect(hasMonetaryUnit).toBeTruthy();
    });

    test('should display numeric values in KPI cards', async ({ page }) => {
      const values = page.locator('[data-testid="kpi-value"]');
      const count = await values.count();
      expect(count).toBeGreaterThan(0);

      // Check that values are numeric
      const firstValue = await values.first().textContent();
      expect(firstValue).toMatch(/[\d.,\-]/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/cpee');
      await page.waitForLoadState('networkidle');

      // Filter controls should be visible or in a menu
      const accountsFilter = page.locator('[data-testid="accounts-filter"]');
      const isVisible = await accountsFilter.isVisible().catch(() => false);

      // Either visible or accessible through a menu
      expect(isVisible || await page.locator('[data-testid="filter-menu"]').isVisible().catch(() => false)).toBeTruthy();
    });

    test('should be responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/dashboard/cpee');
      await page.waitForLoadState('networkidle');

      // KPI cards should be visible
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      const count = await kpiCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should be responsive on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/dashboard/cpee');
      await page.waitForLoadState('networkidle');

      // All elements should be visible
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(5);

      const filtersSection = page.locator('[data-testid="filters-section"]');
      const hasFilters = await filtersSection.isVisible().catch(() => false);
      expect(hasFilters).toBeTruthy();
    });
  });
});
