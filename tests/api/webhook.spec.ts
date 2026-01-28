import { test, expect } from "@playwright/test";
import axios from "axios";
import { TestDataGenerator } from "../../src/utils/test-data";

test.describe("Webhook Tests", () => {
  // Server is managed by playwright.config.ts webServer configuration
  const baseUrl = "http://localhost:3000";

  test.beforeEach(async () => {
    // Clear webhooks before each test
    try {
      await axios.delete(`${baseUrl}/webhooks`);
    } catch {
      // Server might not be ready yet, ignore
    }
  });

  test("should receive voice webhook", async () => {
    const webhookPayload = {
      CallSid: TestDataGenerator.generateRandomCallSid(),
      CallStatus: "ringing",
      From: "+15005550006",
      To: "+15551234567",
      Direction: "inbound"
    };

    const response = await axios.post(`${baseUrl}/webhook/voice`, webhookPayload);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/xml");
    expect(response.data).toContain("<Response>");
    expect(response.data).toContain("<Say>");
  });

  test("should receive status callback webhook", async () => {
    const webhookPayload = {
      CallSid: TestDataGenerator.generateRandomCallSid(),
      CallStatus: "completed",
      From: "+15005550006",
      To: "+15551234567",
      CallDuration: "45"
    };

    const response = await axios.post(`${baseUrl}/webhook/status`, webhookPayload);

    expect(response.status).toBe(200);
    expect(response.data).toBe("OK");
  });

  test("should validate webhook payload fields", async () => {
    const callSid = TestDataGenerator.generateRandomCallSid();
    const webhookPayload = {
      CallSid: callSid,
      CallStatus: "in-progress",
      From: "+15005550006",
      To: "+15551234567"
    };

    await axios.post(`${baseUrl}/webhook/voice`, webhookPayload);

    const response = await axios.get(`${baseUrl}/webhooks`);

    expect(response.status).toBe(200);
    expect(response.data.count).toBeGreaterThan(0);

    const webhook = response.data.webhooks[0];
    expect(webhook.type).toBe("voice");
    expect(webhook.data.CallSid).toBe(callSid);
    expect(webhook.data.CallStatus).toBe("in-progress");
    expect(webhook.data.From).toBe("+15005550006");
    expect(webhook.data.To).toBe("+15551234567");
  });

  test("should validate Twilio signature when present", async () => {
    const webhookPayload = {
      CallSid: TestDataGenerator.generateRandomCallSid(),
      CallStatus: "completed"
    };

    const response = await axios.post(`${baseUrl}/webhook/status`, webhookPayload, {
      headers: {
        "X-Twilio-Signature": "valid_signature_hash"
      }
    });

    expect(response.status).toBe(200);

    const webhooksResponse = await axios.get(`${baseUrl}/webhooks`);
    const webhook = webhooksResponse.data.webhooks[0];
    expect(webhook.data.signatureValid).toBeDefined();
  });

  test("should store multiple webhooks", async () => {
    const webhook1 = TestDataGenerator.getWebhookPayload(
      TestDataGenerator.generateRandomCallSid(),
      "queued"
    );
    const webhook2 = TestDataGenerator.getWebhookPayload(
      TestDataGenerator.generateRandomCallSid(),
      "ringing"
    );
    const webhook3 = TestDataGenerator.getWebhookPayload(
      TestDataGenerator.generateRandomCallSid(),
      "completed"
    );

    await axios.post(`${baseUrl}/webhook/status`, webhook1);
    await axios.post(`${baseUrl}/webhook/status`, webhook2);
    await axios.post(`${baseUrl}/webhook/status`, webhook3);

    const response = await axios.get(`${baseUrl}/webhooks`);

    expect(response.status).toBe(200);
    expect(response.data.count).toBe(3);
    expect(response.data.webhooks.length).toBe(3);
  });

  test("should clear webhook history", async () => {
    const webhookPayload = TestDataGenerator.getWebhookPayload(
      TestDataGenerator.generateRandomCallSid(),
      "completed"
    );

    await axios.post(`${baseUrl}/webhook/status`, webhookPayload);

    let response = await axios.get(`${baseUrl}/webhooks`);
    expect(response.data.count).toBeGreaterThan(0);

    const clearResponse = await axios.delete(`${baseUrl}/webhooks`);
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.data.cleared).toBeGreaterThan(0);

    response = await axios.get(`${baseUrl}/webhooks`);
    expect(response.data.count).toBe(0);
  });

  test("should respond to health check", async () => {
    const response = await axios.get(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("healthy");
    expect(response.data.timestamp).toBeTruthy();
  });

  test("should handle concurrent webhooks", async () => {
    const webhookPromises = [];

    for (let i = 0; i < 10; i++) {
      const payload = TestDataGenerator.getWebhookPayload(
        TestDataGenerator.generateRandomCallSid(),
        "completed"
      );
      webhookPromises.push(axios.post(`${baseUrl}/webhook/status`, payload));
    }

    await Promise.all(webhookPromises);

    const response = await axios.get(`${baseUrl}/webhooks`);
    expect(response.data.count).toBe(10);
  });
});
