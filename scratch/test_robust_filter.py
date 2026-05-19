import pypdf
import re

pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2024 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'

def is_header_or_footer(line):
    l = line.upper().strip()
    if not l:
        return True
    if "TDLR PASS FAIL REPORT" in l:
        return True
    if re.match(r'^PAGE \d+$', l):
        return True
    if "SCHOOL CODE" in l and "SCHOOL NAME" in l:
        return True
    if "TEST NAME" in l:
        return True
    if "TDLR CANDIDATE PASS/FAIL" in l:
        return True
    if "TEST DATES" in l:
        return True
    if "REPORT TYPE" in l:
        return True
    if "REPORT DATE" in l:
        return True
    if re.match(r'^\d{2}-\d{2}-\d{2}$', l):
        return True
    if l == "TO":
        return True
    return False

school_keywords = [
    r'BARBER\s+COLLEGE\s+INC',
    r'BARBER\s+COLLEGE\s+LLC',
    r'BARBER\s+COLLEGE',
    r'BARBER\s+ACADEMY',
    r'BARBER\s+SCHOOLS',
    r'BARBER\s+SCHOOL',
    r'BEAUTY\s+COLLEGE',
    r'BEAUTY\s+ACADEMY',
    r'BEAUTY\s+SCHOOL',
    r'HAIR\s+DESIGN\s+INC',
    r'HAIR\s+DESIGN',
    r'HAIR\s+ACADEMY',
    r'HAIRSTYLING\s+SCHOOLS',
    r'COSMETOLOGY\s+SCHOOL',
    r'COSMETOLOGY\s+COLLEGE',
    r'TECHNICAL\s+INSTITUTE\s+INC',
    r'TECHNICAL\s+INSTITUTE',
    r'HIGH\s+SCHOOL',
    r'COLLEGE',
    r'ACADEMY',
    r'INSTITUTE',
    r'SCHOOL',
    r'CENTER',
]

school_keyword_pattern = re.compile(r'\b(' + '|'.join(school_keywords) + r')\b', re.IGNORECASE)

reader = pypdf.PdfReader(pdf_repeat)
p21_text = reader.pages[20].extract_text()

all_lines = []
for line in p21_text.split('\n'):
    line = line.strip()
    if not is_header_or_footer(line):
        all_lines.append(line)

print("=== TRACING PARSER ON PAGE 21 WITH ROBUST FILTER ===")
current_buffer = ""
unmatched = []
records = []
school_names = {}

for idx, line in enumerate(all_lines):
    if re.match(r'^\d{8}\b', line):
        if current_buffer:
            m = re.match(r'^(\d{8})\s+([^,]+)$', current_buffer.strip())
            if m and "TX " not in m.group(2):
                code = m.group(1)
                name = m.group(2).strip()
                school_names[code] = name
            else:
                unmatched.append(current_buffer)
        current_buffer = line
    else:
        if current_buffer:
            current_buffer += " " + line
        else:
            print(f"  Warning: stray line ignored: {line}")
            continue
            
    # Check if score matches at the end
    if re.search(r'([A-Z]+)\s+\(\d+(?:\.\d+)?%\)$', current_buffer, re.IGNORECASE):
        code = current_buffer[:8]
        rest = current_buffer[8:].strip()
        score_match = re.search(r'([A-Z]+)\s+\((\d+(?:\.\d+)?)%\)$', rest, re.IGNORECASE)
        if score_match:
            result = score_match.group(1).upper()
            score = score_match.group(2)
            data_part = rest[:score_match.start()].strip()
            date_match = re.search(r'\b\d{2}-\d{2}-\d{2}\b$', data_part)
            if date_match:
                test_date = date_match.group(0)
                name_and_test = data_part[:date_match.start()].strip()
                test_match = re.match(r'^(.*)(?:\b|(?<=[A-Z]))(TX\s+[A-Za-z].+)$', name_and_test, re.IGNORECASE)
                if test_match:
                    name_part = test_match.group(1).strip()
                    test_name = test_match.group(2).strip()
                    
                    school_keyword_matches = list(school_keyword_pattern.finditer(name_part))
                    if school_keyword_matches:
                        last_school_match = school_keyword_matches[-1]
                        split_idx = last_school_match.end()
                        parsed_school_name = name_part[:split_idx].strip()
                        candidate_name = name_part[split_idx:].strip()
                    else:
                        parsed_school_name = ""
                        candidate_name = name_part.strip()
                        
                    school_name = parsed_school_name or school_names.get(code, "Unknown School")
                    records.append((code, school_name, candidate_name, test_name, test_date, result, score))
                    current_buffer = ""
                    continue
        unmatched.append(current_buffer)
        current_buffer = ""

print(f"\nTotal parsed on Page 21: {len(records)}")
print(f"Total unmatched on Page 21: {len(unmatched)}")
for u in unmatched:
    print(f"  Unmatched: {u}")
