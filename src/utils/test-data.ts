export class TestDataGenerator {
  // Twilio magic test numbers for different scenarios
  public static readonly VALID_TEST_NUMBER = "+15005550006";
  public static readonly INVALID_TEST_NUMBER = "+15005550001";
  public static readonly BUSY_TEST_NUMBER = "+15005550004";
  public static readonly INTERNATIONAL_TEST_NUMBER = "+15005550003";
  public static readonly NO_ANSWER_TEST_NUMBER = "+15005550008";

  // TwiML URLs for testing
  public static readonly SIMPLE_TWIML_URL = "http://demo.twilio.com/docs/voice.xml";
  public static readonly CUSTOM_TWIML_URL = "https://handler.twilio.com/twiml/EH1234567890abcdef1234567890abcdef";

  // Test payloads
  public static getCallPayload(toNumber: string, fromNumber: string, twimlUrl?: string): any {
    return {
      to: toNumber,
      from: fromNumber,
      url: twimlUrl || this.SIMPLE_TWIML_URL
    };
  }

  public static getWebhookPayload(callSid: string, status: string): any {
    return {
      CallSid: callSid,
      CallStatus: status,
      From: "+15005550006",
      To: "+15551234567",
      Direction: "outbound-api",
      Timestamp: new Date().toISOString()
    };
  }

  public static getValidPhoneNumber(): string {
    return this.VALID_TEST_NUMBER;
  }

  public static getInvalidPhoneNumber(): string {
    return this.INVALID_TEST_NUMBER;
  }

  public static getBusyPhoneNumber(): string {
    return this.BUSY_TEST_NUMBER;
  }

  public static generateRandomCallSid(): string {
    const randomString = Math.random().toString(36).substring(2, 34);
    return `CA${randomString}`;
  }

  public static isValidCallSid(callSid: string): boolean {
    return callSid.startsWith("CA") && callSid.length === 34;
  }

  public static getCallStatusTransitions(): string[] {
    return ["queued", "ringing", "in-progress", "completed", "busy", "failed", "no-answer"];
  }

  public static isValidCallStatus(status: string): boolean {
    return this.getCallStatusTransitions().includes(status);
  }
}
