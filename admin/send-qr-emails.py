#!/usr/bin/env python3

"""
Send vendor QR codes via email.

Default behavior is DRY RUN.
Use --send to actually send emails.
"""

import argparse
import csv
import os
import sys
from datetime import datetime

VENDORS_CSV = "admin/vendors.private.csv"
QR_DIR = "admin/qrs"
SENT_LOG = "admin/sent_log.csv"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Send vendor QR codes via email (dry run by default)."
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Actually send emails (default is dry run)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Resend emails even if vendor is already in sent log",
    )
    return parser.parse_args()


def load_vendors(path):
    vendors = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vendors.append(row)
    return vendors


def load_sent_log(path):
    sent = set()
    if not os.path.exists(path):
        return sent

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sent.add(row["vendor_id"])
    return sent


def main():
    args = parse_args()

    mode = "SEND" if args.send else "DRY RUN"
    print(f"Mode: {mode}")

    if args.force and not args.send:
        print("⚠️  --force has no effect without --send")
        sys.exit(1)

    if not os.path.exists(VENDORS_CSV):
        print(f"❌ Missing vendor CSV: {VENDORS_CSV}")
        sys.exit(1)

    vendors = load_vendors(VENDORS_CSV)
    sent_vendors = load_sent_log(SENT_LOG)

    print(f"Found {len(vendors)} vendors")
    print(f"QR directory: {QR_DIR}")
    print()

    for i, vendor in enumerate(vendors, start=1):
        vendor_id = int(vendor["vendor_id"])
        email = vendor["contact_email"]
        qr_filename = f"anitomo_qr_vendor_{vendor_id}.png"
        qr_path = os.path.join(QR_DIR, f"anitomo_qr_vendor_{vendor_id:03}.png")


        if vendor_id in sent_vendors and not args.force:
            print(f"[{i}] SKIP already sent → {email}")
            continue

        if not os.path.exists(qr_path):
            print(f"[{i}] ❌ Missing QR → {qr_path}")
            continue

        if args.send:
            print(f"[{i}] SEND → {email}")
            # Email sending will go here later
        else:
            print(f"[{i}] WOULD SEND → {email}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
