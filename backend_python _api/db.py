import json
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from bson.objectid import ObjectId
from flask import g

# Load environment variables
load_dotenv()

# MongoDB JSON encoder for handling ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super(MongoJSONEncoder, self).default(obj)

# Global client variable
_client = None

def get_db():
    """
    Returns a connection to the MongoDB database.
    Creates a singleton client if it doesn't exist yet.
    """
    global _client
    
    if _client is None:
        # Get MongoDB URI from environment variable
        mongo_uri = "mongodb+srv://shivakalyankar13:mD7QOn59htxQ7RgV@cluster0.6ljm9.mongodb.net/myDatabase?retryWrites=true&w=majority&tls=true"
        if not mongo_uri:
            raise ValueError("MONGODB_URI environment variable not set")
        
        # Create MongoDB client
        _client = MongoClient(mongo_uri)
    
    # Get database from client
    db_name =  "space_station_storage"
    db = _client[db_name]
    
    return db

def close_db():
    """
    Closes the MongoDB connection.
    """
    global _client
    
    if _client is not None:
        _client.close()
        _client = None