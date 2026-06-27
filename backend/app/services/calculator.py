"""
Calculator service for financial indicator computations.

This module provides functions to safely evaluate financial formulas
using company financial data with built-in mathematical functions.
"""

import math


def calculate_indicator(formula: str, variables: dict) -> float | None:
    """
    Calculates financial indicator based on formula and variable values.

    Safely evaluates mathematical expressions with restricted access to:
    - Mathematical functions: max, min, abs, round, sqrt, log, log10, pow, exp
    - Financial variables passed in the variables dict

    Args:
        formula: String containing Python expression (e.g., "NET_INCOME / TOTAL_ASSETS")
        variables: Dictionary mapping variable names to their values
                  (e.g., {"NET_INCOME": 1000000, "TOTAL_ASSETS": 5000000})

    Returns:
        Calculated result rounded to 4 decimal places, or None if calculation fails
        (division by zero, undefined variables, etc.)

    Examples:
        >>> calculate_indicator("100 / 50", {})
        2.0
        >>> calculate_indicator("NET_INCOME / TOTAL_ASSETS", {"NET_INCOME": 1000, "TOTAL_ASSETS": 5000})
        0.2
        >>> calculate_indicator("1 / 0", {})
        None  # Division by zero
    """
    try:
        # Słownik bezpiecznych funkcji matematycznych dostępnych w formułach
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

        # Połączenie funkcji matematycznych i zmiennych finansowych
        context = {**safe_functions, **variables}

        # Bezpieczna ocena formuły - zakazuję wbudowanych funkcji dla bezpieczeństwa
        result = eval(formula, {"__builtins__": {}}, context)

        # Zwróć wynik zaokrąglony do 4 miejsc po przecinku
        return round(float(result), 4)

    except ZeroDivisionError:
        # Dzielenie przez zero - zwróć None zamiast błędu
        return None

    except Exception:
        # Każdy inny błąd (nieznana zmienna, błęd składni, itp.) - zwróć None
        return None
