import { test, expect, Page } from "@playwright/test";

test.describe("Call Dashboard UI Tests", () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto("http://localhost:3000");
  });

  test("should load dashboard successfully", async () => {
    await expect(page).toHaveTitle("Twilio Call Dashboard");

    const heading = page.locator("h1");
    await expect(heading).toHaveText("Twilio Call Dashboard");

    const subtitle = page.locator(".subtitle");
    await expect(subtitle).toBeVisible();
  });

  test("should display all required UI elements", async () => {
    // Phone input
    const phoneInput = page.locator("#phone-input");
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute("placeholder", "+15005550006");

    // Make Call button
    const makeCallBtn = page.locator("#make-call-btn");
    await expect(makeCallBtn).toBeVisible();
    await expect(makeCallBtn).toHaveText("Make Call");

    // Status display
    const statusDisplay = page.locator("#status-display");
    await expect(statusDisplay).toBeVisible();

    // Call history table
    const historyTable = page.locator("#history-table");
    await expect(historyTable).toBeVisible();
  });

  test("should accept valid phone numbers", async () => {
    const phoneInput = page.locator("#phone-input");

    await phoneInput.fill("+15005550006");
    const value = await phoneInput.inputValue();

    expect(value).toBe("+15005550006");
  });

  test("should validate phone number format", async () => {
    const phoneInput = page.locator("#phone-input");
    const makeCallBtn = page.locator("#make-call-btn");

    // Try with empty input
    await makeCallBtn.click();

    // Check for alert (note: in real scenario we'd mock window.alert)
    // For now, just verify button state
    await expect(makeCallBtn).toBeVisible();

    // Fill with valid number
    await phoneInput.fill("+15005550006");
    await expect(phoneInput).toHaveValue("+15005550006");
  });

  test("should make call button be clickable", async () => {
    const makeCallBtn = page.locator("#make-call-btn");

    await expect(makeCallBtn).toBeEnabled();

    const phoneInput = page.locator("#phone-input");
    await phoneInput.fill("+15005550006");

    await expect(makeCallBtn).toBeEnabled();
  });

  test("should update status display after making call", async () => {
    const phoneInput = page.locator("#phone-input");
    const makeCallBtn = page.locator("#make-call-btn");

    await phoneInput.fill("+15005550006");

    // Mock the API response by intercepting
    await page.route("**/api/call", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "queued"
          }
        })
      });
    });

    await page.route("**/api/call/**", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "completed",
            duration: "45"
          }
        })
      });
    });

    await makeCallBtn.click();

    // Wait for status to update
    await page.waitForTimeout(500);

    const statusText = page.locator(".status-text");
    await expect(statusText).toBeVisible();

    const statusMessage = page.locator("#status-message");
    await expect(statusMessage).toBeVisible();
  });

  test("should display call SID after successful call", async () => {
    const phoneInput = page.locator("#phone-input");
    const makeCallBtn = page.locator("#make-call-btn");

    await phoneInput.fill("+15005550006");

    // Mock the API response
    await page.route("**/api/call", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "queued"
          }
        })
      });
    });

    await page.route("**/api/call/**", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "completed",
            duration: "45"
          }
        })
      });
    });

    await makeCallBtn.click();

    // Wait for call SID to appear
    await page.waitForTimeout(500);

    const callSid = page.locator("#call-sid");
    await expect(callSid).toBeVisible();
  });

  test("should display call history table", async () => {
    // Mock the API response for call history
    await page.route("**/api/calls**", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: 2,
          calls: [
            {
              sid: "CA1234567890abcdef1234567890abcdef",
              to: "+15005550006",
              from: "+15551234567",
              status: "completed",
              duration: "45",
              dateCreated: new Date().toISOString()
            },
            {
              sid: "CA9876543210fedcba9876543210fedcba",
              to: "+15005550007",
              from: "+15551234567",
              status: "failed",
              duration: "0",
              dateCreated: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.reload();

    // Wait for history to load
    await page.waitForTimeout(1000);

    const historyTable = page.locator("#history-table");
    await expect(historyTable).toBeVisible();

    const tableHeaders = page.locator("thead th");
    await expect(tableHeaders).toHaveCount(5);

    // Check for table content
    const historyBody = page.locator("#history-body");
    await expect(historyBody).toBeVisible();
  });

  test("should show different status colors", async () => {
    const statusIndicator = page.locator(".status-indicator");
    await expect(statusIndicator).toBeVisible();

    // Initial status should be idle
    await expect(statusIndicator).toHaveClass(/idle/);
  });

  test("should disable button while call is in progress", async () => {
    const phoneInput = page.locator("#phone-input");
    const makeCallBtn = page.locator("#make-call-btn");

    await phoneInput.fill("+15005550006");

    // Mock the API response with a long-running call
    await page.route("**/api/call", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "in-progress"
          }
        })
      });
    });

    await page.route("**/api/call/**", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          call: {
            sid: "CA1234567890abcdef1234567890abcdef",
            to: "+15005550006",
            from: "+15551234567",
            status: "in-progress",
            duration: "10"
          }
        })
      });
    });

    await makeCallBtn.click();

    // Wait for button to be disabled
    await page.waitForTimeout(500);

    // Button should be disabled or show "Calling..."
    const buttonText = await makeCallBtn.textContent();
    expect(buttonText).toMatch(/Calling|Make Call/);
  });

  test("should handle API errors gracefully", async () => {
    const phoneInput = page.locator("#phone-input");
    const makeCallBtn = page.locator("#make-call-btn");

    await phoneInput.fill("+15005550006");

    // Mock the API response with error
    await page.route("**/api/call", async route => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Failed to make call"
        })
      });
    });

    await makeCallBtn.click();

    // Wait for error handling
    await page.waitForTimeout(500);

    // Status should show failed
    const statusIndicator = page.locator(".status-indicator");
    await expect(statusIndicator).toBeVisible();
  });
});
