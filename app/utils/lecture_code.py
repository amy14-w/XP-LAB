import random


def generate_lecture_code() -> str:
    """Generate a random 4-digit lecture code."""
    return f"{random.randint(1000, 9999)}"

