import { TestDataGenerator } from "../utils/test-data";

export interface MockCall {
  sid: string;
  accountSid: string;
  to: string;
  from: string;
  status: string;
  direction: string;
  duration: string;
  dateCreated: Date;
  startTime: Date | null;
  endTime: Date | null;
}

export class MockTwilioClient {
  private accountSid: string;
  private phoneNumber: string;
  private calls: Map<string, MockCall>;

  public constructor(accountSid?: string, _authToken?: string, phoneNumber?: string) {
    this.accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID || "ACmock12345678901234567890123456";
    this.phoneNumber = phoneNumber || process.env.TWILIO_PHONE_NUMBER || "+15551234567";
    this.calls = new Map();
  }

  public async makeCall(toNumber: string, _twimlUrl: string): Promise<MockCall> {
    // Simulate invalid number handling
    if (toNumber === "invalid" || !toNumber.match(/^\+?\d{10,15}$/)) {
      throw new Error("Failed to make call: The 'To' number is not a valid phone number.");
    }

    // Simulate Twilio test number behaviors
    let initialStatus = "queued";
    if (toNumber === TestDataGenerator.INVALID_TEST_NUMBER) {
      throw new Error("Failed to make call: The 'To' number is not a valid phone number.");
    }

    const callSid = this.generateCallSid();
    const call: MockCall = {
      sid: callSid,
      accountSid: this.accountSid,
      to: toNumber,
      from: this.phoneNumber,
      status: initialStatus,
      direction: "outbound-api",
      duration: "0",
      dateCreated: new Date(),
      startTime: null,
      endTime: null
    };

    this.calls.set(callSid, call);

    // Simulate async status progression
    setTimeout(() => {
      const storedCall = this.calls.get(callSid);
      if (storedCall && storedCall.status === "queued") {
        storedCall.status = "ringing";
        storedCall.startTime = new Date();
      }
    }, 500);

    setTimeout(() => {
      const storedCall = this.calls.get(callSid);
      if (storedCall && storedCall.status === "ringing") {
        if (toNumber === TestDataGenerator.BUSY_TEST_NUMBER) {
          storedCall.status = "busy";
        } else if (toNumber === TestDataGenerator.NO_ANSWER_TEST_NUMBER) {
          storedCall.status = "no-answer";
        } else {
          storedCall.status = "in-progress";
        }
      }
    }, 1000);

    return call;
  }

  public async getCallStatus(callSid: string): Promise<MockCall> {
    const call = this.calls.get(callSid);
    if (!call) {
      throw new Error(`Failed to get call status: Call ${callSid} not found`);
    }
    return { ...call };
  }

  public async endCall(callSid: string): Promise<MockCall> {
    const call = this.calls.get(callSid);
    if (!call) {
      throw new Error(`Failed to end call: Call ${callSid} not found`);
    }

    call.status = "completed";
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = String(Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000));
    }

    return { ...call };
  }

  public async getCallLogs(limit: number = 20): Promise<MockCall[]> {
    const calls = Array.from(this.calls.values());
    return calls.slice(0, limit);
  }

  public async makeCallWithRetry(
    toNumber: string,
    twimlUrl: string,
    maxRetries: number = 3
  ): Promise<MockCall> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeCall(toNumber, twimlUrl);
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await this.delay(100 * attempt);
        }
      }
    }

    throw lastError || new Error("Failed to make call after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCallSid(): string {
    const chars = "abcdef0123456789";
    let result = "CA";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public getAccountSid(): string {
    return this.accountSid;
  }

  public getPhoneNumber(): string {
    return this.phoneNumber;
  }

  public clearCalls(): void {
    this.calls.clear();
  }

  public addMockCall(call: MockCall): void {
    this.calls.set(call.sid, call);
  }
}
