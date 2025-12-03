import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_kaggle_auth():
    """
    Setup Kaggle authentication from environment variables or .env file.
    """
    # Check if standard Kaggle env vars are set
    if os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"):
        print("✅ Found KAGGLE_USERNAME and KAGGLE_KEY in environment.")
        return True
    
    # Check for the custom KAGGLE_API_TOKEN provided by user
    # Format: KGAT_... (This seems to be a custom or new format, or maybe just a single key)
    # If the user provided a single token, we might need to ask for clarification, 
    # but for now let's check if kaggle.json exists in the default location.
    
    kaggle_dir = Path.home() / ".kaggle"
    kaggle_json = kaggle_dir / "kaggle.json"
    
    if kaggle_json.exists():
        print(f"✅ Found kaggle.json at {kaggle_json}")
        return True
        
    print("❌ No Kaggle authentication found.")
    print("Please set KAGGLE_USERNAME and KAGGLE_KEY in your .env file")
    print("OR place kaggle.json in ~/.kaggle/")
    return False

def download_dataset(dataset_name, output_dir):
    """
    Download a dataset from Kaggle using the API.
    """
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        
        print(f"⬇️ Downloading {dataset_name} to {output_dir}...")
        api.dataset_download_files(dataset_name, path=output_dir, unzip=True)
        print(f"✅ Successfully downloaded {dataset_name}")
        
    except Exception as e:
        print(f"❌ Failed to download {dataset_name}: {e}")

def main():
    if not setup_kaggle_auth():
        sys.exit(1)
        
    # Define datasets to download
    # Format: "owner/dataset-name"
    datasets = [
        ("wearetheworld/explore-pakistans-property-landscape", "data/raw/explore_pakistan"),
        ("hassanamin/pakistan-urban-real-estate-data", "data/raw/urban_real_estate"),
        ("mfaaris/housing-prices-in-pakistan-2023", "data/raw/housing_prices_2023"),
        ("hassanamin/housing-prices-in-lahore", "data/raw/lahore_housing"),
        # Macro datasets
        ("limritz/pakistan-inflation-rate-1960-2024", "data/raw/macro/inflation"),
        # Note: SBP Policy Rate might not be on Kaggle, we might need to fetch it manually or find a dataset
    ]
    
    # Create base data directory
    Path("data/raw").mkdir(parents=True, exist_ok=True)
    
    for dataset, path in datasets:
        output_path = Path(path)
        output_path.mkdir(parents=True, exist_ok=True)
        download_dataset(dataset, output_path)

if __name__ == "__main__":
    main()
