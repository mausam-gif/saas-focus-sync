import os
import sys

# Get the directory where this file is located
api_dir = os.path.dirname(os.path.abspath(__file__))
# Get the root directory of the project
root_dir = os.path.dirname(api_dir)

# Ensure both are in sys.path
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Import the app from the api package
from main import app
