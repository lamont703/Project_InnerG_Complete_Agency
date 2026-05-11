import json
import re

def clean_psi_text(text):
    # Regex to find numbered lists like 1. 2. 3. 4. or a. b. c. d. and remove them
    # Usually they start after a newline
    pattern = r'\n\n?\s*\d[\.)].*$'
    # Also look for 1. 2. 3. 4. without newlines just in case
    cleaned = re.sub(pattern, '', text, flags=re.DOTALL).strip()
    return cleaned

def clean_and_regenerate(json_path, sql_path):
    with open(json_path, 'r') as f:
        questions = json.load(f)
    
    sql_statements = []
    for q in questions:
        q['psi_syntax_text'] = clean_psi_text(q['psi_syntax_text'])
        
        # Escape single quotes for SQL
        psi_text = q['psi_syntax_text'].replace("'", "''")
        statement = f"UPDATE question_bank SET psi_syntax_text = '{psi_text}' WHERE id = '{q['id']}';"
        sql_statements.append(statement)
    
    # Save cleaned JSON back
    with open(json_path, 'w') as f:
        json.dump(questions, f, indent=2)
        
    # Save SQL
    with open(sql_path, 'w') as f:
        f.write("\n".join(sql_statements))
    
    print(f"Cleaned JSON and regenerated SQL update script at {sql_path}")

if __name__ == "__main__":
    clean_and_regenerate("public/psi_question_bank.json", "scripts/update_question_bank.sql")
