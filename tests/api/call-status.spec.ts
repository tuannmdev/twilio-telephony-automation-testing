import { test, expect } from "@playwright/test";
import { MockTwilioClient } from "../../src/api/mock-twilio-client";
import { TestDataGenerator } from "../../src/utils/test-data";

test.describe("Call Status Tests", () => {
  let twilioClient: MockTwilioClient;

  test.beforeEach(() => {
    twilioClient = new MockTwilioClient();
  });

  test("should retrieve call status by SID", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);
    const callStatus = await twilioClient.getCallStatus(call.sid);

    expect(callStatus).toBeTruthy();
    expect(callStatus.sid).toBe(call.sid);
    expect(callStatus.status).toBeTruthy();
  });

  test("should validate status transitions", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    // Initial status should be queued
    expect(["queued", "ringing", "in-progress"]).toContain(call.status);
    expect(TestDataGenerator.isValidCallStatus(call.status)).toBe(true);

    // Wait for status to potentially change
    await new Promise(resolve => setTimeout(resolve, 3000));

    const updatedCall = await twilioClient.getCallStatus(call.sid);
    expect(TestDataGenerator.isValidCallStatus(updatedCall.status)).toBe(true);
  });

  test("should track call duration for completed calls", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    // Wait for call to progress
    await new Promise(resolve => setTimeout(resolve, 5000));

    const callStatus = await twilioClient.getCallStatus(call.sid);

    expect(callStatus.duration).toBeDefined();
    if (callStatus.status === "completed") {
      expect(parseInt(callStatus.duration)).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle failed call status", async () => {
    const invalidNumber = TestDataGenerator.getInvalidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    try {
      const call = await twilioClient.makeCall(invalidNumber, twimlUrl);

      // Wait for status update
      await new Promise(resolve => setTimeout(resolve, 3000));

      const callStatus = await twilioClient.getCallStatus(call.sid);
      expect(["failed", "busy", "no-answer", "canceled"]).toContain(callStatus.status);
    } catch (error: any) {
      // Expected for invalid numbers
      expect(error.message).toContain("Failed to make call");
    }
  });

  test("should retrieve multiple call logs", async () => {
    // Create some calls first
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    await twilioClient.makeCall(toNumber, twimlUrl);
    await twilioClient.makeCall(toNumber, twimlUrl);
    await twilioClient.makeCall(toNumber, twimlUrl);

    const calls = await twilioClient.getCallLogs(5);

    expect(Array.isArray(calls)).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThanOrEqual(5);

    const firstCall = calls[0];
    expect(firstCall.sid).toBeTruthy();
    expect(firstCall.status).toBeTruthy();
    expect(TestDataGenerator.isValidCallSid(firstCall.sid)).toBe(true);
  });

  test("should end an active call", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);

    // Wait for call to be in progress
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endedCall = await twilioClient.endCall(call.sid);

    expect(endedCall).toBeTruthy();
    expect(endedCall.status).toBe("completed");
  });

  test("should validate call metadata fields", async () => {
    const toNumber = TestDataGenerator.getValidPhoneNumber();
    const twimlUrl = TestDataGenerator.SIMPLE_TWIML_URL;

    const call = await twilioClient.makeCall(toNumber, twimlUrl);
    const callStatus = await twilioClient.getCallStatus(call.sid);

    expect(callStatus.sid).toBeTruthy();
    expect(callStatus.accountSid).toBeTruthy();
    expect(callStatus.to).toBeTruthy();
    expect(callStatus.from).toBeTruthy();
    expect(callStatus.status).toBeTruthy();
    expect(callStatus.direction).toBeTruthy();
    expect(callStatus.dateCreated).toBeTruthy();
  });
});
