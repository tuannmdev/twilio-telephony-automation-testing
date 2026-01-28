import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import { TwilioClient } from "../api/twilio-client";
import { MockTwilioClient } from "../api/mock-twilio-client";

dotenv.config();

type TwilioClientType = TwilioClient | MockTwilioClient;

export class WebhookServer {
  private app: express.Application;
  private port: number;
  private webhooks: any[];
  private twilioClient: TwilioClientType;
  private server: any;
  private useMock: boolean;

  public constructor(port?: number, useMock?: boolean) {
    this.app = express();
    this.port = port || parseInt(process.env.MOCK_SERVER_PORT || "3000");
    this.webhooks = [];

    // Use mock client if explicitly requested or if real credentials are not available
    this.useMock = useMock ?? this.shouldUseMock();

    if (this.useMock) {
      console.log("Using MockTwilioClient (no real Twilio credentials)");
      this.twilioClient = new MockTwilioClient();
    } else {
      console.log("Using real TwilioClient");
      this.twilioClient = new TwilioClient();
    }

    this.setupMiddleware();
    this.setupRoutes();
  }

  private shouldUseMock(): boolean {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Use mock if any credential is missing or if USE_MOCK is set
    if (process.env.USE_MOCK === "true") {
      return true;
    }

    return !accountSid || !authToken || !phoneNumber || !accountSid.startsWith("AC");
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static("src/mock-ui"));
    this.app.use((_req: Request, res: Response, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });
  }

  private setupRoutes(): void {
    // Webhook endpoints
    this.app.post("/webhook/voice", this.handleVoiceWebhook.bind(this));
    this.app.post("/webhook/status", this.handleStatusWebhook.bind(this));
    this.app.get("/webhooks", this.getWebhooks.bind(this));
    this.app.delete("/webhooks", this.clearWebhooks.bind(this));

    // API endpoints for UI
    this.app.post("/api/call", this.makeCall.bind(this));
    this.app.get("/api/call/:sid", this.getCallStatus.bind(this));
    this.app.get("/api/calls", this.getCallHistory.bind(this));

    // Health check
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });
  }

  private handleVoiceWebhook(req: Request, res: Response): void {
    const webhook = {
      type: "voice",
      timestamp: new Date().toISOString(),
      data: req.body
    };

    this.webhooks.push(webhook);

    console.log("Received voice webhook:", webhook);

    // Validate webhook signature if present
    const signature = req.headers["x-twilio-signature"] as string;
    if (signature) {
      webhook.data.signatureValid = this.validateSignature(signature, req.body);
    }

    // Respond with TwiML
    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. This is a test call.</Say>
</Response>`);
  }

  private handleStatusWebhook(req: Request, res: Response): void {
    const webhook = {
      type: "status",
      timestamp: new Date().toISOString(),
      data: req.body
    };

    this.webhooks.push(webhook);

    console.log("Received status webhook:", webhook);

    // Validate webhook signature if present
    const signature = req.headers["x-twilio-signature"] as string;
    if (signature) {
      webhook.data.signatureValid = this.validateSignature(signature, req.body);
    }

    res.status(200).send("OK");
  }

  private getWebhooks(_req: Request, res: Response): void {
    res.json({
      count: this.webhooks.length,
      webhooks: this.webhooks
    });
  }

  private clearWebhooks(_req: Request, res: Response): void {
    const count = this.webhooks.length;
    this.webhooks = [];
    res.json({
      message: "Webhooks cleared",
      cleared: count
    });
  }

  private async makeCall(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body;

      if (!to) {
        res.status(400).json({ error: "Missing required field: to" });
        return;
      }

      // Always use WEBHOOK_BASE_URL for Twilio to access (not localhost)
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || `http://localhost:${this.port}`;
      const url = `${webhookBaseUrl.replace(/\/$/, "")}/webhook/voice`;
      const call = await this.twilioClient.makeCall(to, url);

      res.json({
        success: true,
        call: {
          sid: call.sid,
          to: call.to,
          from: call.from,
          status: call.status
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  private async getCallStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sid } = req.params;
      const call = await this.twilioClient.getCallStatus(sid);

      res.json({
        success: true,
        call: {
          sid: call.sid,
          to: call.to,
          from: call.from,
          status: call.status,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  private async getCallHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const calls = await this.twilioClient.getCallLogs(limit);

      res.json({
        success: true,
        count: calls.length,
        calls: calls.map(call => ({
          sid: call.sid,
          to: call.to,
          from: call.from,
          status: call.status,
          duration: call.duration,
          dateCreated: call.dateCreated
        }))
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  private validateSignature(signature: string, _body: any): boolean {
    // Basic signature validation (simplified)
    // In production, use twilio.validateRequest()
    return signature.length > 0;
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Webhook server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("Webhook server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getPort(): number {
    return this.port;
  }

  public getWebhookCount(): number {
    return this.webhooks.length;
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new WebhookServer();
  server.start();
}
