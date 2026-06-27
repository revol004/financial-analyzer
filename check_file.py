import pandas as pd
import os

# Szukaj pliku
files = []
for file in os.listdir("."):
    if file.endswith(".xlsx"):
        files.append(file)
        print(f"Znalazł plik: {file}")

if not files:
    print("Brak plików .xlsx w bieżącym katalogu")
else:
    for filename in files:
        print(f"\n=== Analizuję: {filename} ===")
        try:
            df = pd.read_excel(filename)
            print("Pierwsze 10 wierszy:")
            print(df.head(10).to_string())
            print("\nKolumny:")
            print(df.columns.tolist())
            print("\nTypy danych:")
            print(df.dtypes)
            print(f"\nRozmiar: {df.shape}")
        except Exception as e:
            print(f"Błąd: {e}")
