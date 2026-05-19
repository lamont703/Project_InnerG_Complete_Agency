import pypdf

pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2024 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'

reader = pypdf.PdfReader(pdf_repeat)
for page_idx, page in enumerate(reader.pages):
    text = page.extract_text()
    if '70052132' in text:
        print(f"Page {page_idx + 1} has 70052132:")
        for line in text.split('\n'):
            if '70052132' in line or 'HAIRSTYLING' in line or 'EDDIE' in line:
                print(f"  {line}")
