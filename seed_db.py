import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

print("Connecting to MongoDB Atlas...")
client = MongoClient(MONGO_URI)

# Connect to database 'lazylens' and collection 'templates'
db = client["lazylens"]
collection = db["templates"]

# Agent Task: Locate the actual local JSON file containing our 135 templates in the repo.
# Update this variable to match the correct relative path.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else "."
TEMPLATES_FILE_PATH = os.path.join(SCRIPT_DIR, "templates.json")
if not os.path.exists(TEMPLATES_FILE_PATH):
    TEMPLATES_FILE_PATH = "templates.json"


try:
    with open(TEMPLATES_FILE_PATH, "r", encoding="utf-8") as file:
        templates_data = json.load(file)
        
    if isinstance(templates_data, dict) and "presets" in templates_data:
        templates_data = templates_data["presets"]

    # Clear collection to prevent duplicate entries on multiple runs
    collection.delete_many({})
    
    # Insert data
    if isinstance(templates_data, list):
        collection.insert_many(templates_data)
        print(f"Success! Migrated {collection.count_documents({})} templates to MongoDB Atlas.")
    else:
        print("Data Format Error: JSON root must be a list.")

except FileNotFoundError:
    print(f"File Error: Could not find {TEMPLATES_FILE_PATH}. Check the file path.")
except Exception as e:
    print(f"Database Error: {e}")
