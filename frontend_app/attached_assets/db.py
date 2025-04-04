import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    tls=True,                     # REQUIRED for Atlas SSL handshake
    tlsAllowInvalidCertificates=False  # Leave False unless you are testing locally with self-signed certs
)

db = client["cargo_db"]
items_col = db["items"]
containers_col = db["containers"]
