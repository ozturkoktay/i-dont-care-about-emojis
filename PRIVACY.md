# Privacy Policy

**I don't care about emojis** is committed to protecting your privacy. This privacy policy explains what data our browser extension collects and how it is used.

## Data Collection

**We do not collect any personal data.**

This extension operates entirely locally in your browser. No data is transmitted to external servers, and no analytics or tracking is implemented.

## Data Storage

The extension stores the following data locally on your device using Chrome's storage API (`chrome.storage.sync`):

- **User preferences**: Your selected emoji blocking mode (hide, grayscale, dim, or blur) and enabled/disabled state
- **Whitelist**: A list of domains where you have chosen to allow emojis

This data is stored locally and may sync across your browsers if you are signed into Chrome, using Chrome's built-in sync functionality. We do not have access to this data.

## Permissions

The extension requires the following permissions:

- **storage**: To save your preferences and whitelist locally
- **activeTab**: To detect the current website and check whitelist status
- **scripting**: To apply emoji modifications on web pages
- **host_permissions (<all_urls>)**: To function on all websites you visit

## Third-Party Services

This extension does not use any third-party services, analytics, or external APIs.

## Data Sharing

We do not sell, trade, or transfer any user data to third parties.

## Changes to This Policy

If we make changes to this privacy policy, we will update this document and the "Last updated" date below.

## Contact

If you have questions about this privacy policy, please open an issue on our [GitHub repository](https://github.com/ozturkoktay/i-dont-care-about-emojis).

---

**Last updated:** January 28, 2026
