#!/usr/bin/env python

import pdb
import click
import pandas as pd
import geopandas as gpd

@click.command()
@click.argument('es_catchments_file', type=click.File('r'))
@click.argument('ms_catchments_file', type=click.File('r'))
@click.argument('hs_catchments_file', type=click.File('r'))
def make_catchments_geojson(es_catchments_file, ms_catchments_file, hs_catchments_file):
    es_catchments = gpd.read_file(es_catchments_file.name)
    ms_catchments = gpd.read_file(ms_catchments_file.name)
    hs_catchments = gpd.read_file(hs_catchments_file.name)

    catchments_gdf = pd.concat([
        es_catchments[['ES_ID', 'geometry']].rename(mapper={'ES_ID': 'ID'}, axis='columns'),
        es_catchments[['MS_ID', 'geometry']].rename(mapper={'MS_ID': 'ID'}, axis='columns'),
        es_catchments[['HS_ID', 'geometry']].rename(mapper={'HS_ID': 'ID'}, axis='columns'),
    ]).dissolve(by='ID')

    print(catchments_gdf.to_crs('EPSG:4326').to_json())
    # print(f'export default {catchments_gdf.to_crs('EPSG:4326').to_json()};')

if __name__ == '__main__':
    make_catchments_geojson()