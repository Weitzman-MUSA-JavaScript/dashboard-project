#!/usr/bin/env python

import click
import csv
import json


@click.command()
@click.argument('school_list_file', type=click.File('r'))
def make_schools_json(school_list_file):
    reader = csv.DictReader(school_list_file)
    data = [
        {
            # The ULCS Code appears to be the de facto ID that the school
            # district uses across datasets.
            'sdp_id': row['ULCS Code'],

            # There are three name columns: 'School Name (ULCS)', 'Publication
            # Name', and 'Publication Name Alpha List'. The ULCS name is
            # all-caps and not most readable. The alpha list name is weird, but
            # useful for alphabetizing. The publication name is most readable
            # and most suitable as a school label
            'name': row['Publication Name'],
            'sort_name': row['Publication Name Alpha List'],
            'abbr_name': row['Abbreviated Name'],

            # The GPS Location is a single string, lat/lng, separated by a
            # comma and a space.
            'geom': {
                'type': 'Point',
                'coordinates': [
                    float(c)
                    for c in row['GPS Location'].split(',')
                ][::-1],
            },

            'Year Opened': row['Year Opened'],
            'School Level': row['School Level'],
            'Admission Type': row['Admission Type'],
            'Current Grade Span Served': row['Current Grade Span Served'],
            'Grade Span at Scale': row['Grade Span at Scale'],
            'Phasing-In': row['Phasing-In'],
            'Phasing-Out': row['Phasing-Out'],
            'Governance': row['Governance'],
            'Management Organization': row['Management Organization'],
            'School Reporting Category': row['School Reporting Category'],
            'Alternate Education Type': row['Alternate Education Type'],
            'Major Intervention': row['Major Intervention'],
            'Major Intervention Year': row['Major Intervention Year'],
            'Community School Cohort': row['Community School Cohort'],
            'CTE Status': row['CTE Status'],
            'Title I Designation': row['Title I Designation'],
            'Federal Accountability Designation': row['Federal Accountability Designation'],
            'City Council District': row['City Council District'],
            'Multiple Addresses': row['Multiple Addresses'],
            'Street Address': row['Street Address'],
            'City': row['City'],
            'State': row['State'],
            'Zip Code': row['Zip Code'],
            'Phone Number': row['Phone Number'],
            'Fax Number': row['Fax Number'],
            'Website': row['Website'],
            'School Leader Name': row['School Leader Name'],
            'Learning Network': row['Learning Network'],
            'Assistant Superintendent': row['Assistant Superintendent'],
            'FACE Liaison Name': row['FACE Liaison Name'],
            'FACE Liaison Email': row['FACE Liaison Email'],
            'FACE Liaison Phone Number': row['FACE Liaison Phone Number'],

            'Grade K': row['Grade K'],
            'Grade 1': row['Grade 1'],
            'Grade 2': row['Grade 2'],
            'Grade 3': row['Grade 3'],
            'Grade 4': row['Grade 4'],
            'Grade 5': row['Grade 5'],
            'Grade 6': row['Grade 6'],
            'Grade 7': row['Grade 7'],
            'Grade 8': row['Grade 8'],
            'Grade 9': row['Grade 9'],
            'Grade 10': row['Grade 10'],
            'Grade 11': row['Grade 11'],
            'Grade 12': row['Grade 12'],
        }
        for row in reader
    ]
    print(json.dumps(data, indent=2))
    # print(f'export default {json.dumps(data, indent=2)};')


if __name__ == '__main__':
    make_schools_json()
