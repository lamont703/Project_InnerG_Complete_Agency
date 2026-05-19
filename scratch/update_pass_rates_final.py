import csv
import re
from collections import defaultdict

def calculate_pass_rates(raw_data_path, results_csv_path):
    school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    
    # Process raw board data
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            match = re.match(r'^(\d{8})', line)
            if not match: continue
            code = match.group(1)
            result = None
            if ' PASS ' in line or ' PASS(' in line or ' PASS (' in line or line.endswith(' PASS'):
                result = 'PASS'
            elif ' FAIL ' in line or ' FAIL(' in line or ' FAIL (' in line or line.endswith(' FAIL'):
                result = 'FAIL'
            if result:
                school_results[code]['total'] += 1
                if result == 'PASS':
                    school_results[code]['pass'] += 1

    # Process existing results CSV to ensure we capture students already mapped
    with open(results_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row['School Code'].strip()
            result = row['Result'].strip().upper()
            if result in ['PASS', 'FAIL']:
                # Check if this student is already accounted for?
                # For simplicity, we'll just add them if the school code is new or we want to be sure.
                # Actually, many students in the CSV are from the raw data.
                # To avoid double counting, we should only add if they are NOT in the raw data.
                # But we don't have a unique student ID.
                # Let's just assume the CSV students are a subset of raw data OR should be included.
                # Wait, if I double count, it might skew the rate if the subset is different.
                # But if a school is ONLY in the CSV, we need this.
                pass

    # Actually, a better way is to rely on the Institutional Summary if available,
    # or just trust the raw data as the "Full" data.
    # If a school is missing from raw data but has students in CSV, 
    # we should calculate from the CSV students for that school.
    
    csv_school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    with open(results_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row['School Code'].strip()
            result = row['Result'].strip().upper()
            if result == 'PASS':
                csv_school_results[code]['pass'] += 1
                csv_school_results[code]['total'] += 1
            elif result == 'FAIL':
                csv_school_results[code]['total'] += 1

    # Merge: If school in raw data, use raw data (it's the full roster).
    # If school NOT in raw data, use CSV data.
    final_rates = {}
    
    # Get all unique codes
    all_codes = set(school_results.keys()) | set(csv_school_results.keys())
    
    for code in all_codes:
        # Prefer raw data as it's the "Full" roster
        if code in school_results and school_results[code]['total'] > 0:
            counts = school_results[code]
        else:
            # Fallback to CSV data
            counts = csv_school_results[code]
            
        if counts['total'] > 0:
            final_rates[code] = (counts['pass'] / counts['total']) * 100
        else:
            final_rates[code] = 0.0
            
    return final_rates

def update_results_csv(input_csv, output_csv, pass_rates):
    updated_rows = []
    with open(input_csv, 'r') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            code = row['School Code'].strip()
            rate = pass_rates.get(code)
            if rate is not None:
                row['School Overall Pass Rate'] = f"{rate:.1f}%"
            updated_rows.append(row)
            
    with open(output_csv, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

if __name__ == "__main__":
    raw_data = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    input_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    output_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    
    rates = calculate_pass_rates(raw_data, input_csv)
    update_results_csv(input_csv, output_csv, rates)
    print("Successfully updated Accredited School Student Results.csv with merged data.")
