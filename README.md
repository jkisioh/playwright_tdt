# TDT Playwright Test Suite

[![Playwright Tests](https://github.com/akvo/climate-think-and-do-tank/actions/workflows/playwright.yml/badge.svg)](https://github.com/akvo/climate-think-and-do-tank/actions/workflows/playwright.yml)

Automated functional tests for the TDT (Tanzania Development Trust) staging environment at https://tdt.akvotest.org/

> **CI/CD**: These tests run automatically on every push, pull request, and daily schedule. See [CICD.md](CICD.md) for detailed CI/CD documentation.

## Test Files

### [pages.spec.ts](e2e/pages.spec.ts)
Functional tests for all main pages including:
- Page loading and content verification
- Static content validation
- Image link validation
- Navigation presence
- Form structure validation
- Cross-page navigation flow

### [content.spec.ts](e2e/content.spec.ts)
Interactivity and content integrity tests:
- Navigation menu interactions
- Investment profiles page functionality
- Stakeholder directory search/filter
- Knowledge hub resource interactions
- Contact form field validation and input testing
- Responsive design (mobile/tablet)
- Performance and JavaScript error monitoring

### [navigation.spec.ts](e2e/navigation.spec.ts)
Site-wide navigation and UI tests:
- Header and footer consistency
- Navigation menu across all pages
- Page navigation flows (back/forward)
- Direct URL access
- Mobile menu functionality
- Link validation (internal/external)
- Accessibility (ARIA landmarks, skip links)
- Search functionality

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/pages.spec.ts

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# View test report
npx playwright show-report
```

## Test Coverage

Pages tested:
- Home (/)
- Investment Profiles (/investment-profiles)
- Social Accountability (/social-accountability)
- Stakeholder Directory (/stakeholder-directory)
- Knowledge Hub (/knowledge-hub)
- News & Events (/news-events)
- Contact Us (/contact-us)

## Configuration

Tests are configured in [playwright.config.ts](playwright.config.ts):
- **Base URL**: https://tdt.akvotest.org/
- **Browsers**: Chromium, Firefox, WebKit
- **Timeout**: 45s navigation, 20s actions
- **Screenshots**: On failure
- **Video**: Retained on failure
- **Retries**: 2 on CI, 0 locally

## CI/CD Integration

### Automated Testing
Tests run automatically via GitHub Actions:
- ✅ On every push to main/master
- ✅ On every pull request
- ✅ Daily at 6 AM UTC (health monitoring)
- ✅ Every 6 hours (scheduled monitoring)
- ✅ Manual trigger available

### Test Scripts
```bash
npm test                  # Run all tests
npm run test:chromium     # Test on Chromium only
npm run test:firefox      # Test on Firefox only
npm run test:webkit       # Test on WebKit only
npm run test:ui           # Interactive UI mode
npm run test:headed       # See browser while testing
npm run test:pages        # Run page tests only
npm run test:content      # Run interactivity tests only
npm run test:navigation   # Run navigation tests only
npm run test:report       # View last test report
```

### Integration into Main Repository

To add these tests to the main TDT repository:

**Quick Method:**
```bash
./integrate.sh /path/to/climate-think-and-do-tank
cd /path/to/climate-think-and-do-tank/tests
npm install
npm test
```

**Manual Method:** See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

**Detailed CI/CD Setup:** See [CICD.md](CICD.md)

## Documentation

- [README.md](README.md) - Test suite overview (this file)
- [CICD.md](CICD.md) - Complete CI/CD documentation
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Step-by-step integration guide
- [playwright.config.ts](playwright.config.ts) - Test configuration

## GitHub Workflows

- [playwright.yml](.github/workflows/playwright.yml) - Main test workflow
- [scheduled-monitoring.yml](.github/workflows/scheduled-monitoring.yml) - Health monitoring