import os
from PyPDF2 import PdfReader, PdfWriter

def split_pdf(input_path, pages_per_chunk=50):
    if not os.path.exists(input_path):
        print(f"Error: File not found at {input_path}")
        return

    reader = PdfReader(input_path)
    total_pages = len(reader.pages)
    print(f"Processing '{input_path}' - Total Pages: {total_pages}")

    # Create output directory
    output_dir = "public/milady_split"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for start_page in range(0, total_pages, pages_per_chunk):
        writer = PdfWriter()
        end_page = min(start_page + pages_per_chunk, total_pages)
        
        for page_num in range(start_page, end_page):
            writer.add_page(reader.pages[page_num])
        
        output_filename = f"{output_dir}/milady_part_{start_page // pages_per_chunk + 1}.pdf"
        with open(output_filename, "wb") as output_file:
            writer.write(output_file)
        
        print(f"Created: {output_filename} (Pages {start_page+1} to {end_page})")

    print("\n--- Success! All chunks are in public/milady_split ---")
    print("Action: Upload the files in this folder to your GCS bucket and re-index the Data Store.")

if __name__ == "__main__":
    # Update this path to where your Milady PDF is located locally
    milady_path = "public/Milady Barber Book 6th Edition.pdf"
    split_pdf(milady_path)
