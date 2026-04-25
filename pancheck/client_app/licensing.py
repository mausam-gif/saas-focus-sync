import uuid
import hashlib
import json
import base64
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

# A secret key used to sign/encrypt the license keys. 
# IN PRODUCTION: This should be kept very secure and not hardcoded in plain text.
SECRET_SALT = b'PanCheck_Premium_2024_Security_Salt_V1'
MASTER_KEY = b'GH9oNTE8QT5tytKGmcWrOPd3GPvfrFxs7q1G-eyO9Dg=' # 32-byte base64 encoded key

def get_hwid():
    """Generates a unique hardware ID for the current machine."""
    # Using uuid.getnode() as a base, combined with some system info for uniqueness
    node = uuid.getnode()
    hwid = hashlib.sha256(str(node).encode()).hexdigest()[:16].upper()
    return hwid

def generate_key(days):
    """
    Admin function to generate a new license key.
    The key encodes the number of valid days.
    """
    f = Fernet(MASTER_KEY)
    data = {
        "days": days,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "nonce": uuid.uuid4().hex[:8] # Prevent identical keys for same days
    }
    json_data = json.dumps(data).encode()
    encrypted = f.encrypt(json_data)
    return encrypted.decode()

def validate_activation(key_str):
    """
    Validates a key and returns the number of days it grants.
    """
    try:
        f = Fernet(MASTER_KEY)
        decrypted = f.decrypt(key_str.encode())
        data = json.loads(decrypted.decode())
        return data.get("days", 0)
    except Exception:
        return None

def save_activation_record(days):
    """
    Creates a local activation file tied to this HWID.
    """
    expiry = datetime.now() + timedelta(days=days)
    record = {
        "hwid": get_hwid(),
        "expiry": expiry.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Encrypt the record locally so user can't easily edit it
    f = Fernet(MASTER_KEY)
    encrypted = f.encrypt(json.dumps(record).encode())
    
    with open(".activation", "wb") as f_out:
        f_out.write(encrypted)
    return True

def check_local_license():
    """
    Returns (is_valid, message)
    """
    try:
        if not os.path.exists(".activation"):
            return False, "Not Activated"
            
        with open(".activation", "rb") as f_in:
            encrypted = f_in.read()
            
        f = Fernet(MASTER_KEY)
        decrypted = f.decrypt(encrypted)
        record = json.loads(decrypted.decode())
        
        # Check HWID
        if record.get("hwid") != get_hwid():
            return False, "Hardware Mismatch"
            
        # Check Expiry
        expiry = datetime.strptime(record.get("expiry"), "%Y-%m-%d %H:%M:%S")
        if datetime.now() > expiry:
            return False, f"Expired on {expiry.strftime('%Y-%m-%d')}"
            
        days_left = (expiry - datetime.now()).days
        return True, f"Active ({days_left} days left)"
        
    except Exception as e:
        return False, "Invalid License Record"

import os
