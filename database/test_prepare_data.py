"""Tests of the data preparation pipeline (run with: pytest database)."""

import pandas as pd

from prepare_data import ENERGY_COLUMNS, build_electricity, build_energy, keep_countries


def raw(rows):
    """A small OWID-like frame: every expected column, filled with None unless given."""
    columns = sorted(set(ENERGY_COLUMNS) | {"electricity_generation", "coal_electricity", "gas_electricity",
                                            "oil_electricity", "nuclear_electricity", "hydro_electricity",
                                            "solar_electricity", "wind_electricity", "biofuel_electricity",
                                            "renewables_share_elec", "fossil_share_elec"})
    df = pd.DataFrame([{c: r.get(c) for c in columns} for r in rows])
    # Like pd.read_csv on the real file: every measure column is numeric (empty = NaN).
    for c in columns:
        if c not in ("country", "iso_code"):
            df[c] = pd.to_numeric(df[c])
    return df


def test_keep_countries_drops_aggregates():
    df = raw([
        {"country": "Morocco", "iso_code": "MAR", "year": 2020},
        {"country": "World", "iso_code": "OWID_WRL", "year": 2020},
        {"country": "Africa", "iso_code": None, "year": 2020},
    ])
    assert keep_countries(df)["country"].tolist() == ["Morocco"]


def test_build_energy_keeps_informative_rows_since_1990():
    df = raw([
        {"country": "Morocco", "iso_code": "MAR", "year": 1985, "population": 1, "gdp": 2},
        {"country": "Morocco", "iso_code": "MAR", "year": 2020, "population": 36584208.4,
         "renewables_share_energy": 7.14249},
        {"country": "Morocco", "iso_code": "MAR", "year": 2021, "population": 36954443},  # 1 measure only
    ])
    out = build_energy(df)
    assert out["year"].tolist() == [2020]
    assert out["population"].iloc[0] == 36584208  # whole number
    assert out["renewables_share_energy"].iloc[0] == 7.142  # 3 decimals


def test_build_electricity_needs_a_generation_figure():
    df = raw([
        {"country": "Spain", "iso_code": "ESP", "year": 2022, "electricity_generation": 276.0},
        {"country": "Spain", "iso_code": "ESP", "year": 2023, "electricity_generation": None},
        {"country": "Spain", "iso_code": "ESP", "year": 1999, "electricity_generation": 200.0},
    ])
    assert build_electricity(df)["year"].tolist() == [2022]


def test_no_value_is_invented():
    df = raw([{"country": "Chad", "iso_code": "TCD", "year": 2010, "population": 11.0, "gdp": None,
               "energy_per_capita": 120.5}])
    out = build_energy(df)
    assert pd.isna(out["gdp"].iloc[0])
    assert pd.isna(out["solar_share_energy"].iloc[0])
