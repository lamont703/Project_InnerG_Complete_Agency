import urllib.request
import json
import csv
import sys
import time

# We can safely use the DEMO_KEY for small statewide pulls (up to 40 requests/hour)
API_KEY = "DEMO_KEY"
BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json"

# Parameters: Texas, Certificate-granting institutions
params = {
    "school.state": "TX",
    "school.degrees_awarded.predominant": "1",
    "fields": "id,school.name,school.city,school.zip,school.school_url,latest.student.size,latest.aid.pell_grant_rate,latest.aid.median_debt.completers.overall,latest.cost.attendance.academic_year",
    "per_page": "100",
    "api_key": API_KEY
}

output_file = "public/2026 Texas Barber and Cosmetology Financial Aide Data.csv"

def fetch_data():
    all_results = []
    page = 0
    
    while True:
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        url = f"{BASE_URL}?{query_string}&page={page}"
        print(f"[FEDERAL API AGENT] Fetching page {page + 1}...")
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Inner G Complete Agency / Barber Intelligence Crawler'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
                results = data.get("results", [])
                if not results:
                    break
                    
                all_results.extend(results)
                
                metadata = data.get("metadata", {})
                total = metadata.get("total", 0)
                if len(all_results) >= total:
                    break
                    
                page += 1
                time.sleep(1) # Be respectful of DEMO_KEY rate limits
                
        except urllib.error.HTTPError as e:
            print(f"[ERROR] HTTP Error {e.code}: {e.read().decode()}")
            break
        except Exception as e:
            print(f"[ERROR] Failed fetching data: {e}")
            break
            
    return all_results

def main():
    print("Initiating connection to Federal College Scorecard API (NCES/IPEDS)...")
    data = fetch_data()
    
    if not data:
        print("No data retrieved. Exiting.")
        sys.exit(1)
        
    print(f"Successfully retrieved {len(data)} Texas accredited institutions. Filtering for Barber/Cosmetology...")
    
    keywords = ['barber', 'cosmetology', 'beauty', 'hair', 'salon', 'spa', 'esthetics']
    filtered_data = [
        school for school in data 
        if any(kw in str(school.get('school.name', '')).lower() for kw in keywords)
    ]
    
    print(f"Extraction complete! Found {len(filtered_data)} matching Barber/Cosmetology schools. Writing to CSV...")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "Institution ID", "School Name", "City", "Zip", "Website",
            "Student Body Size", "Pell Grant Rate", "Median Student Debt", "Average Cost of Attendance"
        ])
        
        for school in filtered_data:
            writer.writerow([
                school.get('id', 'N/A'),
                school.get('school.name', 'N/A'),
                school.get('school.city', 'N/A'),
                school.get('school.zip', 'N/A'),
                school.get('school.school_url', 'N/A'),
                school.get('latest.student.size', 'N/A'),
                school.get('latest.aid.pell_grant_rate', 'N/A'),
                school.get('latest.aid.median_debt.completers.overall', 'N/A'),
                school.get('latest.cost.attendance.academic_year', 'N/A')
            ])
            
    print(f"[COMPLETE] Federal Dataset securely saved to: {output_file}")

if __name__ == "__main__":
    main()
