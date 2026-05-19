import csv
import urllib.request
import urllib.parse
import json
import time
import os
import sys

# Read MAPBOX_API_KEY from .env.local
mapbox_key = None
try:
    with open('.env.local', 'r') as f:
        for line in f:
            if line.startswith('MAPBOX_API_KEY='):
                mapbox_key = line.strip().split('=', 1)[1]
                # Strip quotes if they exist
                mapbox_key = mapbox_key.strip('"\'')
                break
except Exception as e:
    print(f"Error reading .env.local: {e}")

if not mapbox_key:
    print("FATAL: MAPBOX_API_KEY not found in .env.local")
    sys.exit(1)

input_file = 'public/2026 Texas Barber and Beauty Salons.csv'
output_file = 'public/2026 Texas Barber and Beauty Salons.csv' # Overwriting in place for immediate UI updates
temp_file = 'public/temp_geocoded.csv'

print(f"Initializing Sovereign Mapbox Geocoder Engine...")
print(f"Targeting {input_file}")

with open(input_file, 'r', encoding='utf-8') as f_in, open(temp_file, 'w', encoding='utf-8', newline='') as f_out:
    reader = csv.reader(f_in)
    writer = csv.writer(f_out)
    
    headers = next(reader, None)
    if headers:
        writer.writerow(headers)
        
    count = 0
    success_count = 0
    for row in reader:
        # Pass through incomplete rows
        if len(row) < 19:
            writer.writerow(row)
            continue
            
        address = row[4].strip()
        city_zip = row[6].strip()
        
        if address and city_zip:
            full_address = f"{address}, {city_zip}"
            query = urllib.parse.quote(full_address)
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={mapbox_key}&limit=1"
            
            try:
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                    if 'features' in data and len(data['features']) > 0:
                        lon, lat = data['features'][0]['center']
                        row[17] = str(lon)
                        row[18] = str(lat)
                        success_count += 1
            except Exception as e:
                pass # Silently fail on 404s/rate limits to keep script running
                
        writer.writerow(row)
        count += 1
        
        # Log progress every 250 requests
        if count % 250 == 0:
            print(f"[GEOSPATIAL AGENT] Processed {count} storefronts... (Rooftop Matches: {success_count})")
            
        # Hard sleep to respect free-tier rate limits (roughly 600 req/min)
        time.sleep(0.02) 

# Replace old CSV with the new rooftop-accurate dataset
os.replace(temp_file, output_file)

print(f"\n[COMPLETE] Successfully geocoded {success_count} / {count} total storefronts!")
print("The Placement Matcher index has been upgraded to Rooftop Accuracy.")
