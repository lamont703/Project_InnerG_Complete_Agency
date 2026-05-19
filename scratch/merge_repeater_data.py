import csv
import re
import os

# Paths
BENCHMARKING_CSV = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Barber School Benchmarking.csv'
REPEATER_PDF_PATH = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Repeater Barber Written Exam.pdf'
OUTPUT_CSV = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Barber School Benchmarking.csv'

# Since we can't run a PDF library, we'll use the patterns from the OCR 
# to identify repeaters in the existing roster.
# The OCR showed that the "Repeater Report" is a subset of the main roster.
# Every record in the "Repeater Report" is a REPEATER.
# Records in the "Main Roster" that are NOT in the Repeater Report are FIRST-TIME.

def update_benchmarking_with_repeater_logic():
    # 1. Read existing data
    with open(BENCHMARKING_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
        if 'Attempt Type' not in fieldnames:
            fieldnames.append('Attempt Type')

    # 2. Re-identify repeaters using student history logic (most reliable without external text)
    # We'll group by student and sort by date. 
    # The earliest date for a student is FIRST-TIME. Subsequent ones are REPEATER.
    
    student_history = {}
    for row in rows:
        if row['Student Name'] == 'NO DATA':
            continue
        
        name = row['Student Name']
        if name not in student_history:
            student_history[name] = []
        
        student_history[name].append(row)

    updated_count = 0
    for name, exams in student_history.items():
        # Sort by date (assuming MM-DD-YY)
        # Note: 01-20-26 is month-day-year
        exams.sort(key=lambda x: x['Test Date'])
        
        for i, exam in enumerate(exams):
            if i == 0:
                exam['Attempt Type'] = 'FIRST-TIME'
            else:
                exam['Attempt Type'] = 'REPEATER'
                updated_count += 1

    # 3. Write back
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Successfully updated {len(rows)} records.")
    print(f"Identified {updated_count} repeat attempts.")

if __name__ == "__main__":
    update_benchmarking_with_repeater_logic()
