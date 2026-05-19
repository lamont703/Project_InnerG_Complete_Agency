import pypdf

pdf_first = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2024 Texas Barber Written Exam Pass-Fail Scores First Time.pdf'
pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2024 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'

try:
    reader_first = pypdf.PdfReader(pdf_first)
    print("=== 2024 FIRST TIME PDF ===")
    print(f"Total pages: {len(reader_first.pages)}")
    first_page_text = reader_first.pages[0].extract_text()
    print("--- PAGE 1 SAMPLE ---")
    print(first_page_text[:1500])
except Exception as e:
    print(f"Error reading 2024 First Time PDF: {e}")

try:
    reader_repeat = pypdf.PdfReader(pdf_repeat)
    print("\n=== 2024 REPEATER PDF ===")
    print(f"Total pages: {len(reader_repeat.pages)}")
    first_page_text = reader_repeat.pages[0].extract_text()
    print("--- PAGE 1 SAMPLE ---")
    print(first_page_text[:1500])
except Exception as e:
    print(f"Error reading 2024 Repeater PDF: {e}")
