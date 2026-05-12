import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(".env.local")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_psi_version(question_obj):
    """Translates a single question into PSI Syntax."""
    model = genai.GenerativeModel("models/gemini-2.5-flash-lite")
    
    prompt = f"""
    You are a PSI Exam Syntax Specialist for the Texas Barber State Board.
    Your task is to REWRITE the following question into 'PSI Syntax'.
    
    RULES:
    1. Avoid common industry terms (e.g., use 'nonporous implement' instead of 'spatula').
    2. Use strict qualifiers like 'FIRST', 'NEXT', or 'BEST' in ALL CAPS.
    3. Use technical/medical phrasing (e.g., 'pediculosis' instead of 'lice').
    4. Add 'Scenario Noise': Wrap the question in a brief story about a client (e.g., 'A client named Marcus...').
    5. Ensure the correct answer (Index {question_obj['correct_index']}) remains the SAME.
    6. DO NOT change the options. ONLY rewrite the question text itself.
    
    ORIGINAL QUESTION:
    {question_obj['question']}
    
    EXPLANATION FOR CONTEXT:
    {question_obj['explanation']}
    
    Return ONLY the rewritten question string. No other text.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip().replace('"', "'")
    except Exception as e:
        print(f"Error generating PSI version: {e}")
        return question_obj['question']

def process_all_questions(input_json_path, output_path):
    with open(input_json_path, 'r') as f:
        questions = json.load(f)
    
    results = []
    total = len(questions)
    
    print(f"Starting PSI Translation for {total} questions...")
    
    for i, q in enumerate(questions):
        print(f"[{i+1}/{total}] Processing ID: {q['id']}...")
        psi_text = get_psi_version(q)
        q['psi_syntax_text'] = psi_text
        results.append(q)
        
        # Small sleep to respect rate limits
        if (i + 1) % 10 == 0:
            time.sleep(2)
            
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n--- SUCCESS! PSI-ified bank generated at {output_path} ---")

if __name__ == "__main__":
    # We will assume the input is a temporary file we just saved
    input_path = "scripts/temp_seed_questions.json"
    output_path = "public/psi_question_bank.json"
    process_all_questions(input_path, output_path)
