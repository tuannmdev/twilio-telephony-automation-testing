# Twilio Telephony Automation Testing Framework

A comprehensive automation testing framework for Twilio telephony integration, featuring API tests, webhook validation, UI automation, and performance testing.

## Features

- **API Testing**: Complete Twilio API integration tests using Playwright
- **Webhook Testing**: Express.js mock server for testing webhook endpoints
- **UI Automation**: Interactive call dashboard with Playwright browser tests
- **Performance Testing**: k6 load tests for concurrent call scenarios
- **CI/CD Pipeline**: GitHub Actions workflow for automated testing
- **TypeScript**: Strongly typed codebase with strict mode enabled

## Tech Stack

- **Testing Framework**: [Playwright Test](https://playwright.dev/)
- **Language**: TypeScript
- **Backend**: Node.js, Express.js
- **API Client**: Twilio SDK, Axios
- **Performance Testing**: k6
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Twilio account with API credentials
- k6 (optional, for performance tests)

### Installation

```bash
# Navigate to code directory
cd code

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Configure environment variables
cp .env.example .env
# Edit .env with your Twilio credentials
```

### Running Tests

**API Tests** (no server required):
```bash
npm run test:api
```

**UI Tests** (server auto-starts via Playwright):
```bash
npm run test:ui
```

**All Tests**:
```bash
npm run test:all
```

**Performance Tests** (requires k6 + manual server start):
```bash
# Terminal 1: Start mock server
npm run mock-server

# Terminal 2: Run performance tests
npm run test:performance
```

**View Test Reports**:
```bash
npm run report
```

## Project Structure

```
code/
├── src/
│   ├── api/
│   │   ├── twilio-client.ts       # Twilio API wrapper class
│   │   └── mock-twilio-client.ts  # Mock Twilio client for testing
│   ├── mock-server/
│   │   └── server.ts              # Express webhook server
│   ├── mock-ui/
│   │   ├── index.html             # Call dashboard UI
│   │   ├── styles.css             # Dashboard styles
│   │   └── app.js                 # Dashboard logic
│   └── utils/
│       └── test-data.ts           # Test data generators
├── tests/
│   ├── api/
│   │   ├── twilio-auth.spec.ts    # Authentication tests
│   │   ├── outbound-call.spec.ts  # Outbound call tests
│   │   ├── call-status.spec.ts    # Call status tests
│   │   └── webhook.spec.ts        # Webhook tests
│   ├── ui/
│   │   └── call-dashboard.spec.ts # UI automation tests
│   └── performance/
│       └── concurrent-calls.js    # k6 load tests
└── docs/
    ├── TEST-PLAN.md               # Comprehensive test strategy
    └── SETUP.md                   # Detailed setup guide
```

## Test Coverage

### API Tests (12 tests)
- ✅ Authentication with valid/invalid credentials
- ✅ Outbound call creation and validation
- ✅ Call SID format validation
- ✅ Call status retrieval and transitions
- ✅ Call duration tracking
- ✅ Call logs retrieval
- ✅ Error handling and retry logic

### Webhook Tests (8 tests)
- ✅ Voice webhook reception
- ✅ Status callback webhook reception
- ✅ Payload validation
- ✅ Signature verification
- ✅ Concurrent webhook handling
- ✅ Webhook history management

### UI Tests (11 tests)
- ✅ Dashboard component rendering
- ✅ Phone number input validation
- ✅ Call button functionality
- ✅ Status display updates
- ✅ Call SID display
- ✅ Call history table
- ✅ Error handling

### Performance Tests (1 test)
- ✅ Concurrent calls (10-20 users)
- ✅ Response time thresholds (p95 < 2s)
- ✅ Success rate monitoring (>95%)

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run test:api` | Run API tests |
| `npm run test:ui` | Run UI tests |
| `npm run test:all` | Run all Playwright tests |
| `npm run test:performance` | Run k6 performance tests |
| `npm run mock-server` | Start Express webhook server |
| `npm run report` | View Playwright HTML report |

## Configuration

### Environment Variables

Create a `.env` file with your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TEST_PHONE_TO=+1234567890
MOCK_SERVER_PORT=3000
```

### Playwright Configuration

Tests are organized into two projects:
- **api-tests**: API integration tests
- **ui-tests**: Browser-based UI tests

See `playwright.config.ts` for full configuration.

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:
- Runs on push to `main`/`develop` branches
- Executes API and UI tests in parallel
- Performs TypeScript type checking
- Uploads test reports and screenshots as artifacts
- Requires GitHub Secrets for Twilio credentials

### Required GitHub Secrets
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TEST_PHONE_TO`

## Architecture

### TwilioClient Class
Core API wrapper providing methods:
- `makeCall(toNumber, twimlUrl)`: Create outbound call
- `getCallStatus(callSid)`: Retrieve call status
- `endCall(callSid)`: Terminate active call
- `getCallLogs(limit)`: Fetch call history
- `makeCallWithRetry()`: Call with retry logic

### WebhookServer Class
Express.js server with endpoints:
- `POST /webhook/voice`: Handle voice webhooks
- `POST /webhook/status`: Handle status callbacks
- `GET /webhooks`: Retrieve webhook history
- `DELETE /webhooks`: Clear webhook history
- `POST /api/call`: Create call via UI
- `GET /api/call/:sid`: Get call status
- `GET /api/calls`: Get call history

### CallDashboard Class
Browser-based UI controller:
- `makeCall(phoneNumber)`: Initiate call
- `pollCallStatus()`: Poll for status updates
- `updateStatusDisplay()`: Update UI status
- `renderHistory()`: Display call history

## Test Data

The framework uses Twilio magic test numbers:
- **Valid**: `+15005550006`
- **Invalid**: `+15005550001`
- **Busy**: `+15005550004`
- **No Answer**: `+15005550008`

## Performance Benchmarks

Expected results from k6 tests:
- **Concurrent Users**: 20
- **Test Duration**: 2.5 minutes
- **Target Thresholds**:
  - p95 response time: < 2000ms
  - Success rate: > 95%
  - HTTP failure rate: < 5%

## Documentation

- **[TEST-PLAN.md](docs/TEST-PLAN.md)**: Complete test strategy, scenarios, and acceptance criteria
- **[SETUP.md](docs/SETUP.md)**: Step-by-step installation and troubleshooting guide

## Troubleshooting

### Common Issues

**Issue**: "Missing required Twilio credentials"
- **Solution**: Ensure `.env` file is configured correctly

**Issue**: Mock server fails to start
- **Solution**: Check if port 3000 is available: `lsof -i :3000`

**Issue**: UI tests time out
- **Solution**: Playwright auto-starts the server; check if port 3000 is in use

**Issue**: API tests fail with 401
- **Solution**: Verify Twilio credentials in `.env`

See [SETUP.md](docs/SETUP.md#troubleshooting) for more solutions.

## Code Style

This project follows strict code style guidelines:
- ✅ Each class in separate file
- ✅ Explicit accessibility modifiers on all properties/methods
- ✅ Double quotes for all string literals
- ✅ TypeScript strict mode enabled
- ✅ ESLint and Prettier (optional)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-test`)
3. Make your changes
4. Run tests locally (`npm run test:all`)
5. Commit your changes (`git commit -m "Add new test"`)
6. Push to the branch (`git push origin feature/new-test`)
7. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Twilio](https://www.twilio.com/) for API and test numbers
- [Playwright](https://playwright.dev/) for testing framework
- [k6](https://k6.io/) for performance testing

## Contact

For questions or support:
- Review documentation in `docs/`
- Check [Twilio API docs](https://www.twilio.com/docs/usage/api)
- Open an issue on GitHub

---

**Built with ❤️ for comprehensive telephony testing**

Last Updated: 2026-01-29
