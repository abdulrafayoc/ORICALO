import os
import sys
import pandas as pd
import httpx
from bs4 import BeautifulSoup
import asyncio
from pathlib import Path
from tqdm import tqdm
import json

# Configuration
DATASET_DIR = Path("data/rag")
OUTPUT_PATH = Path("data/processed/rag_corpus.jsonl")
IMAGES_DIR = Path("data/processed/images")
MERGED_CSV = Path("data/processed/merged_rag_dataset.csv")
ENABLE_SCRAPE = os.getenv("RAG_ENABLE_SCRAPE", "0") == "1"

async def scrape_url(client, url):
    """
    Scrape the Zameen.com URL for full description and image.
    """
    try:
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract Description (This selector might need adjustment based on actual page structure)
        # Zameen.com usually puts description in a specific div
        description_div = soup.find('div', {'aria-label': 'Property description'})
        description = description_div.get_text(strip=True) if description_div else ""
        
        # Extract Image
        # Look for og:image or first property image
        og_image = soup.find('meta', property='og:image')
        image_url = og_image['content'] if og_image else None
        
        return {
            "full_description": description,
            "image_url": image_url
        }
    except Exception as e:
        # print(f"Error scraping {url}: {e}")
        return None

async def process_batch(urls):
    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as client:
        tasks = [scrape_url(client, url) for url in urls]
        return await asyncio.gather(*tasks)

def _first_series(df: pd.DataFrame, names: list[str], default=None) -> pd.Series:
    for n in names:
        if n in df.columns:
            return df[n]
    return pd.Series([default] * len(df), index=df.index)

def _parse_numeric_series(s: pd.Series) -> pd.Series:
    if s.dtype.kind in ("i", "u", "f"):
        return s
    return pd.to_numeric(s.astype(str).str.extract(r"([0-9]+\.?[0-9]*)")[0], errors="coerce")

def _unify_one(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    out = pd.DataFrame(index=df.index)

    out["Link"] = _first_series(df, ["Link", "url"]).fillna("")
    out["City"] = _first_series(df, ["City", "city"]).fillna("")
    out["Province"] = _first_series(df, ["Province"])  # may be NaN
    out["Property Type"] = _first_series(df, ["Property Type", "type"]).fillna("")
    out["Short Desc"] = _first_series(df, ["Short Desc", "title"]).fillna("")
    out["Long Desc"] = _first_series(df, ["Long Desc"])  # may be NaN
    out["Price in words"] = _first_series(df, ["Price in words"])  # may be NaN
    out["Price"] = _first_series(df, ["Price", "price"])
    out["Bedrooms"] = _parse_numeric_series(_first_series(df, ["Bedrooms", "bedrooms"]))
    out["Baths"] = _parse_numeric_series(_first_series(df, ["Baths", "baths"]))
    out["Size (in Zameen.com)"] = _first_series(df, ["Size (in Zameen.com)", "area"])  # e.g., "10 Marla"
    # Area normalization helpers
    area_type = _first_series(df, ["Area Type (Marla, Kanal)"])
    if "area" in df.columns:
        deduced_type = df["area"].astype(str).str.extract(r"(Marla|Kanal)")[0]
    else:
        deduced_type = pd.Series([None] * len(df), index=df.index)
    out["Area Type (Marla, Kanal)"] = area_type.fillna(deduced_type)

    size_mk = _first_series(df, ["Size (Marla, Kanal)"])
    if "area" in df.columns:
        deduced_size = pd.to_numeric(df["area"].astype(str).str.extract(r"([0-9]+\.?[0-9]*)")[0], errors="coerce")
    else:
        deduced_size = pd.Series([None] * len(df), index=df.index)
    out["Size (Marla, Kanal)"] = pd.to_numeric(size_mk, errors="coerce").fillna(deduced_size)

    out["Location"] = _first_series(df, ["Location"]).fillna("")
    out["Long Location"] = _first_series(df, ["Long Location", "address"]).fillna("")
    out["Latitude"] = _first_series(df, ["Latitude"])  # may be NaN
    out["Longitude"] = _first_series(df, ["Longitude"])  # may be NaN
    out["Creation_date"] = _first_series(df, ["Creation_date", "date_added"])  # str or "Added: ..."
    out["Updation_date"] = _first_series(df, ["Updation_date"])  # may be NaN
    out["Area_SqFt"] = pd.to_numeric(_first_series(df, ["Area_SqFt", "area_sqft"]), errors="coerce")
    out["Property_Id"] = _first_series(df, ["Property_Id"])  # may be NaN

    return out

def ingest_data():
    # 1. Load Dataset
    dataset_files = sorted(list(DATASET_DIR.glob("zameen-com-dataset*.csv")))
    if not dataset_files:
        print(f"❌ No dataset files found in {DATASET_DIR}. Expected files like 'zameen-com-dataset_1.csv'")
        return
    print(f"Found {len(dataset_files)} dataset file(s): {[p.name for p in dataset_files]}")
    unified: list[pd.DataFrame] = []
    for p in dataset_files:
        raw = pd.read_csv(p)
        unified.append(_unify_one(raw))
    df = pd.concat(unified, ignore_index=True)
    print(f"Loaded {len(df)} unified records.")
    
    # Filter for valid URLs
    # User mentioned: Long Desc, Short Desc, Price in words, Society/Sector
    # We need to check if 'url' exists. If not, we might not be able to scrape images easily unless we construct it or if it's in another column.
    # Let's check columns first.
    print(f"Columns: {df.columns.tolist()}")
    
    if 'Link' not in df.columns:
        print("⚠️ 'url' or 'Link' column not found. Checking for alternatives...")
        # If no URL, we can't scrape images, but we can still create embeddings from text.
        # For now, let's assume we proceed with text only if URL is missing.
        urls = []
        url_col = None
    else:
        url_col = 'Link'
        urls = df[url_col].tolist()
        
    # Create output directory
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    MERGED_CSV.parent.mkdir(parents=True, exist_ok=True)
    
    # Process all rows; scraping is optional via ENV
    results = []
    if url_col and ENABLE_SCRAPE:
        loop = asyncio.get_event_loop()
        batch_size = 32
        for start in tqdm(range(0, len(df), batch_size), desc="Scraping"):
            batch_urls = [u for u in df.iloc[start:start+batch_size][url_col].tolist() if isinstance(u, str) and u]
            scraped_data = loop.run_until_complete(process_batch(batch_urls)) if batch_urls else []
            # Map url -> scraped payload
            url_map = {}
            for j, u in enumerate(batch_urls):
                if j < len(scraped_data) and scraped_data[j]:
                    url_map[u] = scraped_data[j]
            # Merge back by URL
            for i in range(start, min(start + batch_size, len(df))):
                record = df.iloc[i].to_dict()
                u = record.get(url_col)
                if isinstance(u, str) and u in url_map:
                    record.update(url_map[u])
                results.append(record)
    else:
        results = df.to_dict('records')
    
    # Save to JSONL
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        for item in results:
            # Handle NaN values for JSON serialization
            clean_item = {k: (v if pd.notna(v) else None) for k, v in item.items()}
            f.write(json.dumps(clean_item) + '\n')
            
    print(f"✅ Saved {len(results)} enriched records to {OUTPUT_PATH}")
    df.to_csv(MERGED_CSV, index=False)
    print(f"✅ Saved merged dataset to {MERGED_CSV}")
    
    # Optionally build vector index
    try:
        # Ensure 'backend' is in sys.path so we can import rag.vector_store when run as a script
        backend_dir = Path(__file__).resolve().parents[1]
        if str(backend_dir) not in sys.path:
            sys.path.append(str(backend_dir))
        from rag.vector_store import build_index_from_jsonl
        count, cname = build_index_from_jsonl(corpus_path=OUTPUT_PATH)
        print(f"✅ Vector index built in collection '{cname}' with {count} items.")
    except Exception as e:
        print(f"⚠️ Skipped vector index build: {e}")

if __name__ == "__main__":
    ingest_data()
