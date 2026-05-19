import pypdf
import re
import csv
import os

pdf_first_path = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2023 Texas Barber Written Exam Pass-Fail Scores First Timers.pdf'
pdf_repeat_path = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2023 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'
csv_out_path = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2023 Texas Barber Written Exam Pass-Fail Scores Both First Time and Repeat.csv'

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

# School suffixes to identify school names
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
    r'COSMETOLOGY\s+COLLEGE\s+#2',
    r'TECHNICAL\s+INSTITUTE\s+INC',
    r'TECHNICAL\s+INSTITUTE',
    r'HIGH\s+SCHOOL\s+COSMETOLOGY',
    r'SR\s+HIGH\s+SCHOOL',
    r'HIGH\s+SCHOOL',
    r'CAREER\s+AND\s+TECHNOLOGY\s+CENTER',
    r'CAREER\s+AND\s+TECHNOL',
    r'CAREER\s+&\s+TECH\s+ED\s+CENTER',
    r'EDUCATIONAL\s+CENTER',
    r'TECHNOLOGY\s+CENTER',
    r'COMMUNITY\s+COLLEGE',
    r'STATE\s+COLLEGE\s+PORT\s+ARTHUR',
    r'STATE\s+COLLEGE',
    r'KILGORE\s+COLLEGE/LONGVIEW',
    r'BARBER\s+INSTITUTE',
    r'FRANKLIN\s+INSTITUTE\s+#\d+',
    r'FRANKLIN\s+INSTITUTE',
    r'BARBERS\s+TRADE\s+SCHOOL\s+INC',
    r'BARBERING\s+ACADEMY',
    r'BARBERING\s+OF\s+HOUSTON\s+SCHOOL',
    r'BARBER\s+EDUCATION\s+ACADEMY\s+INC',
    r'BARBER\s+EDUCATION\s+ACADEMY',
    r'HAIRDRESSING\s+ACADEMY',
    r'COSMETOLOGY\s+OUT\s+OF\s+STATE\s+SCHOOL',
    r'COSMETOLOGY\s+OF\s+HOUSTON\s+SCHOOL',
    r'TRAINING\s+SCHOOL',
    r'BELLA\s+COSMETOLOGY\s+COLLEGE',
    r'CHAMPIONS\s+BARBER\s+&\s+BEAUTY\s+ACADEMY',
    r'CHAMPIONS\s+BARBER\s+&',
    r'TONSORIAL\s+ARTS\s+BARBER\s+COLLEGE',
    r'TONSORE\s+MASTER\s+ACADEMY',
    r'EDVANCE\s+ACADEMY',
    r'SKIN\s+INSTITUTE',
    r'MERAKI\s+INSTITUTE',
    r'STRAND\s+INSTITUTE',
    r'AVENUE\s+FIVE\s+INSTITUTE',
    r'PAUL\s+MITCHELL\s+THE\s+SCHOOL\s+\([^)]+\)',
    r'PAUL\s+MITCHELL\s+THE\s+SCHOOL\s+-',
    r'PAUL\s+MITCHELL\s+THE\s+SCHOOL',
    r'MILAN\s+INSTITUTE\s+OF\s+COSMETOLOGY\s+\([^)]+\)',
    r'MILAN\s+INSTITUTE\s+OF\s+COSMETOLOGY',
    r'MILAN\s+INSTITUTE',
    r'ACRES\s+HOME\s+COLLEGE\s+OF\s+BARBER\s+DESIGN',
    r'ACRES\s+HOME\s+COLLEGE',
    r'COLLEGE\s+N\s+CAMPUS',
    r'COLLEGE\s+NORTH\s+CAMPUS',
    r'COLLEGE',
    r'ACADEMY',
    r'INSTITUTE',
    r'SCHOOL',
    r'CENTER',
    r'DACS',
]

school_keyword_pattern = re.compile(r'\b(' + '|'.join(school_keywords) + r')\b', re.IGNORECASE)

def parse_pdf(pdf_path, report_type):
    reader = pypdf.PdfReader(pdf_path)
    total_pages = len(reader.pages)
    print(f"Reading {report_type} PDF with {total_pages} pages...")
    
    all_lines = []
    for page_idx in range(total_pages):
        page_text = reader.pages[page_idx].extract_text()
        for line in page_text.split('\n'):
            line = line.strip()
            if not is_header_or_footer(line):
                all_lines.append((page_idx + 1, line))
                
    print(f"Total filtered lines: {len(all_lines)}")
    
    school_names = {}
    records = []
    current_buffer = ""
    buffer_start_page = 0
    unmatched_records = []
    
    for page_num, line in all_lines:
        if re.match(r'^\d{8}\b', line):
            if current_buffer:
                # Check for school name definition line
                m = re.match(r'^(\d{8})\s+([^,]+)$', current_buffer.strip())
                if m and "TX " not in m.group(2):
                    code = m.group(1)
                    name = m.group(2).strip()
                    school_names[code] = name
                else:
                    unmatched_records.append((buffer_start_page, current_buffer))
            current_buffer = line
            buffer_start_page = page_num
        else:
            if current_buffer:
                current_buffer += " " + line
            else:
                print(f"Warning: stray line on Page {page_num}: {line}")
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
                            
                        school_name = ""
                        if parsed_school_name:
                            school_name = parsed_school_name.strip()
                            school_names[code] = school_name
                        elif code in school_names:
                            school_name = school_names[code]
                        else:
                            school_name = "Unknown School"
                            
                        records.append({
                            'School Code': code,
                            'School Name': school_name,
                            'Candidate Name': candidate_name,
                            'Test Name': test_name,
                            'Test Date': test_date,
                            'Result': result,
                            'Score Percent': score,
                            'Report Type': report_type
                        })
                        current_buffer = ""
                        continue
            unmatched_records.append((buffer_start_page, current_buffer))
            current_buffer = ""
            
    if current_buffer:
        m = re.match(r'^(\d{8})\s+([^,]+)$', current_buffer.strip())
        if m and "TX " not in m.group(2):
            code = m.group(1)
            name = m.group(2).strip()
            school_names[code] = name
        else:
            unmatched_records.append((buffer_start_page, current_buffer))
            
    print(f"Parsed records for {report_type}: {len(records)}")
    if unmatched_records:
        print(f"Warning: {len(unmatched_records)} unmatched buffers in {report_type}:")
        for p_num, buf in unmatched_records[:5]:
            print(f"  Page {p_num}: {buf}")
    else:
        print(f"Success: 100% matching for {report_type}!")
        
    return records

# Parse both
first_time_records = parse_pdf(pdf_first_path, 'FIRST TIME')
repeater_records = parse_pdf(pdf_repeat_path, 'REPEATER')

all_records = first_time_records + repeater_records
print(f"\nTotal combined records: {len(all_records)}")

# Write unified CSV
headers = ['School Code', 'School Name', 'Candidate Name', 'Test Name', 'Test Date', 'Result', 'Score Percent', 'Report Type']

with open(csv_out_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(all_records)

print(f"\nSaved combined 2023 roster to: {csv_out_path}")
