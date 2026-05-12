import json
import os

def sync_to_google_final():
    json_path = "public/psi_question_bank.json"
    output_path = "public/psi_question_bank.jsonl"
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r') as f:
        questions = json.load(f)

    domain_map = {
        "licensing_regulation": "Licensing and Regulation",
        "sanitation_disinfection_safety": "Health and Safety Responsibilities of the Practitioner",
        "hair_scalp_care": "Hair and Scalp Care",
        "haircutting_hairstyling": "Haircutting and Hairstyling",
        "haircoloring": "Haircoloring",
        "chemical_texture_services": "Chemical Texture Services",
        "nail_skin_care": "Nail and Skin Care",
        "shaving": "Shaving and Facial Hair Design"
    }

    with open(output_path, 'w') as f:
        for q in questions:
            options = q['options']
            if isinstance(options, str):
                try:
                    options = json.loads(options)
                except:
                    pass
            
            # DISCOVERY ENGINE FORMAT: The 'structData' wrapper is mandatory
            discovery_item = {
                "id": q['id'],
                "structData": {
                    "question": q['question'],
                    "options": options,
                    "correct_answer_index": q['correct_index'],
                    "explanation": q['explanation'],
                    "source_reference": q['source_ref'],
                    "difficulty": q['difficulty_level'],
                    "texas_domain": domain_map.get(q['domain'], "General Barbering"),
                    "psi_syntax_text": q['psi_syntax_text'],
                    "institutional_status": "PSI-Enriched Seed"
                }
                # NOTICE: No 'content' field here to avoid proto parsing errors
            }
            f.write(json.dumps(discovery_item) + "\n")

    print(f"✅ Success: Generated WRAPPED {output_path}.")
    print("\nNext step: Upload to GCS and try the 'Structured' import again.")

if __name__ == "__main__":
    sync_to_google_final()
