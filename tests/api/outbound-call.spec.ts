import { test, expect } from "@playwright/test";
import { MockTwilioClient } from "../../src/api/mock-twilio-client";
import { TestDataGenerator } from "../../src/utils/test-data";

test.describe("Outbound Call Tests", () => {
  let twilioClient: MockTwilioClient;

  test.beforeEach(() => {
    twilioClient = new MockTwilioClient();
  });

  test("should successfully create an outbound call", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    expect(call).toBeTruthy();
    expect(call.sid).toBeTruthy();
    expect(call.to).toBe(toNumber);
    expect(call.from).toBe(twilioClient.getPhoneNumber());
  });

  test("should validate call SID format starts with CA", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    expect(call.sid).toMatch(/^CA/);
    expect(call.sid.length).toBe(34);
    expect(TestDataGenerator.isValidCallSid(call.sid)).toBe(true);
  });

  test("should handle invalid phone number", async () => {
    const invalidNumber = "invalid";
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    await expect(async () => {
      await twilioClient.makeCall(invalidNumber, twimlUrl);
    }).rejects.toThrow();
  });

  test("should handle call to busy number", async () => {
    const busyNumber = TestDataGenerator.getBusyPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(busyNumber, twimlUrl);

    expect(call).toBeTruthy();
    expect(call.sid).toBeTruthy();

    // Wait a moment for status to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    const callStatus = await twilioClient.getCallStatus(call.sid);
    expect(["busy", "failed", "queued", "ringing"]).toContain(callStatus.status);
  });

  test("should include required call parameters", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    expect(call.sid).toBeTruthy();
    expect(call.to).toBeTruthy();
    expect(call.from).toBeTruthy();
    expect(call.status).toBeTruthy();
    expect(call.direction).toBe("outbound-api");
  });

  test("should retry failed calls with retry mechanism", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCallWithRetry(toNumber, twimlUrl, 2);

    expect(call).toBeTruthy();
    expect(call.sid).toBeTruthy();
  });
});
