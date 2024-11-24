// data.js - 数据处理和存储
const processStations = (data) => {
    try {
        // 处理数据中的前100个站点作为示例
        const sampleStations = data.features.slice(0, 100).map(station => ({
            type: "Feature",
            properties: {
                station_name: station.properties.station_name,
                address: station.properties.street_address,
                city: station.properties.city,
                state: station.properties.state,
                zip: station.properties.zip,
                fuel_type: station.properties.fuel_type_code,
                status: station.properties.status_code,
                connectors: station.properties.ev_connector_types
            },
            geometry: station.geometry
        }));

        return {
            type: "FeatureCollection",
            features: sampleStations
        };
    } catch (error) {
        console.error('Error processing data:', error);
        return null;
    }
};

// 导出处理后的数据
export { processStations };