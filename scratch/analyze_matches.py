import re
import csv
from collections import Counter

raw_data_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
accredited_csv_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Accredited Barber Schools.csv"
regex = r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'

accredited_schools = []
with open(accredited_csv_path, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        accredited_schools.append(row['School'].strip().lower())

raw_school_names = Counter()
matched_students = 0
with open(raw_data_path, 'r') as f:
    for line in f:
        line = line.strip()
        match = re.match(regex, line)
        if match:
            school_name = match.group(2).strip()
            raw_school_names[school_name] += 1
            
            # Check for match
            found = False
            for acc in accredited_schools:
                if acc in school_name.lower() or school_name.lower() in acc:
                    found = True
                    break
            if found:
                matched_students += 1

print(f"Total students matched: {matched_students}")
# print("Top raw school names:")
# for name, count in raw_school_names.most_common(20):
#    print(f"{name}: {count}")
