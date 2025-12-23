#!/usr/bin/env python3

import sys
import csv
import random
import string

TRUE_VALUES = {"yes", "y", "true", "1"}
TOKEN_LENGTH = 10

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

    print()
    print(f"Total participating vendors: {len(participating_vendors)}")

if __name__ == "__main__":
    main()
