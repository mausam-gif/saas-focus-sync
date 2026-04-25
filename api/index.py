import sys
import os

# Add the root directory (parent of api/) to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from main import app
except Exception as e:
    print(f"Error loading main app: {e}")
    raise e
