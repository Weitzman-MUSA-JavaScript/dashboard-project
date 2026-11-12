"""Build the browser data files for the Houston grocer placement tool.

Reads the raw downloads in ../raw and writes small, browser-ready files to
../data. Run from anywhere:  python3 -I scripts/build_data.py
"""

import csv
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'raw'
OUT = ROOT / 'data'
OUT.mkdir(exist_ok=True)

PROJ = 'EPSG:32615'          # UTM 15N, meters
MILE = 1609.344
URBAN_MI, RURAL_MI = 1, 10   # USDA's standard low access thresholds

# ---------------------------------------------------------------- stores
# Store types USDA's Large Retailer Access Map treats as grocery access.
GROCERY_TYPES = {'Supermarket', 'Super Store', 'Large Grocery Store'}
SMALL_GROCER_TYPES = {'Medium Grocery Store', 'Small Grocery Store'}
EXCLUDED_FROM_SRAM = {"Farmers' Market", 'Delivery Route'}
DOLLAR_DRUG = ('FAMILY DOLLAR', 'DOLLAR GENERAL', 'DOLLAR TREE', 'DOLLARTREE',
               'WALGREENS', 'CVS')


def store_category(name, kind):
    upper = name.upper()
    if kind in GROCERY_TYPES:
        return 'grocery'
    if kind in SMALL_GROCER_TYPES:
        return 'small'
    if any(upper.startswith(b) for b in DOLLAR_DRUG):
        return 'dollar'
    if kind == 'Convenience Store':
        return 'convenience'
    return 'other'


# Stores are kept by location, not by the county the file lists: everything open
# within 10 miles of the county line. Residents near the edge shop across it, and
# a few stores listed as Harris County actually sit in Fort Bend or Montgomery.
STORE_REACH_MI = 10
with open(RAW / 'snap-retailers' / 'Historical SNAP Retailer Locator Data 2005-2025.csv',
          encoding='utf-8-sig') as f:
    rows = [r for r in csv.DictReader(f)
            if r['State'] == 'TX' and not r['End Date'].strip()
            and r['Store Type'] not in EXCLUDED_FROM_SRAM]

stores = pd.DataFrame({
    'name': [' '.join(r['Store Name'].split()).title() for r in rows],
    'type': [r['Store Type'] for r in rows],
    'addr': [' '.join(f"{r['Street Number']} {r['Street Name']}".split()).title() for r in rows],
    'lon': [float(r['Longitude']) for r in rows],
    'lat': [float(r['Latitude']) for r in rows],
})
stores['cat'] = [store_category(n, t) for n, t in zip(stores.name, stores.type)]
stores = gpd.GeoDataFrame(stores, geometry=gpd.points_from_xy(stores.lon, stores.lat), crs=4326)
harris = gpd.read_file(OUT / 'harris-boundary.geojson').to_crs(PROJ).geometry.unary_union
stores = stores[stores.to_crs(PROJ).within(harris.buffer(STORE_REACH_MI * MILE))].reset_index(drop=True)
stores_m = stores.to_crs(PROJ)
print('stores by category:', stores.cat.value_counts().to_dict())

# ---------------------------------------------------------------- tracts
tracts = gpd.read_file(RAW / 'oz' / 'oz2-nominated-harris.geojson')
tracts['geoid'] = tracts.GEO_ID.str[-11:]
tracts['name'] = tracts.JOIN1.str.replace('Census Tract ', '', regex=False)
tracts['oz_nominated'] = (tracts.EDT_REC == 'YES').astype(int)
tracts['oz_eligible'] = (tracts.FED_RESULT == 'ELIGIBLE').astype(int)

sram_g = pd.read_csv(RAW / 'usda-sram' / 'SRAM General Tract Characteristics Data.csv',
                     dtype={'CensusTract20': str}, encoding='latin-1')
sram_s = pd.read_csv(RAW / 'usda-sram' / 'SRAM Straight Line Distance Data.csv',
                     dtype={'CensusTract20': str}, encoding='latin-1')
sram = sram_g.merge(sram_s, on='CensusTract20', suffixes=('', '_s'))
sram = sram[sram.CensusTract20.str.startswith('48201')].rename(columns={'CensusTract20': 'geoid'})
tracts = tracts.merge(sram[['geoid', 'Urban', 'POP2020', 'OHU2020', 'MedianFamilyIncome',
                            'PovertyRate', 'TractHUNV', 'TractSNAP', 'LowIncomeTracts',
                            'GroupQuartersFlag', 'SD_SRAM_LA1and10', 'SD_SRAM_LILATracts_1And10',
                            'SD_SRAM_lapop1']], on='geoid', how='left')
tracts_m = tracts.to_crs(PROJ)

# ---------------------------------------------------------------- blocks
feats = []
for p in sorted((RAW / 'census-blocks').glob('blocks-*.json')):
    feats += [f['attributes'] for f in json.loads(p.read_text())['features']]
blocks = pd.DataFrame(feats)
blocks['tract'] = blocks.GEOID.str[:11]
blocks = gpd.GeoDataFrame(blocks, geometry=gpd.points_from_xy(
    blocks.INTPTLON.astype(float), blocks.INTPTLAT.astype(float)), crs=4326)
blocks_m = blocks.to_crs(PROJ)
bxy = np.c_[blocks_m.geometry.x, blocks_m.geometry.y]


def nearest_mi(cats):
    pts = stores_m[stores_m.cat.isin(cats)]
    d, _ = cKDTree(np.c_[pts.geometry.x, pts.geometry.y]).query(bxy)
    return d / MILE


blocks['d_grocery'] = nearest_mi({'grocery'})
blocks['d_any'] = nearest_mi({'grocery', 'small', 'dollar', 'convenience', 'other'})

# transit: blocks within a quarter mile of a METRO stop
stops = pd.read_csv(RAW / 'metro-gtfs' / 'stops.txt', dtype=str)
stops = stops[stops.location_type.fillna('0').isin(['0', ''])]
stops_g = gpd.GeoDataFrame(stops, geometry=gpd.points_from_xy(
    stops.stop_lon.astype(float), stops.stop_lat.astype(float)), crs=4326).to_crs(PROJ)
d_stop, _ = cKDTree(np.c_[stops_g.geometry.x, stops_g.geometry.y]).query(bxy)
blocks['d_stop'] = d_stop / MILE

# ---------------------------------------------------------------- tract measures
urban = tracts.set_index('geoid').Urban.fillna(1).astype(int)
blocks['limit'] = np.where(blocks.tract.map(urban).fillna(1) == 1, URBAN_MI, RURAL_MI)
blocks['far_g'] = (blocks.d_grocery > blocks.limit) * blocks.POP100
blocks['far_a'] = (blocks.d_any > blocks.limit) * blocks.POP100
blocks['w_dist'] = blocks.d_grocery * blocks.POP100
blocks['near_stop'] = (blocks.d_stop <= 0.25) * blocks.POP100
agg = blocks.groupby('tract').agg(bpop=('POP100', 'sum'), far_g=('far_g', 'sum'),
                                  far_a=('far_a', 'sum'), w_dist=('w_dist', 'sum'),
                                  near_stop=('near_stop', 'sum'))
tracts = tracts.merge(agg, left_on='geoid', right_index=True, how='left')
for c in ['bpop', 'far_g', 'far_a', 'w_dist', 'near_stop']:
    tracts[c] = tracts[c].fillna(0)


def low_access(far, pop):
    # USDA rule: 500+ people or a third of the tract beyond the distance limit
    return ((far >= 500) | ((pop > 0) & (far / pop.replace(0, np.nan) >= 1 / 3))).astype(int)


tracts['la_grocery'] = low_access(tracts.far_g, tracts.bpop)
tracts['la_any'] = low_access(tracts.far_a, tracts.bpop)
li = tracts.LowIncomeTracts.fillna(0).astype(int)
tracts['lila_grocery'] = tracts.la_grocery * li
tracts['lila_any_ours'] = tracts.la_any * li           # our replication of USDA's new map
tracts['lila_usda'] = tracts.SD_SRAM_LILATracts_1And10.fillna(0).astype(int)

# ---------------------------------------------------------------- grocery spending
# BLS Consumer Expenditure Survey 2024, food at home by income quintile
# (mean income before taxes, mean annual food-at-home spending per household).
CE = json.loads((RAW / 'bls' / 'ce-food-by-quintile.json').read_text())
series = {s['seriesID']: {d['year']: float(d['value']) for d in s['data']}
          for s in CE['Results']['series']}
inc = [series[f'CXUINCBEFTXLB010{q}M']['2024'] for q in range(2, 7)]
food = [series[f'CXUFOODHOMELB010{q}M']['2024'] for q in range(2, 7)]
mfi = tracts.MedianFamilyIncome
tracts['food_hh'] = np.interp(mfi.fillna(np.nanmedian(mfi)), inc, food)
tracts['spend'] = tracts.food_hh * tracts.OHU2020.fillna(0)

# ---------------------------------------------------------------- scores
# Each block's share of its tract's grocery spending, by population.
per_cap = (tracts.set_index('geoid').spend / tracts.set_index('geoid').POP2020).replace(np.inf, 0)
blocks['spend'] = blocks.POP100 * blocks.tract.map(per_cap).fillna(0)
blocks['unserved'] = blocks.d_grocery > blocks.limit

# Population-weighted center of each tract: where a store serving it would sit.
blocks['wx'] = bxy[:, 0] * blocks.POP100
blocks['wy'] = bxy[:, 1] * blocks.POP100
cen = blocks.groupby('tract')[['wx', 'wy', 'POP100']].sum()
cen['x'] = cen.wx / cen.POP100
cen['y'] = cen.wy / cen.POP100

# Viability: grocery spending by unserved residents within 2 miles of that center,
# the market a new store could capture without fighting an existing one for it.
TRADE_MI = 2
tree = cKDTree(bxy)
unserved_spend = blocks.spend.where(blocks.unserved, 0).to_numpy()
cen['market'] = [unserved_spend[idx].sum()
                 for idx in tree.query_ball_point(cen[['x', 'y']].to_numpy(), TRADE_MI * MILE)]
cen_ll = gpd.GeoSeries(gpd.points_from_xy(cen.x, cen.y), crs=PROJ).to_crs(4326)
cen['lon'] = cen_ll.x.to_numpy()
cen['lat'] = cen_ll.y.to_numpy()
tracts = tracts.merge(cen[['market', 'lon', 'lat']], left_on='geoid', right_index=True, how='left')

# Neighborhood label at each tract's center: a City of Houston Super Neighborhood,
# else the city or census-designated place it falls in, else unincorporated county.
SMALL_WORDS = {'of', 'and', 'the'}
ACRONYMS = {'OST', 'IAH'}


def tidy(name):
    words = name.replace('/', ' / ').split()
    out = []
    for i, w in enumerate(words):
        if w in ACRONYMS:
            out.append(w)
        elif i and w.lower() in SMALL_WORDS:
            out.append(w.lower())
        else:
            out.append('-'.join(part.capitalize() for part in w.split('-')))
    return ' '.join(out).replace(' / ', '/')


centers = gpd.GeoDataFrame(cen[['lon', 'lat']], geometry=gpd.points_from_xy(cen.lon, cen.lat), crs=4326)
snb = gpd.read_file(RAW / 'neighborhoods' / 'super-neighborhoods.geojson')[['SNBNAME', 'geometry']]
cities = gpd.read_file(RAW / 'neighborhoods' / 'places-26.geojson')[['BASENAME', 'geometry']]
cdp = gpd.read_file(RAW / 'neighborhoods' / 'places-28.geojson')[['BASENAME', 'geometry']]


def label_from(polys, col):
    hit = gpd.sjoin(centers, polys, how='left', predicate='within')
    return hit[~hit.index.duplicated()][col]


in_city = label_from(cities, 'BASENAME')
hood = label_from(snb, 'SNBNAME').map(lambda n: tidy(n) if isinstance(n, str) else None)
hood = hood.fillna(in_city.where(in_city != 'Houston')).fillna(label_from(cdp, 'BASENAME'))

# Tracts still unnamed sit in unincorporated areas with no census place. Name them
# for the nearest well-known community in USGS's Geographic Names Information System.
# Many GNIS names are old rail stops or crossroads few residents would recognize
# ("Deco", "Hot Wells"), so only communities people still use as place names count.
NEAR_MI = 6
KNOWN_COMMUNITIES = {
    'Addicks', 'Aldine', 'Alief', 'Atascocita', 'Barker', 'Barrett', 'Baytown',
    'Beaumont Place', 'Bellaire', 'Bordersville', 'Cedar Bayou', 'Channelview', 'Cinco Ranch',
    'Clear Lake City', 'Clodine', 'Cloverleaf', 'Crosby', 'Cypress', 'Deer Park', 'Dyersdale',
    'Fairbanks', 'Friendswood', 'Galena Park', 'Highlands', 'Hockley', 'Huffman', 'Humble',
    'Jacinto City', 'Jersey Village', 'Katy', 'Kingwood', 'Klein', 'La Porte',
    'Louetta', 'McNair', 'Mission Bend', 'Missouri City', 'Pasadena', 'Pearland',
    'Seabrook', 'Sheldon', 'South Houston', 'Spring', 'Stafford', 'The Woodlands', 'Tomball',
    'Waller', 'Webster', 'Westfield',
}
gnis = gpd.read_file(RAW / 'neighborhoods' / 'gnis-communities.geojson').explode(index_parts=False)
gnis = gnis[gnis.gaz_name.isin(KNOWN_COMMUNITIES)].drop_duplicates('gaz_name').to_crs(PROJ)
gnis_tree = cKDTree(np.c_[gnis.geometry.x, gnis.geometry.y])
d_gnis, i_gnis = gnis_tree.query(cen[['x', 'y']].to_numpy())
near = pd.Series(np.where(d_gnis / MILE <= NEAR_MI, 'Near ' + gnis.gaz_name.to_numpy()[i_gnis], None),
                 index=cen.index)
hood = hood.fillna(near)
tracts['hood'] = tracts.geoid.map(hood).fillna('Unincorporated Harris County')
tracts['unincorporated'] = tracts.geoid.map(in_city.isna()).fillna(True).astype(int)

# Tracts too small or mostly group quarters (jails, dorms) are not scored.
scored = (tracts.POP2020.fillna(0) >= 500) & (tracts.GroupQuartersFlag.fillna(0) == 0)


def rank(series):
    return series.where(scored).rank(pct=True) * 100


far_share = tracts.far_g / tracts.bpop.replace(0, np.nan)
tracts['need_far'] = rank(tracts.far_g)
tracts['need_nocar'] = rank(tracts.TractHUNV.fillna(0) * far_share.fillna(0))
tracts['need_pov'] = rank(tracts.PovertyRate)
tracts['need'] = tracts[['need_far', 'need_nocar', 'need_pov']].mean(axis=1)
tracts['viability'] = rank(tracts.market)
tracts['leverage'] = np.where(tracts.oz_nominated == 1, 100,
                              np.where(tracts.oz_eligible == 1, 50, 0)).astype(float)
tracts.loc[~scored, ['need', 'viability', 'leverage']] = np.nan

# ---------------------------------------------------------------- write tracts
out = tracts.copy()
out['geometry'] = out.geometry.simplify(0.00025, preserve_topology=True)
out = gpd.GeoDataFrame({
    'geoid': out.geoid,
    'name': out.name,
    'hood': out.hood,
    'unincorporated': out.unincorporated,
    'pop': out.POP2020.fillna(0).astype(int),
    'hh': out.OHU2020.fillna(0).astype(int),
    'mfi': out.MedianFamilyIncome.round(0),
    'pov': out.PovertyRate.round(1),
    'nocar': out.TractHUNV.fillna(0).astype(int),
    'snap': out.TractSNAP.fillna(0).astype(int),
    'urban': out.Urban.fillna(1).astype(int),
    'gq': out.GroupQuartersFlag.fillna(0).astype(int),
    'low_income': li,
    'far_grocery': out.far_g.round(0).astype(int),
    'far_any': out.far_a.round(0).astype(int),
    'dist_grocery': (out.w_dist / out.bpop.replace(0, np.nan)).round(2),
    'near_stop_share': (out.near_stop / out.bpop.replace(0, np.nan)).round(3),
    'la_grocery': out.la_grocery,
    'lila_grocery': out.lila_grocery,
    'lila_usda': out.lila_usda,
    'la_usda': out.SD_SRAM_LA1and10.fillna(0).astype(int),
    'spend': out.spend.round(-3).astype(int),
    'oz_nominated': out.oz_nominated,
    'oz_eligible': out.oz_eligible,
    'market': out.market.round(-3),
    'need': out.need.round(1),
    'need_far': out.need_far.round(0),
    'need_nocar': out.need_nocar.round(0),
    'need_pov': out.need_pov.round(0),
    'viability': out.viability.round(1),
    'leverage': out.leverage,
    'lon': out.lon.round(5),
    'lat': out.lat.round(5),
}, geometry=out.geometry, crs=4326)
out.to_file(OUT / 'tracts.geojson', driver='GeoJSON', COORDINATE_PRECISION=5)

# ---------------------------------------------------------------- write stores
s = stores[stores.cat != 'other']
s_out = gpd.GeoDataFrame(s[['name', 'type', 'addr', 'cat']], geometry=s.geometry, crs=4326)
s_out.to_file(OUT / 'stores.geojson', driver='GeoJSON', COORDINATE_PRECISION=5)

# ---------------------------------------------------------------- Huff model inputs
# Each block's pull toward existing grocery stores: the sum of store size over
# distance squared, for stores within 5 miles. The browser adds new stores to it.
HUFF_MI = 5
MIN_MI = 0.25
SIZE = {'Super Store': 1.5, 'Supermarket': 1.0, 'Large Grocery Store': 0.6}
groc = stores_m[stores_m.cat == 'grocery']
gxy = np.c_[groc.geometry.x, groc.geometry.y]
gsize = groc['type'].map(SIZE).to_numpy()
gtree = cKDTree(gxy)
pull = np.zeros(len(blocks))
for i, idx in enumerate(gtree.query_ball_point(bxy, HUFF_MI * MILE)):
    if idx:
        d = np.maximum(np.hypot(*(gxy[idx] - bxy[i]).T) / MILE, MIN_MI)
        pull[i] = (gsize[idx] / d ** 2).sum()
blocks['pull'] = pull

# ---------------------------------------------------------------- write blocks (compact)
tract_index = {g: i for i, g in enumerate(out.geoid)}
packed = {
    'fields': ['lon', 'lat', 'pop', 'tract', 'd_grocery', 'near_stop', 'pull', 'spend'],
    'rows': [[round(x, 5), round(y, 5), int(p), tract_index[t], round(float(d), 2), int(ns <= 0.25),
              round(float(pl), 3), int(sp)]
             for x, y, p, t, d, ns, pl, sp in zip(blocks.geometry.x, blocks.geometry.y, blocks.POP100,
                                                  blocks.tract, blocks.d_grocery, blocks.d_stop,
                                                  blocks.pull, blocks.spend)],
}
(OUT / 'blocks.json').write_text(json.dumps(packed, separators=(',', ':')))

# ---------------------------------------------------------------- write city limits
city = gpd.read_file(RAW / 'neighborhoods' / 'places-26.geojson')
city = city[city.BASENAME == 'Houston'][['BASENAME', 'geometry']]
city['geometry'] = city.geometry.simplify(0.0003, preserve_topology=True)
city.to_file(OUT / 'houston-city.geojson', driver='GeoJSON', COORDINATE_PRECISION=5)

# ---------------------------------------------------------------- write stops (compact)
(OUT / 'stops.json').write_text(json.dumps(
    [[round(float(x), 5), round(float(y), 5)] for x, y in zip(stops.stop_lon, stops.stop_lat)],
    separators=(',', ':')))

# ---------------------------------------------------------------- summary
print('tracts', len(out), 'population', int(out['pop'].sum()))
print('blocks with no grocery store within 5 miles:', int((blocks.pull == 0).sum()))
print('LILA, USDA official (all SNAP stores):', int(out.lila_usda.sum()))
print('LILA, our replication with all SNAP stores:', int(tracts.lila_any_ours.sum()))
print('LILA, grocery stores only:', int(out.lila_grocery.sum()))
print('low access, grocery only (any income):', int(out.la_grocery.sum()))
print('people beyond limit from grocery:', int(out.far_grocery.sum()),
      '| from any SNAP store:', int(out.far_any.sum()))
print('OZ nominated:', int(out.oz_nominated.sum()), 'eligible:', int(out.oz_eligible.sum()))
print('county food-at-home spending ($B):', round(out.spend.sum() / 1e9, 2))
print('scored tracts:', int(out.need.notna().sum()), '| median market ($M):', round(out.market.median() / 1e6, 1), '| max:', round(out.market.max() / 1e6, 1))
for p in sorted(OUT.iterdir()):
    print(f'{p.name}: {p.stat().st_size / 1e6:.2f} MB')
