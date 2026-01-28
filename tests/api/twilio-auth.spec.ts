import { test, expect } from "@playwright/test";
import { TwilioClient } from "../../src/api/twilio-client";

test.describe("Twilio Authentication Tests", () => {
  test("should authenticate with valid credentials", async () => {
    const client = new TwilioClient();

    expect(client.getAccountSid()).toBeTruthy();
    expect(client.getAccountSid()).toMatch(/^AC[a-f0-9]{32}$/);
  });

  test("should reject authentication with invalid credentials", async () => {
    // Invalid SID format should throw immediately
    expect(() => {
      new TwilioClient("invalid_sid", "invalid_token", "+1234567890");
    }).toThrow("Invalid account SID format: must start with AC");

    // Valid SID format but invalid credentials should fail on API call
    const client = new TwilioClient("ACinvalid123456789012345678901234", "invalid_token", "+1234567890");

    await expect(async () => {
      await client.getCallLogs(1);
    }).rejects.toThrow();
  });

  test("should reject authentication with missing credentials", async () => {
    expect(() => {
      new TwilioClient("", "", "");
    }).toThrow("Missing required Twilio credentials");
  });

  test("should validate account SID format", async () => {
    const client = new TwilioClient();
    const accountSid = client.getAccountSid();

    expect(accountSid).toMatch(/^AC/);
    expect(accountSid.length).toBe(34);
  });

  test("should retrieve account phone number", async () => {
    const client = new TwilioClient();
    const phoneNumber = client.getPhoneNumber();

    expect(phoneNumber).toBeTruthy();
    expect(phoneNumber).toMatch(/^\+\d{10,15}$/);
  });
});
