import re

line = "70053895 VICTORIA BEAUTY & BARBER COLLEGE GONZALES, ZANE TX Class A Barber Written English 01-08-26 FAIL (63.5%)"
regex = r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'

match = re.match(regex, line)
if match:
    print("Match!")
    print(f"Code: {match.group(1)}")
    print(f"School: {match.group(2)}")
    print(f"Student: {match.group(3)}")
else:
    print("No match")
