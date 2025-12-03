import pandas as pd
import json
import re

def parse_question(text):
    # Regex to find (A), (B), (C), (D)
    # We look for (A) followed by anything until (B), etc.
    # The question text is everything before (A)
    
    # Normalize some potential variations like ( A ) or （A）
    text = str(text).replace('（', '(').replace('）', ')')
    
    pattern = r'(.*?)(\(A\).*?)(\(B\).*?)(\(C\).*?)(\(D\).*?)$'
    match = re.search(pattern, text, re.DOTALL)
    
    if match:
        q_text = match.group(1).strip()
        opt_a = match.group(2).replace('(A)', '').strip()
        opt_b = match.group(3).replace('(B)', '').strip()
        opt_c = match.group(4).replace('(C)', '').strip()
        opt_d = match.group(5).replace('(D)', '').strip()
        
        return {
            "question": q_text,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            }
        }
    else:
        # Fallback if regex fails - maybe options are not well formatted
        return {
            "question": text,
            "options": {}
        }

def convert_excel_to_json(excel_path, json_path):
    try:
        # Read excel, assuming no header as per inspection, or maybe header is row 0?
        # Let's assume row 0 is header if it looks like text, but previous output showed data in row 0.
        # Let's try reading with header=None first to be safe.
        df = pd.read_excel(excel_path, header=None)
        
        questions = []
        
        for index, row in df.iterrows():
            # Skip if row seems empty or header-like (if we decide to skip first row later)
            # Assuming columns: 0: ID, 1: Unit, 2: Question+Options, 3: Answer
            
            if pd.isna(row[2]) or pd.isna(row[3]):
                continue
                
            parsed = parse_question(row[2])
            
            # Clean answer - sometimes it might be " (C) " or "C"
            raw_answer = str(row[3]).replace('（', '(').replace('）', ')').strip()
            # Extract just the letter if possible, or keep as is if it's just a letter
            # If answer is like "(C)", extract C
            answer_match = re.search(r'\(?([A-D])\)?', raw_answer)
            correct_answer = answer_match.group(1) if answer_match else raw_answer
            
            q_obj = {
                "id": row[0],
                "unit": row[1],
                "question": parsed['question'],
                "options": parsed['options'],
                "answer": correct_answer
            }
            questions.append(q_obj)
            
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully converted {len(questions)} questions to {json_path}")
        
    except Exception as e:
        print(f"Error converting data: {e}")

if __name__ == "__main__":
    convert_excel_to_json('品管題庫.xlsx', 'questions.json')
