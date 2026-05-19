import pypdf

pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2025 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'
pdf_first = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2025 Texas Barber Written Exam Pass-Fail Scores First Time.pdf'

for name, path in [("Repeaters", pdf_repeat), ("First Time", pdf_first)]:
    try:
        reader = pypdf.PdfReader(path)
        print(f"\n=== {name} ===")
        print(f"Total pages: {len(reader.pages)}")
        first_page_text = reader.pages[0].extract_text()
        print("--- PAGE 1 SAMPLE ---")
        print(first_page_text[:1500])
    except Exception as e:
        print(f"Error reading {name}: {e}")
