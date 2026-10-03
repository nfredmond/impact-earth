"""Rebuild the offline linework. Natural Earth data is public domain."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

revision = 'ca96624a56bd078437bca8184e78163e5039ad19'
base = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{revision}/geojson/'
sources = [
    ('coasts', 'ne_50m_coastline.geojson', '271f1c4c1908312bac6b29d158ea1356544beafc129f260005300913aa5ea283'),
    ('rivers', 'ne_50m_rivers_lake_centerlines.geojson', 'f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51'),
]
data = {}
for key, name, checksum in sources:
    raw = urlopen(base + name).read()
    if hashlib.sha256(raw).hexdigest() != checksum:
        raise ValueError(f'Source checksum changed: {name}')
    lines = []
    for feature in json.loads(raw)['features']:
        geometry = feature['geometry']
        if not geometry:
            continue
        if geometry['type'] == 'LineString':
            lines.append(geometry['coordinates'])
        elif geometry['type'] == 'MultiLineString':
            lines.extend(geometry['coordinates'])
    data[key] = [[[round(x, 4), round(y, 4)] for x, y, *_ in line] for line in lines]
output = Path(__file__).resolve().parents[1] / 'public/data/regional-geography.json'
output.write_text(json.dumps(data, separators=(',', ':')))
print(f'{output}: {output.stat().st_size} bytes')
