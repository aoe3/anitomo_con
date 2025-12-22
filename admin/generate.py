#!/usr/bin/env python3

import sys
import csv

TRUE_VALUES = {"yes", "y", "true", "1"}

def is_participating(value):
    if value is None:
        return True  # default to participating if column missing
    return value.strip().lower() in TRUE_VALUES

def clean(value):
    if value is None:
        return ""
    return value.strip()

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
    print(f"Total participating vendors: {len(participating_vendors)}")
    print()

    for vendor in participating_vendors:
        print(vendor)

if __name__ == "__main__":
    main()
