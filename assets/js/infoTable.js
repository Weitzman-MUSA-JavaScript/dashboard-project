export function populateInfoTable(properties, columnDisplayMapping) {
    const infoTableBody = document.querySelector('#info-table tbody');
    infoTableBody.innerHTML = '';

    if (!properties) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.textContent = 'Click on map to select a location.';
        row.appendChild(cell);
        infoTableBody.appendChild(row);
        return;
    }

    Object.keys(columnDisplayMapping).forEach(key => {
        const row = document.createElement('tr');
        const propCell = document.createElement('td');
        const valueCell = document.createElement('td');

        propCell.textContent = columnDisplayMapping[key];
        valueCell.textContent = properties[key] || 'N/A';

        row.appendChild(propCell);
        row.appendChild(valueCell);
        infoTableBody.appendChild(row);
    });
}
