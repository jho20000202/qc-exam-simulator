import pandas as pd

try:
    df = pd.read_excel('品管題庫.xlsx')
    print("Columns:", df.columns.tolist())
    print("First 2 rows:")
    print(df.head(2).to_string())
except Exception as e:
    print(f"Error reading excel: {e}")
