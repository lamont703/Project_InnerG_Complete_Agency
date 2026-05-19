import pypdf

pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas Repeater Barber Written Exam.pdf'

try:
    reader = pypdf.PdfReader(pdf_repeat)
    print("=== 2026 REPEATER PDF ===")
    print(f"Total pages: {len(reader.pages)}")
    first_page_text = reader.pages[0].extract_text()
    print("--- PAGE 1 SAMPLE ---")
    print(first_page_text[:1500])
except Exception as e:
    print(f"Error reading 2026 Repeater PDF: {e}")
