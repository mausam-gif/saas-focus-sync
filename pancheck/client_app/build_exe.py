import os
import subprocess
import sys
import customtkinter

# Get the path to customtkinter dynamically
ctk_path = os.path.dirname(customtkinter.__file__)

# PyInstaller command
params = [
    'pyinstaller',
    '--noconsole',                  # No black box window
    '--onefile',                    # Single EXE (optional, use --onedir for faster startup)
    '--name=PanCheck',              # The Name of your Software
    f'--add-data={ctk_path};customtkinter', # Bundles all necessary GUI files
    'main.py'                       # Entry point
]

print("Starting build process...")
try:
    subprocess.run(params, check=True)
except Exception as e:
    print(f"\nError building EXE: {e}")
    sys.exit(1)

print("\n===========================================")
print("SUCCESS! Your EXE is in the 'dist' folder.")
print("===========================================")
