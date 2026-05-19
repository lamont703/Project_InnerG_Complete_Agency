import re

line = "70025007 GRAHAM'S BARBER COLLEGE BOND, KIEDREN TX Class A Barber Written English 01-20-26 PASS (74.1%)"
# regex = r'^(\d{8})\s+(.*?)\s+([A-Z0-9\s,_\-\.\']+)\s+([A-Z].*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'
# Better regex: school name (.*?) followed by name (with comma)
regex = r'^(\d{8})\s+(.*?)\s+([A-Z0-9_\-\.\']+\s*,\s+[A-Z0-9\s_\-\.\']+)\s+([A-Z].*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'

match = re.match(regex, line)
if match:
    print("Match!")
    print(f"Code: {match.group(1)}")
    print(f"School: {match.group(2)}")
    print(f"Student: {match.group(3)}")
else:
    print("No match")
