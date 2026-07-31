import itertools
import math
import sqlite3

TARGET = 10
DIGIT_RANGE = range(10)

def safe_operations(a, b, hard_mode=False):
    """Yields all possible valid results of combining a and b."""
    yield a + b
    yield a - b
    yield a * b
    if b != 0:
        yield a / b
    
    if hard_mode:
        # 1. Safe Exponents (a^b)
        if abs(a) < 100 and -6 <= b <= 6 and int(b) == b:
            try:
                yield a ** int(b)
            except (OverflowError, ZeroDivisionError, ValueError):
                pass

# 2. Safe Nth Root (b-th root of a)
        if b != 0 and a >= 0:
            # Safely skip zero to a negative power before evaluating
            if a == 0 and b < 0:
                pass
            else:
                try:
                    root_val = a ** (1.0 / b)
                    
                    # Snap to integer if it's exceptionally close to prevent floating-point drift
                    if math.isclose(root_val, round(root_val), rel_tol=1e-9):
                        yield float(round(root_val))
                    else:
                        yield root_val
                except (OverflowError, ZeroDivisionError, ValueError, TypeError):
                    pass

def apply_unary(val):
    """Returns a list of values after applying optional unary operations."""
    results = set([val])
    
    # Factorial (!)
    if 0 <= val <= 6 and int(val) == val:
        results.add(float(math.factorial(int(val))))
    
    # Square Root (sqrt)
    if val >= 0:
        results.add(math.sqrt(val))
        
    return list(results)

def can_reach_target(nums, hard_mode=False):
    """Recursively checks if a list of numbers can evaluate to the TARGET."""
    if len(nums) == 1:
        final_vals = apply_unary(nums[0]) if hard_mode else [nums[0]]
        for val in final_vals:
            # Skip complex numbers if they somehow leaked through
            if isinstance(val, complex):
                continue
            if math.isclose(val, TARGET, rel_tol=1e-9):
                return True
        return False

    for i in range(len(nums)):
        for j in range(len(nums)):
            if i == j:
                continue
            
            a, b = nums[i], nums[j]
            remaining = [nums[k] for k in range(len(nums)) if k != i and k != j]
            
            a_vals = apply_unary(a) if hard_mode else [a]
            b_vals = apply_unary(b) if hard_mode else [b]

            for av in a_vals:
                for bv in b_vals:
                    for result in safe_operations(av, bv, hard_mode):
                        if can_reach_target(remaining + [result], hard_mode):
                            return True
    return False

def generate_and_seed_db():
    print("Calculating unique mathematical combinations...")
    unique_sets = list(itertools.combinations_with_replacement(DIGIT_RANGE, 4))
    memo = {}
    
    for combo in unique_sets:
        nums = list(combo)
        if can_reach_target(nums, hard_mode=False):
            memo[combo] = "easy"
        elif can_reach_target(nums, hard_mode=True):
            memo[combo] = "hard"
        else:
            memo[combo] = "invalid"

    print("Mapping results to all 10,000 possible 4-digit numbers...")
    all_strings = [f"{i:04d}" for i in range(10000)]
    
    easy_count = 0
    hard_count = 0

    # Connect directly to the SQLite database
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    # Clear existing valid pools for config_id = 1 so we don't insert duplicates
    cursor.execute("DELETE FROM valid_pools WHERE config_id = 1")

    insert_data = []
    
    for s in all_strings:
        digits_tuple = tuple(sorted(int(d) for d in s))
        category = memo.get(digits_tuple, "invalid")
        
        if category == "easy":
            # Append to both easy and hard pools
            insert_data.append((1, s, "easy"))
            insert_data.append((1, s, "hard"))
            easy_count += 1
            hard_count += 1
        elif category == "hard":
            # Append only to the hard pool
            insert_data.append((1, s, "hard"))
            hard_count += 1

    print("Writing to SQLite database...")
    cursor.executemany(
        "INSERT INTO valid_pools (config_id, number_string, difficulty) VALUES (?, ?, ?)",
        insert_data
    )
    
    conn.commit()
    conn.close()
    
    print(f"\nComplete! Data has been refreshed in the game.db file.")
    print(f"Found {easy_count} Easy numbers and {hard_count} Hard numbers.")

if __name__ == "__main__":
    generate_and_seed_db()