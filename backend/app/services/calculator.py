def calculate_indicator(formula: str, variables: dict) -> float | None:
    try:
        result = eval(formula, {"__builtins__": {}}, variables)
        return round(float(result), 4)
    except ZeroDivisionError:
        return None
    except Exception:
        return None
