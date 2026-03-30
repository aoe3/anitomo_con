#!/usr/bin/env python3

import sys
import csv
import random
import string
import json
import qrcode
import os
from datetime import datetime



TRUE_VALUES = {"yes", "y", "true", "1"}
TOKEN_LENGTH = 10

# BASE_URL rules
# for prod, use https://anitomo-con-qr-hunt.netlify.app/
# for ui testing, use http://192.168.1.44:3000/
# for load testing, use https://anitomo-con-qr-load-test.netlify.app/
BASE_URL = "https://anitomo-con-qr-hunt.netlify.app/"

# Logos live under src/assets/logos_formatted/
# Frontend-friendly relative path should be assets/logos_formatted/vendor_logo_<NNN>.webp
LOGO_FILENAME_TEMPLATE = "vendor_logo_{:03}.webp"
LOGO_PUBLIC_PATH_TEMPLATE = "assets/logos_formatted/vendor_logo_{:03}.webp"
LOGO_SOURCE_DIR = os.path.join("src", "assets", "logos_formatted")


def generate_event_id():
    return "anitomo-con-" + datetime.now().strftime("%Y%m%d-%H%M%S")


def is_participating(value):
    if value is None:
        return True
    return value.strip().lower() in TRUE_VALUES


def clean(value):
    if value is None:
        return ""
    return value.strip()


def generate_token(existing_tokens):
    characters = string.ascii_letters + string.digits  # A-Z a-z 0-9

    while True:
        token = "".join(random.choice(characters) for _ in range(TOKEN_LENGTH))
        if token not in existing_tokens:
            return token


def generate_qr_code(url, output_path):
    img = qrcode.make(url)
    img.save(output_path)


def get_logo_public_path(vendor_id):
    return LOGO_PUBLIC_PATH_TEMPLATE.format(vendor_id)


def get_logo_source_path(vendor_id):
    return os.path.join(LOGO_SOURCE_DIR, LOGO_FILENAME_TEMPLATE.format(vendor_id))


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 admin/generate.py <input_csv> [event_id]")
        sys.exit(1)

    input_csv = sys.argv[1]
    event_id = sys.argv[2] if len(sys.argv) > 2 else generate_event_id()

    print("Vendor generator starting…")
    print("Input CSV:", input_csv)
    print()

    participating_vendors = []

    with open(input_csv, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            vendor_name = clean(row.get("vendor_name"))
            booth = clean(row.get("booth"))
            email = clean(row.get("contact_email"))
            participating = is_participating(row.get("participating"))

            if not vendor_name or not booth or not email:
                print("⚠️  Skipping row (missing required fields):", row)
                continue

            if not participating:
                print(f"ℹ️  Skipping non-participating vendor: {vendor_name}")
                continue

            participating_vendors.append({
                "vendor_name": vendor_name,
                "booth": booth,
                "contact_email": email,
                "notes": clean(row.get("notes")),
            })

    print()
    print("Assigning vendor IDs, generating tokens, and assigning logos…")
    print()

    used_tokens = set()

    for index, vendor in enumerate(participating_vendors, start=1):
        token = generate_token(used_tokens)
        used_tokens.add(token)

        vendor_id = int(index)
        vendor["vendor_id"] = vendor_id
        vendor["token"] = token
        vendor["logo"] = get_logo_public_path(vendor_id)

        logo_source_path = get_logo_source_path(vendor_id)
        if not os.path.exists(logo_source_path):
            print(f"⚠️  Missing formatted logo for vendor {vendor_id}: {logo_source_path}")

        print(
            f"{vendor['vendor_id']:>3} | "
            f"{vendor['vendor_name']:<24} | "
            f"{vendor['booth']:<5} | "
            f"{vendor['token']} | "
            f"{vendor['logo']}"
        )

    print(f"🆔 Event ID: {event_id}")

    public_output = {
        "eventId": event_id,
        "vendors": [
            {
                "id": v["vendor_id"],
                "name": v["vendor_name"],
                "booth": v["booth"],
                "token": v["token"],
                "logo": v["logo"],
            }
            for v in participating_vendors
        ],
    }

    os.makedirs("src", exist_ok=True)
    with open("src/vendors.public.json", "w", encoding="utf-8") as f:
        json.dump(public_output, f, indent=2)

    print("✅ Wrote src/vendors.public.json")

    # Write private CSV
    private_csv_path = "admin/vendors.private.csv"

    with open(private_csv_path, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = [
            "vendor_id",
            "vendor_name",
            "booth",
            "contact_email",
            "token",
            "notes",
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for v in participating_vendors:
            writer.writerow({
                "vendor_id": int(v["vendor_id"]),
                "vendor_name": v["vendor_name"],
                "booth": v["booth"],
                "contact_email": v["contact_email"],
                "token": v["token"],
                "notes": v["notes"],
            })

    print("🔒 Wrote admin/vendors.private.csv")

    print()
    print("Generating QR codes…")

    qr_dir = "admin/qrs"
    os.makedirs(qr_dir, exist_ok=True)

    for v in participating_vendors:
        qr_url = f"{BASE_URL}?v={v['token']}"
        qr_path = os.path.join(
            qr_dir,
            f"anitomo_qr_vendor_{v['vendor_id']:03}.png"
        )

        generate_qr_code(qr_url, qr_path)

        print(f"📷 QR for {v['vendor_name']} → {qr_path}")

    print()
    print(f"Total participating vendors: {len(participating_vendors)}")


if __name__ == "__main__":
    main()