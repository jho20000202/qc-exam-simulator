import pandas as pd

try:
    df = pd.read_excel('品管題庫.xlsx', header=None)
    print("First 3 rows:")
    print(df.head(3).to_string())
except Exception as e:
    print(f"Error reading excel: {e}")
