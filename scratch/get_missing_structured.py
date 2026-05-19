import csv
import re

def get_missing_students(raw_data_path, accredited_csv_path, results_csv_path):
    # Load accredited schools
    accredited_map = {}
    with open(accredited_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            accredited_map[row['School'].strip().lower()] = row['School'].strip()

    # Load existing students
    existing_students = set()
    with open(results_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_students.add(row['Student Name'].strip().lower())

    missing = []
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            found_acc_name = None
            for acc_low, acc_orig in accredited_map.items():
                if acc_low in line.lower():
                    found_acc_name = acc_orig
                    break
            
            if found_acc_name:
                # 70025003 WILLIAMS BARBER COLLEGE MILTON, BRANDON TX Class A Barber Written English 03-06-26 FAIL (58.8%)
                match = re.match(r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)', line)
                if match:
                    code = match.group(1)
                    school_name = match.group(2).strip()
                    student_name = match.group(3).strip()
                    test_name = match.group(4).strip()
                    test_date = match.group(5).strip()
                    result = match.group(6).strip()
                    score = match.group(7).strip()
                    
                    if student_name.lower() not in existing_students:
                        missing.append({
                            'School Code': code,
                            'School Name': school_name,
                            'Student Name': student_name,
                            'Test Name': test_name,
                            'Test Date': test_date,
                            'Score': score,
                            'Result': result,
                            'Accredited School Name': found_acc_name
                        })
    return missing

if __name__ == "__main__":
    raw_data = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    accredited_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Accredited Barber Schools.csv"
    results_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    
    missing = get_missing_students(raw_data, accredited_csv, results_csv)
    print(f"Adding {len(missing)} missing students to the CSV.")
    
    # Calculate rates again to be sure
    # ... (skipping for brevity in print)
    
    # We will append these to the results_csv in the next step.
