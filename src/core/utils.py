import secrets

def generate_4digit_number():
    """Generate a truly random 4-digit number (0000-9999)."""
    return str(secrets.randbelow(10000)).zfill(4)
