from hash_utils import hash_item

def api_item_to_text(item: dict) -> str:
    return (
        f"Product: {item.get('title')}\n"
        f"Brand: {item.get('brand')}\n"
        f"Category: {item.get('category')}\n"
        f"Description: {item.get('description')}\n"
        f"Price: {item.get('price')}"
    )

def normalize_api_data(items: list[dict]) -> list[dict]:
    normalized = []

    for item in items:
        normalized.append({
            "id": str(item["id"]),            # stable ID
            "text": api_item_to_text(item),
            "hash": hash_item(item),
            "source": "dummyjson_api",
        })

    return normalized
