"""Build small, static dashboard datasets from the local source files.

Run with a Python environment containing pandas, GeoPandas, Shapely, and Pyogrio:
    python scripts/prepare_data.py

All inputs are in data/raw/. Outputs in data/ are suitable for GitHub Pages.
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
FOOT_TO_METRE = 0.3048006096
YEARS = range(2021, 2026)
SOURCE_FILES = {
    year: RAW / ("Philly_incidents_2024.csv" if year == 2024 else f"incidents_{year}.csv")
    for year in YEARS
}
TREND_DTYPE = np.dtype([
    ("year_index", "u1"),
    ("tract_index", "<u2"),
    ("category_index", "u1"),
    ("month", "u1"),
    ("weekday", "u1"),
    ("hour", "u1"),
])


def load_tracts() -> gpd.GeoDataFrame:
    block_groups = gpd.read_file(f"zip://{RAW / 'tl_2024_42_bg.zip'}")
    block_groups = block_groups.loc[
        block_groups["COUNTYFP"].eq("101"), ["GEOID", "geometry"]
    ].copy()
    if block_groups.empty or block_groups["GEOID"].duplicated().any():
        raise ValueError("Philadelphia block-group boundaries are missing or duplicated")
    if not block_groups.geometry.is_valid.all():
        raise ValueError("Invalid block-group geometry")

    # A block group's first 11 GEOID digits identify its parent census tract.
    block_groups["GEOID"] = block_groups["GEOID"].str[:11]
    tracts = block_groups.to_crs(2272).dissolve(by="GEOID", as_index=False)
    if not tracts.geometry.is_valid.all():
        raise ValueError("Dissolved tract geometry is invalid")

    population = pd.read_csv(
        RAW / "acs_2024_5yr_philadelphia_tracts_B01003.csv",
        dtype={"GEOID": "string"},
    )
    required = {"GEOID", "NAME", "B01003_001E", "B01003_001M"}
    if not required.issubset(population.columns):
        raise ValueError(f"Missing ACS fields: {sorted(required - set(population.columns))}")
    if population.GEOID.isna().any() or population.GEOID.duplicated().any():
        raise ValueError("ACS tract GEOIDs are missing or duplicated")
    if population.B01003_001E.isna().any() or (population.B01003_001E < 0).any():
        raise ValueError("ACS tract population must be present and nonnegative")
    if set(tracts.GEOID) != set(population.GEOID):
        raise ValueError("Tract polygons and ACS population GEOIDs do not match")

    tracts = tracts.merge(
        population[["GEOID", "NAME", "B01003_001E", "B01003_001M"]],
        on="GEOID",
        validate="one_to_one",
    )
    tracts = tracts.rename(columns={
        "NAME": "name",
        "B01003_001E": "population",
        "B01003_001M": "population_moe",
    })
    tracts["polygon_area_km2"] = (
        tracts.geometry.area * FOOT_TO_METRE ** 2 / 1_000_000
    )
    return tracts.sort_values("GEOID").reset_index(drop=True)


def load_city_incidents(year: int, city_geometry) -> tuple[gpd.GeoDataFrame, dict]:
    fields = [
        "objectid", "dispatch_date_time", "hour", "text_general_code",
        "location_block", "lat", "lng", "point_x", "point_y",
    ]
    raw = pd.read_csv(SOURCE_FILES[year], usecols=fields,
                      low_memory=False)
    utc = pd.to_datetime(raw.dispatch_date_time, utc=True, errors="coerce")
    local = utc.dt.tz_convert("America/New_York")
    local_year = local.dt.year.eq(year)
    clean = raw.loc[local_year].copy()
    clean_local = local.loc[local_year]

    lon = pd.to_numeric(clean.lng, errors="coerce")
    lat = pd.to_numeric(clean.lat, errors="coerce")
    point_x = pd.to_numeric(clean.point_x, errors="coerce")
    point_y = pd.to_numeric(clean.point_y, errors="coerce")
    valid_coords = (
        lon.between(-75.3, -74.9) & lat.between(39.8, 40.2)
        & (point_x - lon).abs().lt(1e-6)
        & (point_y - lat).abs().lt(1e-6)
    )
    clean["date"] = clean_local.dt.strftime("%Y-%m-%d")
    clean["month"] = clean_local.dt.month
    clean["weekday"] = clean_local.dt.dayofweek  # Monday = 0
    clean["local_hour"] = clean_local.dt.hour

    candidates = gpd.GeoDataFrame(
        clean.loc[valid_coords].copy(),
        geometry=gpd.points_from_xy(lon.loc[valid_coords], lat.loc[valid_coords]),
        crs=4326,
    ).to_crs(2272)
    within_city = candidates.geometry.within(city_geometry)
    points = candidates.loc[within_city].copy()
    quality = {
        "source_rows": len(raw),
        "local_year_rows": len(clean),
        "invalid_or_missing_coordinate_rows": int((~valid_coords).sum()),
        "valid_points_outside_city_boundary": int((~within_city).sum()),
        "geocoded_city_rows": len(points),
        "source_hour_mismatches_local_hour": int(
            pd.to_numeric(clean.hour, errors="coerce").ne(clean.local_hour).sum()
        ),
        "local_first_dispatch": str(clean_local.min()),
        "local_last_dispatch": str(clean_local.max()),
    }
    return points, quality


def main() -> None:
    tracts = load_tracts()
    city = gpd.read_file(RAW / "Philly_City_Limits.geojson").to_crs(2272)
    if len(city) != 1 or not city.geometry.is_valid.all():
        raise ValueError("Unexpected Philadelphia city boundary")
    site = gpd.read_file(RAW / "Rittenhouse_Site_Boundary.shp").to_crs(2272)
    if len(site) != 1 or not site.geometry.is_valid.all():
        raise ValueError("Unexpected Rittenhouse boundary")
    report_site = pd.read_csv(
        RAW / "rittenhouse_crime_2024_report_extract.csv", usecols=["objectid"]
    )
    if report_site.objectid.duplicated().any():
        raise ValueError("Duplicate object IDs in the report's site extract")
    report_site_ids = set(report_site.objectid)
    # Scan category names first so the compact trend file uses one stable index.
    category_names = set()
    for source in SOURCE_FILES.values():
        codes = pd.read_csv(source, usecols=["text_general_code"])
        if codes.text_general_code.isna().any():
            raise ValueError(f"Missing incident categories in {source.name}")
        category_names.update(codes.text_general_code.unique())
    categories = sorted(category_names)
    tract_geoids = tracts.GEOID.tolist()
    category_index = {name: index for index, name in enumerate(categories)}
    tract_index = {geoid: index for index, geoid in enumerate(tract_geoids)}
    if len(categories) > 255 or len(tract_geoids) > 65535 or TREND_DTYPE.itemsize != 7:
        raise ValueError("Trend index exceeds the compact file format")

    static_fields = [
        "GEOID", "name", "population", "population_moe", "polygon_area_km2",
    ]
    summaries = []
    quality_by_year = {}
    category_totals_by_year = {}
    trend_rows = 0
    with (DATA / "trend_2021_2025.bin").open("wb") as trend_file:
        for year in YEARS:
            points, quality = load_city_incidents(year, city.geometry.iloc[0])
            joined = gpd.sjoin(
                points, tracts[["GEOID", "geometry"]], how="left", predicate="within"
            )
            if joined.index.duplicated().any():
                raise ValueError(f"An incident matched multiple tracts in {year}")
            if joined.objectid.duplicated().any():
                raise ValueError(f"Duplicate object IDs in {year}")

            site_flag = pd.Series(pd.NA, index=joined.index, dtype="Int8")
            if year == 2024:
                # Keep the existing report's 745 IDs as the comparison reference.
                if not report_site_ids.issubset(set(joined.objectid)):
                    raise ValueError("Report site IDs are missing from 2024 data")
                site_flag = joined.objectid.isin(report_site_ids).astype("Int8")
                geometric_site = joined.geometry.within(site.geometry.iloc[0])
                quality["rittenhouse_site_rows"] = int(site_flag.sum())
                quality["rittenhouse_membership_difference_from_current_projection"] = int(
                    site_flag.ne(geometric_site).sum()
                )
            block = (
                joined.location_block.fillna("Unknown").str.upper()
                .str.replace(r"\s+", " ", regex=True).str.strip()
            )
            events = pd.DataFrame({
                "id": joined.objectid.astype("int64"),
                "tract_geoid": joined.GEOID.fillna(""),
                "date": joined.date,
                "month": joined.month.astype("int8"),
                "weekday": joined.weekday.astype("int8"),
                "hour": joined.local_hour.astype("int8"),
                "category": joined.text_general_code,
                "lat": joined.lat.round(6),
                "lng": joined.lng.round(6),
                "block": block,
                "rittenhouse_site": site_flag,
            })
            if events.category.isna().any():
                raise ValueError(f"Missing categories in published {year} events")
            mapped = events.loc[events.tract_geoid.ne("")]
            if not set(mapped.tract_geoid).issubset(tract_index):
                raise ValueError(f"Unknown tract in {year}")
            events = events.sort_values(["date", "id"]).reset_index(drop=True)
            events.to_csv(
                DATA / f"incidents_{year}.csv", index=False,
                columns=[
                    "tract_geoid", "month", "weekday", "hour",
                    "category", "lat", "lng", "block",
                ],
            )

            counts = mapped.groupby("tract_geoid").size()
            thefts = mapped.loc[mapped.category.eq("Thefts")].groupby("tract_geoid").size()
            summary = tracts[static_fields].copy()
            summary.insert(0, "year", year)
            summary["incident_count"] = summary.GEOID.map(counts).fillna(0).astype(int)
            summary["theft_count"] = summary.GEOID.map(thefts).fillna(0).astype(int)
            summary["incidents_per_1000_residents"] = (
                summary.incident_count / summary.population.replace(0, float("nan")) * 1000
            )
            summaries.append(summary)

            # One 7-byte record per tract-assigned report. This keeps all filter
            # dimensions available for the five-year chart without downloading
            # five sets of coordinates and block names into the browser.
            compact = np.empty(len(mapped), dtype=TREND_DTYPE)
            compact["year_index"] = year - YEARS.start
            compact["tract_index"] = mapped.tract_geoid.map(tract_index).to_numpy(dtype="uint16")
            compact["category_index"] = mapped.category.map(category_index).to_numpy(dtype="uint8")
            for field in ("month", "weekday", "hour"):
                compact[field] = mapped[field].to_numpy(dtype="uint8")
            compact.tofile(trend_file)
            trend_rows += len(mapped)

            quality["tract_assigned_rows"] = len(mapped)
            quality["tract_unassigned_rows"] = len(events) - len(mapped)
            quality_by_year[str(year)] = quality
            category_totals_by_year[str(year)] = events.category.value_counts().to_dict()
            print(f"{year}: {len(mapped):,} mapped reports; {len(events) - len(mapped):,} unassigned")

    pd.concat(summaries, ignore_index=True).to_csv(DATA / "tract_summary.csv", index=False)

    # Simplification affects display geometry only; joins used full polygons.
    web_tracts = tracts[static_fields + ["geometry"]].copy()
    web_tracts.geometry = web_tracts.geometry.simplify(
        tolerance=25, preserve_topology=True
    )
    (DATA / "tracts.geojson").write_text(
        web_tracts.to_crs(4326).to_json(drop_id=True), encoding="utf-8"
    )
    (DATA / "rittenhouse_boundary.geojson").write_text(
        site.to_crs(4326).to_json(drop_id=True), encoding="utf-8"
    )

    metadata = {
        "years": list(YEARS),
        "default_year": 2025,
        "time_zone": "America/New_York",
        "date_field": "police dispatch date; not necessarily incident occurrence time",
        "geography": "Philadelphia County census tracts, derived from 2024 TIGER/Line block groups",
        "population": "2020-2024 ACS five-year B01003 resident estimate",
        "population_note": "Incidents per resident are contextual ratios, not individual victimization risk; visitors and workers are not in the denominator.",
        "location_note": "Police incident coordinates are generalized to the hundred block.",
        "temporal_note": "Each source is a UTC calendar-year extract. After conversion to Philadelphia time, the last roughly five local hours of December 31 are missing in every selected year. Homicide dispatch hours may be unreliable.",
        "site_note": "Only 2024 retains the 745-ID Rittenhouse report flag. The site is not a dashboard map layer.",
        "tract_count": len(tracts),
        "acs_resident_population_sum": int(tracts.population.sum()),
        "quality_by_year": quality_by_year,
        "category_totals_by_year": category_totals_by_year,
        "trend": {
            "file": "trend_2021_2025.bin",
            "record_count": trend_rows,
            "record_bytes": TREND_DTYPE.itemsize,
            "fields": ["year_index:uint8", "tract_index:uint16_le", "category_index:uint8", "month:uint8", "weekday:uint8", "hour:uint8"],
            "tract_geoids": tract_geoids,
            "categories": categories,
        },
        "sources": {
            "incidents": "https://opendataphilly.org/datasets/crime-incidents/",
            "tract_boundaries": "https://www2.census.gov/geo/tiger/TIGER2024/BG/tl_2024_42_bg.zip",
            "tract_population": "https://api.census.gov/data/2024/acs/acs5/groups/B01003.html",
        },
    }
    (DATA / "metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Trend file: {trend_rows:,} records; {trend_rows * TREND_DTYPE.itemsize:,} bytes")


if __name__ == "__main__":
    main()
