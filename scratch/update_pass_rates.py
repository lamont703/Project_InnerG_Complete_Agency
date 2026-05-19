import csv
import re
from collections import defaultdict

def calculate_pass_rates(raw_data_path):
    school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    
    with open(raw_data_path, 'r') as f:
        for line in f:
            # Expected format: 70025003 WILLIAMS BARBER COLLEGE MILTON, BRANDON TX Class A Barber Written English 03-06-26 FAIL (58.8%)
            # We want the school name. It starts after the 8-digit code.
            match = re.match(r'^(\d{8})\s+(.*?)\s+[A-Z]+,\s+[A-Z]+\s+.*?\s+(PASS|FAIL|UNAVAILABLE)', line)
            if match:
                school_name = match.group(2).strip()
                result = match.group(3)
                
                if result == 'PASS':
                    school_results[school_name]['pass'] += 1
                    school_results[school_name]['total'] += 1
                elif result == 'FAIL':
                    school_results[school_name]['total'] += 1
            else:
                # Try a broader match if the above fails
                parts = line.split()
                if len(parts) > 2 and parts[0].isdigit() and len(parts[0]) == 8:
                    # Find PASS/FAIL
                    if 'PASS' in line:
                        res = 'PASS'
                    elif 'FAIL' in line:
                        res = 'FAIL'
                    else:
                        continue
                    
                    # Estimate school name (between code and student name which usually has a comma)
                    # This is tricky without a strict separator.
                    # Let's use the first match as it's more reliable for the known format.
                    pass

    # Refined parsing for raw_board_data.txt
    school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            parts = line.split()
            if not parts[0].isdigit() or len(parts[0]) != 8:
                continue
                
            # Result is usually near the end before the percentage
            result = None
            if ' PASS ' in line or line.endswith(' PASS'):
                result = 'PASS'
            elif ' FAIL ' in line or line.endswith(' FAIL'):
                result = 'FAIL'
            
            if not result:
                # Check for (Score%)
                if 'PASS (' in line: result = 'PASS'
                elif 'FAIL (' in line: result = 'FAIL'
            
            if result:
                # Extract school name: everything between the code and the student name
                # Student name is typically LAST, FIRST
                student_match = re.search(r'[A-Z]+,\s+[A-Z]+', line)
                if student_match:
                    school_name = line[9:student_match.start()].strip()
                    if school_name:
                        school_results[school_name]['total'] += 1
                        if result == 'PASS':
                            school_results[school_name]['pass'] += 1

    pass_rates = {}
    for school, counts in school_results.items():
        if counts['total'] > 0:
            pass_rates[school] = (counts['pass'] / counts['total']) * 100
        else:
            pass_rates[school] = 0.0
            
    return pass_rates

def update_results_csv(input_csv, output_csv, pass_rates):
    updated_rows = []
    with open(input_csv, 'r') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            school_name = row['School Name'].strip()
            
            # Find the best match in pass_rates
            rate = pass_rates.get(school_name)
            
            if rate is None:
                # Try case-insensitive
                for s, r in pass_rates.items():
                    if s.lower() == school_name.lower():
                        rate = r
                        break
            
            if rate is None:
                # Try partial match (some schools have variations)
                for s, r in pass_rates.items():
                    if school_name.lower() in s.lower() or s.lower() in school_name.lower():
                        rate = r
                        break
            
            if rate is not None:
                row['School Overall Pass Rate'] = f"{rate:.1f}%"
            else:
                row['School Overall Pass Rate'] = "0.0%"
            
            updated_rows.append(row)
            
    with open(output_csv, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

if __name__ == "__main__":
    raw_data = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    input_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    output_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    
    rates = calculate_pass_rates(raw_data)
    # print(f"Calculated rates for {len(rates)} schools")
    update_results_csv(input_csv, output_csv, rates)
    print("Successfully updated Accredited School Student Results.csv with full pass rates.")
