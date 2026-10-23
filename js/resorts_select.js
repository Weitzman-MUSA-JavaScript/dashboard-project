function initResortsSelect(el, resorts, onSelect, onFilter) {
    const listEl = el.querySelector('#resort-list');
    const searchEl = el.querySelector('#resort-search');

    const filters = [...el.querySelectorAll('.range-filter')].map((container) => {
        const key = container.dataset.filter;
        const values = resorts
            .map((resort) => Number(resort.properties[key]))
            .filter(Number.isFinite);

        const min = Math.floor(Math.min(...values));
        const max = Math.ceil(Math.max(...values));
        const minInput = container.querySelector('[data-bound="min"]');
        const maxInput = container.querySelector('[data-bound="max"]');
        const output = container.querySelector('output');

        for (const input of [minInput, maxInput]) {
            input.min = min;
            input.max = max;
        }

        minInput.value = min;
        maxInput.value = max;

        return { key, minInput, maxInput, output };
    });

    function applyFilters() {
        const searchValue = searchEl.value.toLowerCase();

        const filteredResorts = resorts.filter((resort) => {
            const properties = resort.properties;
            const name = (properties.name || '').toLowerCase();

            return name.includes(searchValue) && filters.every((filter) => {
                const value = Number(properties[filter.key]);

                return Number.isFinite(value)
                    && value >= Number(filter.minInput.value)
                    && value <= Number(filter.maxInput.value);
            });
        });

        listEl.innerHTML = '';

        for (const resort of [...filteredResorts].sort((a, b) =>
            (a.properties.name || '').localeCompare(b.properties.name || '')
        )) {
            const name = resort.properties.name || 'Unnamed resort';
            const item = document.createElement('li');
            const label = document.createElement('label');
            const radio = document.createElement('input');

            radio.type = 'radio';
            radio.name = 'resort';
            radio.value = name;
            radio.addEventListener('change', () => onSelect(resort));

            label.append(radio, ` ${name}`);
            item.append(label);
            listEl.append(item);
        }

        onFilter(filteredResorts);
    }

    for (const filter of filters) {
        const updateFilter = (changedInput) => {
            if (changedInput === filter.minInput) {
                filter.minInput.value = Math.min(
                    Number(filter.minInput.value),
                    Number(filter.maxInput.value)
                );
            } else {
                filter.maxInput.value = Math.max(
                    Number(filter.maxInput.value),
                    Number(filter.minInput.value)
                );
            }

            filter.output.textContent =
                `${filter.minInput.value} - ${filter.maxInput.value}`;

            applyFilters();
        };

        filter.minInput.addEventListener('input', () => updateFilter(filter.minInput));
        filter.maxInput.addEventListener('input', () => updateFilter(filter.maxInput));
        filter.output.textContent =
            `${filter.minInput.value} - ${filter.maxInput.value}`;
    }

    searchEl.addEventListener('input', applyFilters);
    applyFilters();
}

export { initResortsSelect };