import csv
import re

def check_missing_students(raw_data_path, accredited_csv_path, results_csv_path):
    # Load accredited schools
    accredited_names = set()
    with open(accredited_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            accredited_names.add(row['School'].strip().lower())

    # Load existing students in results
    existing_students = set()
    with open(results_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_students.add(row['Student Name'].strip().lower())

    # Check raw data for matches
    missing_students = []
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            # Extract school name and student name
            # Format: 70025003 WILLIAMS BARBER COLLEGE MILTON, BRANDON ...
            parts = line.split()
            if len(parts) < 4: continue
            
            # Simple match for school name
            found_school = None
            for acc_name in accredited_names:
                if acc_name in line.lower():
                    found_school = acc_name
                    break
            
            if found_school:
                # Extract student name (Last, First)
                match = re.search(r'([A-Z]+,\s+[A-Z]+)', line)
                if match:
                    student_name = match.group(1).strip()
                    if student_name.lower() not in existing_students:
                        missing_students.append(line)

    return missing_students

if __name__ == "__main__":
    raw_data = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    accredited_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Accredited Barber Schools.csv"
    results_csv = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"
    
    missing = check_missing_students(raw_data, accredited_csv, results_csv)
    print(f"Found {len(missing)} students from accredited schools missing from results CSV.")
    # for m in missing[:10]:
    #    print(m)
