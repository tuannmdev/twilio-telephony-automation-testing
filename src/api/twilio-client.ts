import * as dotenv from "dotenv";
import Twilio from "twilio";

dotenv.config();

export class TwilioClient {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private client: any;

  public constructor(accountSid?: string, authToken?: string, phoneNumber?: string) {
    // Check if explicit empty values were passed (not undefined)
    const sidProvided = accountSid !== undefined;
    const tokenProvided = authToken !== undefined;
    const phoneProvided = phoneNumber !== undefined;

    // If any parameter is explicitly passed as empty string, throw error
    if ((sidProvided && !accountSid) || (tokenProvided && !authToken) || (phoneProvided && !phoneNumber)) {
      throw new Error("Missing required Twilio credentials");
    }

    this.accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.phoneNumber = phoneNumber || process.env.TWILIO_PHONE_NUMBER || "";

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      throw new Error("Missing required Twilio credentials");
    }

    // Validate account SID format before passing to Twilio SDK
    if (!this.accountSid.startsWith("AC")) {
      throw new Error("Invalid account SID format: must start with AC");
    }

    this.client = Twilio(this.accountSid, this.authToken);
  }

  public async makeCall(toNumber: string, twimlUrl: string): Promise<any> {
    try {
      const call = await this.client.calls.create({
        to: toNumber,
        from: this.phoneNumber,
        url: twimlUrl
      });
      return call;
    } catch (error: any) {
      throw new Error(`Failed to make call: ${error.message}`);
    }
  }

  public async getCallStatus(callSid: string): Promise<any> {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error: any) {
      throw new Error(`Failed to get call status: ${error.message}`);
    }
  }

  public async endCall(callSid: string): Promise<any> {
    try {
      const call = await this.client.calls(callSid).update({
        status: "completed"
      });
      return call;
    } catch (error: any) {
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  public async getCallLogs(limit: number = 20): Promise<any[]> {
    try {
      const calls = await this.client.calls.list({ limit });
      return calls;
    } catch (error: any) {
      throw new Error(`Failed to get call logs: ${error.message}`);
    }
  }

  public async makeCallWithRetry(
    toNumber: string,
    twimlUrl: string,
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeCall(toNumber, twimlUrl);
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    throw lastError || new Error("Failed to make call after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getAccountSid(): string {
    return this.accountSid;
  }

  public getPhoneNumber(): string {
    return this.phoneNumber;
  }
}
