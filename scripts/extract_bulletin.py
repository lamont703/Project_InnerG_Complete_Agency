import os
import json
import google.generativeai as genai
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def extract_rich_bulletin(input_path, output_path):
    print(f"--- Starting Rich Extraction of {input_path} ---")
    
    if not os.path.exists(input_path):
        print(f"Error: Bulletin not found at {input_path}")
        return

    try:
        reader = PdfReader(input_path)
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() + "\n"

        model = genai.GenerativeModel("models/gemini-2.5-flash-lite")
        
        prompt = f"""
        You are the Lead Compliance Officer for Barber Intelligence. 
        Your task is to convert the attached Texas Barber Bulletin text into an 
        ULTRA-RICH JSON 'Source of Truth' for our AI Diagnostic Engine.

        EXTRACT EVERY SINGLE DETAIL INTO THESE CATEGORIES:
        1. 'exam_blueprint': A domain-by-domain breakdown (Topic Name, Question Count, Percentage).
        2. 'regulatory_codes': Any mention of Texas Administrative Code (TAC) or TDLR specific rules.
        3. 'sanitation_standards': Precise chemical requirements, soaking times, and disinfection steps.
        4. 'licensing_requirements': Hours required, fees, renewal rules, and reciprocal states.
        5. 'exam_logistics': ID requirements, dress codes, and PSI testing center rules.
        6. 'technical_glossary': Any specific barbering terms defined in the bulletin.

        RETURN ONLY RAW JSON. BE EXHAUSTIVE. DO NOT SUMMARIZE; CAPTURE THE RAW NUMBERS.

        TEXT CONTENT:
        {text_content[:30000]} 
        """

        response = model.generate_content(prompt)
        raw_json = response.text.strip().replace("```json", "").replace("```", "")
        
        bulletin_data = json.loads(raw_json)
        
        with open(output_path, "w") as f:
            json.dump(bulletin_data, f, indent=2)
            
        print(f"--- Success! Rich Intelligence saved to {output_path} ---")
        
    except Exception as e:
        print(f"Error during rich extraction: {e}")

if __name__ == "__main__":
    bulletin_path = "public/Texas Barber Bulletin.pdf"
    output_path = "docs/texas_barber_bulletin_truth.json"
    extract_rich_bulletin(bulletin_path, output_path)
