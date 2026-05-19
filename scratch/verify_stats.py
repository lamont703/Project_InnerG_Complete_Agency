import re
from collections import defaultdict

raw_data_path = "/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/raw_board_data.txt"
regex = r'^(\d{8})\s+(.*?)\s+([A-Z]+,\s+[A-Z\s]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s+\((.*?)\)'

school_stats = defaultdict(lambda: {'pass': 0, 'total': 0})
processed = set()

with open(raw_data_path, 'r') as f:
    for line in f:
        match = re.match(regex, line.strip())
        if match:
            code = match.group(1)
            name = match.group(3).strip()
            res = match.group(6)
            key = (code, name, match.group(4), match.group(5))
            if key not in processed:
                if res in ['PASS', 'FAIL']:
                    school_stats[code]['total'] += 1
                    if res == 'PASS': school_stats[code]['pass'] += 1
                processed.add(key)

code = '70053895'
stats = school_stats[code]
print(f"Stats for {code}: {stats}")
if stats['total'] > 0:
    print(f"Rate: {stats['pass']/stats['total']*100}%")
else:
    print("No stats found for this code.")
