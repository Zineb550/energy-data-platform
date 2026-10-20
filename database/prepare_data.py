"""
Builds the two demo datasets of EnergyInsight from the Our World in Data energy dataset.

    Source : https://github.com/owid/energy-data  (license CC BY 4.0)
    Output : database/data/energy_by_country.csv
             database/data/electricity_mix.csv

Usage (from the project root):

    pip install pandas
    python database/prepare_data.py                      # downloads the latest source file
    python database/prepare_data.py --source owid.csv     # or uses a file already downloaded

Pipeline:
    1. Extract   - read the raw OWID file (about 23,000 rows x 130 columns)
    2. Clean     - keep real countries only (drop aggregates such as "World" or "Africa")
    3. Select    - keep the columns used by the platform, from 1990 (energy) / 2000 (electricity)
    4. Filter    - drop rows that carry (almost) no information
    5. Format    - integers for population and GDP, 3 decimals elsewhere
    6. Load      - write the two CSV files, then report rows, countries and missing values

No value is created or modified: missing values in the output are missing in the source.
"""

import argparse
from pathlib import Path

import pandas as pd

SOURCE_URL = "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv"
OUT_DIR = Path(__file__).resolve().parent / "data"

ENERGY_COLUMNS = [
    "country", "iso_code", "year", "population", "gdp",
    "primary_energy_consumption", "energy_per_capita",
    "fossil_share_energy", "renewables_share_energy", "solar_share_energy",
    "wind_share_energy", "hydro_share_energy", "nuclear_share_energy",
    "carbon_intensity_elec", "greenhouse_gas_emissions",
]

ELECTRICITY_COLUMNS = [
    "country", "year", "electricity_generation",
    "coal_electricity", "gas_electricity", "oil_electricity", "nuclear_electricity",
    "hydro_electricity", "solar_electricity", "wind_electricity", "biofuel_electricity",
    "renewables_share_elec", "fossil_share_elec",
]


def extract(source: str) -> pd.DataFrame:
    print(f"1. Extract  : reading {source}")
    df = pd.read_csv(source)
    print(f"             {len(df):,} rows x {df.shape[1]} columns, years {df.year.min()}-{df.year.max()}")
    return df


def keep_countries(df: pd.DataFrame) -> pd.DataFrame:
    # Aggregates (World, continents, income groups...) have no ISO code,
    # or an OWID-specific code such as "OWID_WRL".
    is_country = df["iso_code"].notna() & ~df["iso_code"].astype(str).str.startswith("OWID")
    countries = df[is_country]
    print(f"2. Clean    : {countries.country.nunique()} countries kept, "
          f"{df[~is_country].country.nunique()} aggregates removed")
    return countries


def build_energy(countries: pd.DataFrame) -> pd.DataFrame:
    df = countries.loc[countries["year"] >= 1990, ENERGY_COLUMNS].copy()

    # A row needs at least 2 measured values (besides country, code and year) to be useful.
    measures = ENERGY_COLUMNS[3:]
    df = df[df[measures].notna().sum(axis=1) >= 2]

    for col in ["population", "gdp"]:
        df[col] = df[col].round(0).astype("Int64")  # Int64 keeps missing values empty
    for col in ENERGY_COLUMNS[5:]:
        df[col] = df[col].round(3)
    return df


def build_electricity(countries: pd.DataFrame) -> pd.DataFrame:
    df = countries.loc[countries["year"] >= 2000, ELECTRICITY_COLUMNS].copy()
    df = df[df["electricity_generation"].notna()]  # no generation figure = no mix to show
    for col in ELECTRICITY_COLUMNS[2:]:
        df[col] = df[col].round(3)
    return df


def report(name: str, df: pd.DataFrame) -> None:
    missing = df.isna().sum().sum() / df.size * 100
    print(f"             {name}: {len(df):,} rows x {df.shape[1]} columns, "
          f"{df.country.nunique()} countries, years {df.year.min()}-{df.year.max()}, "
          f"{missing:.1f}% missing cells")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare the EnergyInsight demo datasets.")
    parser.add_argument("--source", default=SOURCE_URL, help="URL or path of owid-energy-data.csv")
    args = parser.parse_args()

    countries = keep_countries(extract(args.source))

    print("3-5. Select, filter and format")
    energy = build_energy(countries)
    electricity = build_electricity(countries)
    report("energy_by_country", energy)
    report("electricity_mix  ", electricity)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    energy.to_csv(OUT_DIR / "energy_by_country.csv", index=False)
    electricity.to_csv(OUT_DIR / "electricity_mix.csv", index=False)
    print(f"6. Load     : files written to {OUT_DIR}")
    print("Next step  : cd backend && npm run db:setup")


if __name__ == "__main__":
    main()
