# anitomo_con

QR-based scavenger hunt for Anitomo Con.

## Overview

Attendees scan vendor QR codes to collect digital stickers. Progress is stored locally on the device and never sent to a server.

## Privacy

- No accounts
- No personal data
- No analytics
- No tracking
- All progress stored locally in the browser

## How It (Eventually) Works

- Vendors display QR codes linking to `/?vendor=TOKEN`
- Scanning a code collects a sticker
- Duplicate scans are acknowledged but do not change progress

## Development

This project is built with plain HTML, CSS, and JavaScript for maximum compatibility and minimal complexity.

## Logic

### URL Format

Vendor QR codes should point to the root URL using query parameters:

````text
/?vendor=TOKEN
```text

Do not use /index.html or deep file paths, as routing behavior may differ across servers.

### Scan Behavior

- First scan: sticker is collected
- Duplicate scan: acknowledged with a non-intrusive message
- Invalid vendor: user is notified, no progress change


## Testing

Manually tested on:
- Desktop browsers
- iPhone 5s (iOS 12 Safari)
- Pixel 3a (Android 12 Chrome)
````
