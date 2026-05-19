import re
import csv

raw_data_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
regex = r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'

matches = 0
total_lines = 0
with open(raw_data_path, 'r') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        total_lines += 1
        if re.match(regex, line):
            matches += 1
        else:
            # print(f"FAIL: {line}")
            pass

print(f"Total lines: {total_lines}, Matches: {matches}")
