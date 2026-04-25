"""
Vercel Python Serverless Entry Point.
This file is served as a Python Lambda by Vercel when routes match /api/v1/*.
"""
import sys
import os

# Add the PROJECT ROOT to sys.path so all modules (core, db, schemas, routes_conf) are found
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from main import app
