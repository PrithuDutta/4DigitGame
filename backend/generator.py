import itertools
import math
import json

TARGET = 10
DIGIT_RANGE = range(10) # Digits 0 through 9

def safe_operations(a, b, hard_mode=False):
    """Yields all possible valid results of combining a and b."""
    yield a + b
    yield a - b
    yield a * b
    if b != 0:
        yield a / b
    
    if hard_mode:
        # Safe Exponents (a^b): Limit base and power to prevent overflow crashes
        if abs(a) < 100 and -6 <= b <= 6 and int(b) == b:
            try:
                yield a ** int(b)
            except (OverflowError, ZeroDivisionError, ValueError):
                pass

def apply_unary(val):
    """Returns a list of values after applying optional unary operations."""
    # Using a set automatically filters out redundancies (e.g., sqrt(1) is just 1)
    results = set([val])
    
    # Factorial (!) - Limit to integers between 0 and 6
    if 0 <= val <= 6 and int(val) == val:
        results.add(float(math.factorial(int(val))))
    
    # Square Root (sqrt) - Limit to non-negative numbers
    if val >= 0:
        results.add(math.sqrt(val))
        
    return list(results)

def can_reach_target(nums, hard_mode=False):
    """Recursively checks if a list of numbers can evaluate to the TARGET."""
    # Base Case: Only one number left
    if len(nums) == 1:
        # Apply unary operations to the final number in hard mode
        final_vals = apply_unary(nums[0]) if hard_mode else [nums[0]]
        for val in final_vals:
            # Use math.isclose to avoid floating point precision errors
            if math.isclose(val, TARGET, rel_tol=1e-9):
                return True
        return False

    # Recursive Case: Pick any two numbers and combine them
    for i in range(len(nums)):
        for j in range(len(nums)):
            if i == j:
                continue
            
            a, b = nums[i], nums[j]
            remaining = [nums[k] for k in range(len(nums)) if k != i and k != j]
            
            # Unary operations apply to a number *before* combining it with another
            a_vals = apply_unary(a) if hard_mode else [a]
            b_vals = apply_unary(b) if hard_mode else [b]

            for av in a_vals:
                for bv in b_vals:
                    for result in safe_operations(av, bv, hard_mode):
                        # The 'result' is passed into the next recursive call, meaning 
                        # apply_unary will automatically apply to the result of this operation
                        # on the next loop (e.g., (1 + 2)! is supported).
                        if can_reach_target(remaining + [result], hard_mode):
                            return True
    return False

def generate_pool():
    pool = {"easy": [], "hard": []}
    
    # Step 1: Pre-calculate the 715 unique sets of 4 digits
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

    # Step 2: Generate all 10,000 string permutations and map them to the results
    print("Mapping results to all 10,000 possible 4-digit numbers...")
    all_strings = [f"{i:04d}" for i in range(10000)] # Generates "0000" to "9999"
    
    for s in all_strings:
        # Convert string like "0402" to a sorted tuple (0, 0, 2, 4) to check our memo dictionary
        digits_tuple = tuple(sorted(int(d) for d in s))
        
        category = memo.get(digits_tuple, "invalid")
        
        if category == "easy":
            pool["easy"].append(s)
            pool["hard"].append(s) # <-- Add it to the hard pool as well!
        elif category == "hard":
            pool["hard"].append(s)

    # Export to JSON
    with open("valid_numbers.json", "w") as f:
        json.dump(pool, f, indent=4)
    
    print(f"\nComplete! Exported to valid_numbers.json")
    print(f"Found {len(pool['easy'])} Easy numbers and {len(pool['hard'])} Hard numbers.")

if __name__ == "__main__":
    generate_pool()