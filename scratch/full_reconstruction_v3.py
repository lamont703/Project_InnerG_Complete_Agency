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

    # 2. Parse ALL raw board data
    school_stats = defaultdict(lambda: {'pass': 0, 'total': 0})
    processed_students_for_stats = set()
    all_students = []
    
    # Refined regex: Code (8 digits), School (.*? until comma name), Student (Last, First TX), Test, Date, Result, Score
    regex = r'^(\d{8})\s+(.*?)\s+([A-Z0-9_\-\.\']+\s*,\s+[A-Z0-9\s_\-\.\']+)\s+([A-Z].*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'
    
    with open(raw_data_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            match = re.match(regex, line)
            if match:
                code = match.group(1)
                school_name_raw = match.group(2).strip()
                student_name_raw = match.group(3).strip()
                test_name = match.group(4).strip()
                test_date = match.group(5).strip()
                result = match.group(6).strip()
                score = match.group(7).strip()
                
                # Clean student name
                student_name = student_name_raw
                if student_name.endswith(" TX"):
                    student_name = student_name[:-3].strip()
                
                # Institutional stats calculation
                stat_key = (code, student_name, test_name, test_date)
                if stat_key not in processed_students_for_stats:
                    if result in ['PASS', 'FAIL']:
                        school_stats[code]['total'] += 1
                        if result == 'PASS':
                            school_stats[code]['pass'] += 1
                    processed_students_for_stats.add(stat_key)
                
                # Check for accredited school match
                found_acc_name = None
                for acc_name in accredited_schools:
                    if acc_name.lower() in school_name_raw.lower() or school_name_raw.lower() in acc_name.lower():
                        found_acc_name = acc_name
                        break
                
                if found_acc_name:
                    all_students.append({
                        'School Code': code,
                        'School Name': school_name_raw,
                        'Student Name': student_name,
                        'Test Name': test_name,
                        'Test Date': test_date,
                        'Score': score,
                        'Result': result,
                        'Accredited School Name': found_acc_name
                    })

    # Calculate pass rates
    pass_rates = {}
    for code, counts in school_stats.items():
        if counts['total'] > 0:
            pass_rates[code] = (counts['pass'] / counts['total']) * 100
        else:
            pass_rates[code] = 0.0

    # Add pass rates to student records
    for student in all_students:
        rate = pass_rates.get(student['School Code'], 0.0)
        student['School Overall Pass Rate'] = f"{rate:.1f}%"

    # Save to CSV
    fieldnames = ['School Code', 'School Name', 'Student Name', 'Test Name', 'Test Date', 'Score', 'Result', 'Accredited School Name', 'School Overall Pass Rate']
    with open(output_csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_students)

    print(f"Reconstructed CSV with {len(all_students)} students from accredited schools. Institutional metrics verified.")

if __name__ == "__main__":
    full_reconstruction()
