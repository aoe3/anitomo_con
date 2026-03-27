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
import smtplib
from email.message import EmailMessage

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
            sent.add(int(row["vendor_id"]))
    return sent

def send_email(to_email, subject, body, attachment_path):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ["SMTP_FROM"]
    msg["To"] = to_email

    msg.set_content(body)

    # Attach QR
    with open(attachment_path, "rb") as f:
        file_data = f.read()
        file_name = os.path.basename(attachment_path)

    msg.add_attachment(file_data, maintype="image", subtype="png", filename=file_name)

    # Send via SMTP
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])) as server:
        server.starttls()
        server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        server.send_message(msg)


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
        test_recipient = os.environ.get("SMTP_TEST_RECIPIENT")
        email = test_recipient if test_recipient else vendor["contact_email"]
        qr_path = os.path.join(QR_DIR, f"anitomo_qr_vendor_{vendor_id:03}.png")


        if vendor_id in sent_vendors and not args.force:
            print(f"[{i}] SKIP already sent → {email}")
            continue

        if not os.path.exists(qr_path):
            print(f"[{i}] ❌ Missing QR → {qr_path}")
            continue

        # if args.send:
        #     print(f"[{i}] SEND → {email}")
        #     # Email sending will go here later

        if args.send:
            print(f"[{i}] SEND → {vendor['vendor_name']} ({vendor['booth']}) → {email}")

            subject = f"[TEST] AniTomo QR – {vendor['vendor_name']} ({vendor['booth']})"
            body = f"""
        Hi {vendor['vendor_name']},

        Here is your QR code for AniTomo Con.

        Please display it at your booth for attendees to scan.

        Thanks!
        """

            try:
                send_email(email, subject, body, qr_path)
                print(f"    ✅ Sent successfully")
            except Exception as e:
                print(f"    ❌ Failed to send: {e}")

        else:
            print(f"[{i}] WOULD SEND → {email}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
