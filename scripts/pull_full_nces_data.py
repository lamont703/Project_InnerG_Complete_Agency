import urllib.request
import json
import sys
import time

API_KEY = "DEMO_KEY"
BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json"

# Removed the 'fields' parameter entirely to pull the complete payload
params = {
    "school.state": "TX",
    "school.degrees_awarded.predominant": "1",
    "per_page": "100",
    "api_key": API_KEY
}

output_file = "public/2026_Texas_Barber_Cosmetology_Full_NCES_Data.json"

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
    
    # When requesting the full payload, the data is heavily nested (e.g., school -> name)
    filtered_data = [
        school for school in data 
        if any(kw in str(school.get('school', {}).get('name', '')).lower() for kw in keywords)
    ]
    
    print(f"Extraction complete! Found {len(filtered_data)} matching Barber/Cosmetology schools.")
    print(f"Writing complete deep-dive JSON payload to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_data, f, indent=4)
            
    print(f"[COMPLETE] Federal JSON Dataset securely saved.")

if __name__ == "__main__":
    main()
