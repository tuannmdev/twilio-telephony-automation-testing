# Setup Guide: Twilio Telephony Automation Testing Framework

This guide will walk you through setting up the Twilio telephony automation testing framework from scratch.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js**: Version 20.x or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **npm**: Version 10.x or higher (comes with Node.js)
  - Verify: `npm --version`

- **Git**: For version control
  - Download: https://git-scm.com/
  - Verify: `git --version`

### Optional Software
- **k6**: For performance testing
  - Install: https://k6.io/docs/get-started/installation/
  - Verify: `k6 version`

- **ngrok**: For exposing local webhooks (optional)
  - Download: https://ngrok.com/download
  - Verify: `ngrok version`

### Twilio Account
- Active Twilio account with API credentials
- Sign up: https://www.twilio.com/try-twilio
- Obtain:
  - Account SID
  - Auth Token
  - Twilio phone number

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd RLAutomationTester/code
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- Playwright Test
- TypeScript
- Twilio SDK
- Express.js
- Axios
- dotenv

### 3. Install Playwright Browsers

```bash
npx playwright install
```

This downloads the necessary browser binaries for UI testing.

### 4. Configure Environment Variables

Create a `.env` file in the `code/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Test Phone Numbers
TEST_PHONE_TO=+1234567890

# Mock Server Configuration
MOCK_SERVER_PORT=3000
MOCK_SERVER_BASE_URL=http://localhost:3000

# Webhook Configuration (optional)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

**Important**:
- Replace `ACxxxxxxxx...` with your actual Twilio Account SID
- Replace `your_auth_token_here` with your actual Auth Token
- Use a valid phone number for `TWILIO_PHONE_NUMBER`
- Use a test phone number for `TEST_PHONE_TO`

### 5. Verify TypeScript Configuration

```bash
npx tsc --noEmit
```

This checks for TypeScript errors without building.

### 6. Verify Installation

```bash
# Check if all scripts are available
npm run

# Test that the mock server starts
npm run mock-server
```

Press `Ctrl+C` to stop the server.

---

## Running Tests

### API Tests

API tests do not require the mock server:

```bash
npm run test:api
```

This runs all tests in `tests/api/`:
- Authentication tests
- Outbound call tests
- Call status tests
- Webhook tests

### UI Tests

UI tests are configured with Playwright's `webServer` option, which **automatically starts the mock server** when running tests. Simply run:

```bash
npm run test:ui
```

Playwright will:
1. Automatically start the mock server
2. Wait for the server to be ready (health check)
3. Run the UI tests
4. Stop the server when tests complete

### All Tests

To run all tests (API + UI):

```bash
npm run test:all
```

The mock server will be automatically started by Playwright.

### Performance Tests

Performance tests require **k6** and the mock server. Since k6 doesn't use Playwright's webServer config, you need to start the server manually:

**Terminal 1: Start mock server**
```bash
npm run mock-server
```

**Terminal 2: Run performance tests**
```bash
npm run test:performance
```

### Running Mock Server Manually (Optional)

If you want to run the mock server independently (for development or debugging):

```bash
npm run mock-server
```

Note: When running `npm run test:ui` or `npm run test:all`, Playwright will reuse an existing server if one is already running locally.

### View Test Reports

After running tests, generate an HTML report:

```bash
npm run report
```

This opens a browser with detailed test results.

---

## Project Structure

```
code/
├── .github/
│   └── workflows/
│       └── test.yml               # CI/CD pipeline
├── docs/
│   ├── TEST-PLAN.md               # Test strategy document
│   └── SETUP.md                   # This file
├── src/
│   ├── api/
│   │   ├── twilio-client.ts       # Twilio API wrapper
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
│   │   ├── twilio-auth.spec.ts
│   │   ├── outbound-call.spec.ts
│   │   ├── call-status.spec.ts
│   │   └── webhook.spec.ts
│   ├── ui/
│   │   └── call-dashboard.spec.ts
│   └── performance/
│       └── concurrent-calls.js
├── .env.example                   # Environment template
├── .gitignore
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── README.md
```

---

## Troubleshooting

### Issue: "Missing required Twilio credentials"

**Solution**: Ensure your `.env` file is correctly configured with all required variables.

```bash
# Verify .env exists
ls -la .env

# Check contents (be careful not to expose secrets)
cat .env
```

### Issue: Mock server fails to start

**Solution**: Port 3000 may be in use.

```bash
# Check if port 3000 is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change MOCK_SERVER_PORT in .env
```

### Issue: Playwright tests fail with "Browser not found"

**Solution**: Install Playwright browsers.

```bash
npx playwright install
```

### Issue: TypeScript compilation errors

**Solution**: Ensure all dependencies are installed.

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: API tests fail with authentication errors

**Solution**: Verify Twilio credentials are correct.

1. Log in to https://console.twilio.com/
2. Navigate to Account Settings
3. Copy Account SID and Auth Token
4. Update `.env` file

### Issue: UI tests time out

**Solution**: Playwright automatically starts the mock server via `webServer` config. If tests timeout:

1. Check if port 3000 is already in use by another process
2. Verify the server health endpoint is working:
   ```bash
   curl http://localhost:3000/health
   ```
3. Increase the `webServer.timeout` in `playwright.config.ts` if needed
4. Check server logs for startup errors

### Issue: Performance tests fail immediately

**Solution**: Ensure k6 is installed and mock server is running.

```bash
# Verify k6 installation
k6 version

# If not installed
brew install k6  # macOS
choco install k6  # Windows
```

### Issue: Webhooks not received during tests

**Solution**: Check webhook server logs for errors.

```bash
# Check if webhook endpoints are accessible
curl http://localhost:3000/health

# Should return: {"status":"healthy","timestamp":"..."}
```

---

## GitHub Actions Setup

To enable CI/CD on GitHub:

### 1. Add Repository Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TEST_PHONE_TO`

### 2. Push to GitHub

```bash
git add .
git commit -m "Initial commit: Twilio automation framework"
git push origin main
```

### 3. Monitor Workflow

Go to: **Actions** tab in GitHub repository

The workflow will run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual trigger via "Run workflow"

---

## Development Workflow

### 1. Make Changes

Edit test files in `tests/` or source files in `src/`.

### 2. Run Tests Locally

```bash
# API tests (fast)
npm run test:api

# UI tests (auto-starts mock server)
npm run test:ui

# All tests
npm run test:all
```

### 3. Check TypeScript

```bash
npx tsc --noEmit
```

### 4. Commit and Push

```bash
git add .
git commit -m "Description of changes"
git push
```

### 5. Monitor CI/CD

Check GitHub Actions for test results.

---

## Best Practices

### Test Data
- Use Twilio magic test numbers for predictable behavior
- Never commit `.env` file with real credentials
- Rotate credentials regularly

### Performance
- Run API tests frequently (fast)
- Run UI tests before commits (slower)
- Run performance tests weekly or before releases

### Debugging
- Use `npm run report` to view detailed test results
- Check screenshots in `test-results/` for failed UI tests
- Review webhook logs in mock server output

### CI/CD
- Keep secrets in GitHub Secrets, not in code
- Monitor test execution times
- Archive test reports as artifacts

---

## Getting Help

### Documentation
- Twilio API: https://www.twilio.com/docs/usage/api
- Playwright: https://playwright.dev/
- k6: https://k6.io/docs/

### Common Commands

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Run specific test file
npx playwright test tests/api/outbound-call.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug specific test
npx playwright test --debug tests/ui/call-dashboard.spec.ts

# View test report
npm run report

# Start mock server
npm run mock-server

# Type check
npx tsc --noEmit

# Clean and reinstall
rm -rf node_modules package-lock.json && npm install
```

---

## Next Steps

1. ✅ Complete installation steps
2. ✅ Run API tests successfully
3. ✅ Run UI tests successfully
4. ✅ View test reports
5. ✅ Set up GitHub Actions
6. 🎯 Start adding your own test cases
7. 🎯 Customize the dashboard UI
8. 🎯 Extend the webhook server

---

**Need Help?**
- Review [TEST-PLAN.md](TEST-PLAN.md) for detailed test scenarios
- Check [README.md](../README.md) for project overview
- Consult Twilio documentation for API questions

**Last Updated**: 2026-01-29
