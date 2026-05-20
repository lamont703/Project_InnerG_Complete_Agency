import json
import csv

input_file = "public/2026_Texas_Barber_Cosmetology_Full_NCES_Data.json"
output_file = "public/2026_Texas_Barber_Cosmetology_Enriched_Intelligence.csv"

def safe_get(d, keys, default="N/A"):
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k)
        else:
            return default
    return d if d is not None else default

def main():
    print(f"Loading local JSON payload from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Extracting advanced enterprise metrics for {len(data)} institutions...")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "Institution ID", "School Name", "City", "Zip", "Website",
            "Student Body Size", "Cost of Attendance", 
            "Completion Rate", "1-Year Median Earnings", "3-Year Default Rate",
            "Pell Grant Rate", "Federal Loan Rate", "Median Student Debt",
            "% Male", "% Female", "% Black", "% Hispanic", "% White"
        ])
        
        for school in data:
            s_obj = school.get('school', {})
            l_obj = school.get('latest', {})
            
            # Deep dict extraction for Earnings (Falling back to 10-year if 1-year is suppressed for privacy)
            earnings = safe_get(l_obj, ['earnings', '1_yr_after_completion', 'median'])
            if earnings == "N/A" or earnings is None:
                earnings = safe_get(l_obj, ['earnings', '10_yrs_after_entry', 'median'])
                
            # Handle Clock-Hour vs Semester Cost data
            cost = safe_get(l_obj, ['cost', 'tuition', 'program_year'])
            if cost == "N/A" or cost is None:
                cost = safe_get(l_obj, ['cost', 'attendance', 'academic_year'])
                
            writer.writerow([
                school.get('id', 'N/A'),
                s_obj.get('name', 'N/A'),
                s_obj.get('city', 'N/A'),
                s_obj.get('zip', 'N/A'),
                s_obj.get('school_url', 'N/A'),
                
                safe_get(l_obj, ['student', 'size']),
                cost,
                
                safe_get(l_obj, ['completion', 'consumer_rate']),
                earnings,
                safe_get(l_obj, ['repayment', '3_yr_default_rate']),
                
                safe_get(l_obj, ['aid', 'pell_grant_rate']),
                safe_get(l_obj, ['aid', 'federal_loan_rate']),
                safe_get(l_obj, ['aid', 'median_debt', 'completers', 'overall']),
                
                safe_get(l_obj, ['student', 'demographics', 'men']),
                safe_get(l_obj, ['student', 'demographics', 'women']),
                safe_get(l_obj, ['student', 'demographics', 'race_ethnicity', 'black']),
                safe_get(l_obj, ['student', 'demographics', 'race_ethnicity', 'hispanic']),
                safe_get(l_obj, ['student', 'demographics', 'race_ethnicity', 'white'])
            ])
            
    print(f"[COMPLETE] Enriched Intelligence Dataset saved to {output_file}")

if __name__ == "__main__":
    main()
