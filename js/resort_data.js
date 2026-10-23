
export async function getSkiResorts() {
    const response = await fetch('./data/ski-resorts.geojson');

    if (!response.ok) {
        throw new Error(`Failed to load resorts: ${response.status}`);
    }

    return response.json();
}