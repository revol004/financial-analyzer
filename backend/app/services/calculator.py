import math


def calculate_indicator(formula: str, variables: dict) -> float | None:
    try:
        safe_functions = {
            "max": max,
            "min": min,
            "abs": abs,
            "round": round,
            "sqrt": math.sqrt,
            "log": math.log,
            "log10": math.log10,
            "pow": math.pow,
            "exp": math.exp,
        }
        context = {**safe_functions, **variables}
        result = eval(formula, {"__builtins__": {}}, context)
        return round(float(result), 4)
    except ZeroDivisionError:
        return None
    except Exception:
        return None
