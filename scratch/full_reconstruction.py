import csv
import re
from collections import defaultdict

def full_reconstruction():
    raw_data_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
    accredited_csv_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Accredited Barber Schools.csv"
    output_csv_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Accredited School Student Results.csv"

    # 1. Load accredited schools
    accredited_schools = []
    with open(accredited_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            accredited_schools.append(row['School'].strip())

    # 2. Parse raw board data for all students and institutional rates
    school_results = defaultdict(lambda: {'pass': 0, 'total': 0})
    all_students = []
    
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            # Match code, school, student, test, date, result, score
            # Example: 70025003 WILLIAMS BARBER COLLEGE MILTON, BRANDON TX Class A Barber Written English 03-06-26 FAIL (58.8%)
            match = re.match(r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)', line)
            if match:
                code = match.group(1)
                school_name = match.group(2).strip()
                student_name = match.group(3).strip()
                test_name = match.group(4).strip()
                test_date = match.group(5).strip()
                result = match.group(6).strip()
                score = match.group(7).strip()
                
                # Update institutional metrics
                if result in ['PASS', 'FAIL']:
                    school_results[code]['total'] += 1
                    if result == 'PASS':
                        school_results[code]['pass'] += 1
                
                # Check if this school is accredited
                found_acc_name = None
                for acc_name in accredited_schools:
                    if acc_name.lower() in school_name.lower() or acc_name.lower() in line.lower():
                        found_acc_name = acc_name
                        break
                
                if found_acc_name:
                    all_students.append({
                        'School Code': code,
                        'School Name': school_name,
                        'Student Name': student_name,
                        'Test Name': test_name,
                        'Test Date': test_date,
                        'Score': score,
                        'Result': result,
                        'Accredited School Name': found_acc_name
                    })

    # 3. Calculate final pass rates
    pass_rates = {}
    for code, counts in school_results.items():
        if counts['total'] > 0:
            pass_rates[code] = (counts['pass'] / counts['total']) * 100
        else:
            pass_rates[code] = 0.0

    # 4. Add pass rates to student records
    for student in all_students:
        rate = pass_rates.get(student['School Code'], 0.0)
        student['School Overall Pass Rate'] = f"{rate:.1f}%"

    # 5. Save to CSV
    fieldnames = ['School Code', 'School Name', 'Student Name', 'Test Name', 'Test Date', 'Score', 'Result', 'Accredited School Name', 'School Overall Pass Rate']
    with open(output_csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_students)

    print(f"Reconstructed CSV with {len(all_students)} students from accredited schools.")

if __name__ == "__main__":
    full_reconstruction()
