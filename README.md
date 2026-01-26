# TDT Playwright Test Suite

Automated functional tests for the TDT (Tanzania Development Trust) staging environment at https://tdt.akvotest.org/

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