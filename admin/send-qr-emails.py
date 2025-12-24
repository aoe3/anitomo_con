#!/usr/bin/env python3

"""
Send vendor QR codes via email.

- Reads admin/vendors.private.csv
- Sends exactly one email per vendor
- Each vendor receives ONLY their own QR code
- Intended to be run once per event
"""
