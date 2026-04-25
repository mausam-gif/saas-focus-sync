import sys
import os

try:
    # Add current directory to path
    sys.path.append(os.path.dirname(__file__))
    from main import app
except Exception as e:
    print(f"ERROR LOADING APP: {e}")
    raise e
