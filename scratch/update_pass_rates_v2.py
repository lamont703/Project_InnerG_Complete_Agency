import csv
import re
from collections import defaultdict

def calculate_pass_rates_by_code(raw_data_path):
    school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            # Match 8-digit code at start
            match = re.match(r'^(\d{8})', line)
            if not match:
                continue
            
            code = match.group(1)
            
            # Determine result
            result = None
            if ' PASS ' in line or ' PASS(' in line or ' PASS (' in line or line.endswith(' PASS'):
                result = 'PASS'
            elif ' FAIL ' in line or ' FAIL(' in line or ' FAIL (' in line or line.endswith(' FAIL'):
                result = 'FAIL'
            
            if result:
                school_results[code]['total'] += 1
                if result == 'PASS':
                    school_results[code]['pass'] += 1

    pass_rates = {}
    for code, counts in school_results.items():
        if counts['total'] > 0:
            pass_rates[code] = (counts['pass'] / counts['total']) * 100
        else:
            pass_rates[code] = 0.0
            
    return pass_rates

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
            else:
                # If code doesn't match, maybe the code in CSV is different?
                # Fallback to name matching just in case
                pass
            
            updated_rows.append(row)
            
    with open(output_csv, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

if __name__ == "__main__":
    raw_data = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    input_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    output_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    
    rates = calculate_pass_rates_by_code(raw_data)
    update_results_csv(input_csv, output_csv, rates)
    print(f"Successfully updated Accredited School Student Results.csv using codes for {len(rates)} schools.")
