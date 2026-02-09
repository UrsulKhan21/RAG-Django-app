import os
import requests
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# CONFIG
# =========================================================

API_BASE_URL = os.getenv("API_BASE_URL")

if not API_BASE_URL:
    raise RuntimeError("API_BASE_URL is not set in .env")

# Normalize base URL
API_BASE_URL = API_BASE_URL.rstrip("/")

# DummyJSON endpoint
ENDPOINT = "products"

# =========================================================
# API FETCH
# =========================================================

def fetch_api_data() -> list[dict]:
    """
    Fetch raw product data from the API.
    No normalization.
    No transformation.
    No embeddings.

    Returns:
        List of raw product dictionaries.
    """
    url = f"{API_BASE_URL}/{ENDPOINT}"
    print("Fetching API data from:", url)

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = response.json()

    # DummyJSON structure: { products: [...], total, skip, limit }
    products = data.get("products", [])

    if not isinstance(products, list):
        raise ValueError("API response format invalid: 'products' is not a list")

    return products


# =========================================================
# TEST (SAFE)
# =========================================================

if __name__ == "__main__":
    items = fetch_api_data()

    print(f"\nFetched {len(items)} raw items\n")

    # Print only first item for sanity check
    if items:
        print("Sample item keys:", items[0].keys())
