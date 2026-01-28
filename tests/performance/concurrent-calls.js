import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const callSuccessRate = new Rate("call_success_rate");
const callDuration = new Trend("call_duration");

// Test configuration
export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp up to 10 users over 30s
    { duration: "30s", target: 20 },  // Ramp up to 20 users over 30s
    { duration: "1m", target: 20 },   // Stay at 20 users for 1 minute
    { duration: "30s", target: 0 }    // Ramp down to 0 users
  ],
  thresholds: {
    "http_req_duration": ["p(95)<2000"], // 95% of requests should be below 2s
    "call_success_rate": ["rate>0.95"],   // 95% of calls should succeed
    "http_req_failed": ["rate<0.05"]      // Less than 5% of requests should fail
  }
};

// Test data
const BASE_URL = "http://localhost:3000";
const TEST_PHONE_NUMBERS = [
  "+15005550006", // Valid test number
  "+15005550006",
  "+15005550006"
];

export function setup() {
  // Verify server is running
  const healthCheck = http.get(`${BASE_URL}/health`);

  if (healthCheck.status !== 200) {
    throw new Error("Mock server is not running. Please start it with 'npm run mock-server'");
  }

  console.log("Server health check passed");
  return { timestamp: Date.now() };
}

export default function() {
  // Select random phone number
  const phoneNumber = TEST_PHONE_NUMBERS[Math.floor(Math.random() * TEST_PHONE_NUMBERS.length)];

  // Prepare call payload
  const payload = JSON.stringify({
    to: phoneNumber,
    twimlUrl: `${BASE_URL}/webhook/voice`
  });

  const params = {
    headers: {
      "Content-Type": "application/json"
    },
    timeout: "30s"
  };

  // Make call request
  const callStart = Date.now();
  const response = http.post(`${BASE_URL}/api/call`, payload, params);
  const callEnd = Date.now();

  // Calculate call duration
  const duration = callEnd - callStart;
  callDuration.add(duration);

  // Check response
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "response has success field": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success !== undefined;
      } catch (e) {
        return false;
      }
    },
    "call has SID": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.call && body.call.sid && body.call.sid.startsWith("CA");
      } catch (e) {
        return false;
      }
    },
    "response time < 2s": (r) => r.timings.duration < 2000
  });

  // Record success rate
  callSuccessRate.add(success);

  // If call was successful, check its status
  if (success && response.status === 200) {
    const body = JSON.parse(response.body);

    if (body.call && body.call.sid) {
      // Wait a bit before checking status
      sleep(1);

      // Get call status
      const statusResponse = http.get(`${BASE_URL}/api/call/${body.call.sid}`, params);

      check(statusResponse, {
        "status check is 200": (r) => r.status === 200,
        "status is valid": (r) => {
          try {
            const statusBody = JSON.parse(r.body);
            const validStatuses = ["queued", "ringing", "in-progress", "completed", "failed", "busy", "no-answer"];
            return statusBody.call && validStatuses.includes(statusBody.call.status);
          } catch (e) {
            return false;
          }
        }
      });
    }
  }

  // Think time between iterations
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  console.log(`Test completed. Started at: ${new Date(data.timestamp).toISOString()}`);

  // Optional: Clean up webhooks
  try {
    http.del(`${BASE_URL}/webhooks`);
    console.log("Webhooks cleared");
  } catch (e) {
    console.log("Failed to clear webhooks:", e);
  }
}

// Example output interpretation:
//
// ✓ http_req_duration............: avg=150ms min=50ms med=120ms max=500ms p(90)=250ms p(95)=350ms
//   ✓ { expected_response:true }: avg=150ms min=50ms med=120ms max=500ms p(90)=250ms p(95)=350ms
// ✓ call_success_rate............: 97.50% ✓ 195 ✗ 5
// ✓ call_duration................: avg=145ms min=48ms med=118ms max=485ms p(90)=245ms p(95)=340ms
// ✓ http_req_failed..............: 2.50%  ✓ 5   ✗ 195
//
// Interpretation:
// - 97.5% call success rate (195 successful, 5 failed) - PASSED (threshold >95%)
// - 95th percentile response time: 350ms - PASSED (threshold <2000ms)
// - HTTP request failure rate: 2.5% - PASSED (threshold <5%)
// - Average call duration: 145ms (good performance)
