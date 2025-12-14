import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

# The two pages to scrape
urls = [
    "https://www.presidency.ucsb.edu/documents/app-categories/spoken-addresses-and-remarks/presidential/inaugural-addresses?items_per_page=60&page=0",
    "https://www.presidency.ucsb.edu/documents/app-categories/spoken-addresses-and-remarks/presidential/inaugural-addresses?items_per_page=60&page=1"
]

base_url = "https://www.presidency.ucsb.edu"

# List to store speeches
speeches = []

for page_url in urls:
    response = requests.get(page_url)
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Find all speech entries
    speech_entries = soup.select("div.views-row")
    
    for entry in speech_entries:
        # Date
        date_tag = entry.select_one("span.date-display-single")
        date = date_tag.get_text(strip=True) if date_tag else None
        
        # Title
        title_tag = entry.select_one(".field-title a")
        title = title_tag.get_text(strip=True) if title_tag else None
        
        # Link to full speech
        link = base_url + title_tag["href"] if title_tag else None
        
        # President
        pres_tag = entry.select_one(".margin-top p a")
        president = pres_tag.get_text(strip=True) if pres_tag else None
        
        # Now, fetch full speech text
        if link:
            speech_response = requests.get(link)
            speech_soup = BeautifulSoup(speech_response.text, "html.parser")
            
            # The speech text is inside <div class="field-docs-content"> under <p> tags
            paragraphs = speech_soup.select("div.field-docs-content p")
            full_text = "\n".join(p.get_text(strip=True) for p in paragraphs)
            
            speeches.append({
                "date": date,
                "title": title,
                "president": president,
                "link": link,
                "text": full_text
            })
            
            time.sleep(0.5)  # Be polite to the server

# Convert to DataFrame
df = pd.DataFrame(speeches)

# Save to CSV
df.to_csv("inaugural_speeches.csv", index=False)

print("Scraping completed! Saved as inaugural_speeches.csv")
