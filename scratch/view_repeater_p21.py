import pypdf

pdf_repeat = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/2024 Texas Barber Written Exam Pass-Fail Scores Repeaters.pdf'

reader = pypdf.PdfReader(pdf_repeat)
p21 = reader.pages[20].extract_text()
print("=== PAGE 21 LINES ===")
for idx, line in enumerate(p21.split('\n')):
    print(f"{idx}: {line}")
