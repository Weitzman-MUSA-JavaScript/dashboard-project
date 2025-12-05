import geopandas as gpd
from pathlib import Path

# 当前脚本所在文件夹
BASE_DIR = Path(__file__).parent

# shp 文件路径
shp_path = BASE_DIR / "RAW" / "data.shp"

# 检查文件是否存在
if not shp_path.exists():
    raise FileNotFoundError(f"Shapefile not found: {shp_path}")

# 读取 shapefile
gdf = gpd.read_file(shp_path)

# 导出为 GeoJSON，放在同一目录下
geojson_path = BASE_DIR / "data.geojson"
gdf.to_file(geojson_path, driver="GeoJSON")

print(f"GeoJSON saved to: {geojson_path}")
