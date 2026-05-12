import os
import json
import google.generativeai as genai
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_ai_tags(pdf_path):
    """Uses Gemini to identify topics and keywords in a PDF chunk."""
    try:
        reader = PdfReader(pdf_path)
        # Extract text from first 3 and last 3 pages to get the topic range
        text_sample = ""
        total_pages = len(reader.pages)
        pages_to_read = [0, 1, 2, total_pages-3, total_pages-2, total_pages-1]
        
        for p in pages_to_read:
            if 0 <= p < total_pages:
                text_sample += reader.pages[p].extract_text() + "\n"

        model = genai.GenerativeModel("models/gemini-2.5-flash-lite")
        prompt = f"""
        Analyze this text from a Barbering Textbook section. 
        Identify all major subjects covered (there may be multiple).
        Return a JSON object with:
        - 'topics': list of strings
        - 'keywords': list of strings
        - 'summary': a 1-sentence description of what this section covers
        
        TEXT SAMPLE:
        {text_sample[:4000]}
        """
        
        response = model.generate_content(prompt)
        # Clean up the response to get raw JSON
        raw_json = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(raw_json)
    except Exception as e:
        print(f"Warning: AI tagging failed for {pdf_path}: {e}")
        return {"topics": ["General Barbering"], "keywords": [], "summary": "Institutional textbook section"}

def generate_metadata_jsonl(directory_path, output_file):
    files = sorted([f for f in os.listdir(directory_path) if f.endswith(".pdf")])
    
    # We use "a" (append) mode to be safe, but wipe first
    if os.path.exists(output_file):
        os.remove(output_file)

    for filename in files:
        print(f"Enriching {filename} with AI Intelligence...")
        filepath = os.path.join(directory_path, filename)
        
        try:
            part_num = int(filename.split("_")[-1].split(".")[0])
        except:
            part_num = 0
        
        start_page = ((part_num - 1) * 50) + 1
        end_page = part_num * 50
        
        ai_data = get_ai_tags(filepath)
        
        metadata_entry = {
            "id": f"milady-part-{part_num}",
            "structData": {
                "source": "Milady Standard Barbering 6th Edition",
                "part": part_num,
                "page_range": f"{start_page}-{end_page}",
                "category": "Institutional Textbook",
                "topics": ai_data.get("topics", []),
                "keywords": ai_data.get("keywords", []),
                "summary": ai_data.get("summary", ""),
                "institutional_alignment": "TDLR Barber Exam Standards"
            },
            "content": {
                "mimeType": "application/pdf",
                "uri": f"gs://barbe-exam-storage/{filename}"
            }
        }
        
        with open(output_file, "a") as f:
            f.write(json.dumps(metadata_entry) + "\n")
            
    print(f"\n--- Success! Enriched metadata.jsonl generated at {output_file} ---")

if __name__ == "__main__":
    split_dir = "public/milady_split"
    output_path = os.path.join(split_dir, "metadata.jsonl")
    generate_metadata_jsonl(split_dir, output_path)
