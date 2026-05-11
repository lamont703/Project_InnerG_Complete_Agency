import json

def generate_sql(json_path, output_path):
    with open(json_path, 'r') as f:
        questions = json.load(f)
    
    sql_statements = []
    for q in questions:
        # Escape single quotes for SQL
        psi_text = q['psi_syntax_text'].replace("'", "''")
        statement = f"UPDATE question_bank SET psi_syntax_text = '{psi_text}' WHERE id = '{q['id']}';"
        sql_statements.append(statement)
    
    with open(output_path, 'w') as f:
        f.write("\n".join(sql_statements))
    
    print(f"SQL update script generated at {output_path}")

if __name__ == "__main__":
    generate_sql("public/psi_question_bank.json", "scripts/update_question_bank.sql")
