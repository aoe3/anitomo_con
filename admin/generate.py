#!/usr/bin/env python3

import sys
import csv
import random
import string
import json
import qrcode
import os



TRUE_VALUES = {"yes", "y", "true", "1"}
TOKEN_LENGTH = 10
BASE_URL = "http://192.168.1.151:3000/"
EVENT_ID = "anitomo-con-2026-devtest-v5"

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


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 admin/generate.py <input_csv>")
        sys.exit(1)

    input_csv = sys.argv[1]

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
    print("Assigning vendor IDs and generating tokens…")
    print()

    used_tokens = set()

    for index, vendor in enumerate(participating_vendors, start=1):
        token = generate_token(used_tokens)
        used_tokens.add(token)

        vendor["vendor_id"] = index
        vendor["token"] = token

        print(
            f"{vendor['vendor_id']:>2} | "
            f"{vendor['vendor_name']:<20} | "
            f"{vendor['booth']:<5} | "
            f"{vendor['token']}"
        )
    
    public_output = {
        "eventId": EVENT_ID,
        "vendors": [
            {
                "id": v["vendor_id"],
                "name": v["vendor_name"],
                "booth": v["booth"],
                "token": v["token"],
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
                "vendor_id": v["vendor_id"],
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
        qr_path = os.path.join(qr_dir, f"vendor-{v['vendor_id']:03}.png")

        generate_qr_code(qr_url, qr_path)

        print(f"📷 QR for {v['vendor_name']} → {qr_path}")

    print()
    print(f"Total participating vendors: {len(participating_vendors)}")

if __name__ == "__main__":
    main()
