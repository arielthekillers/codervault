// public/assets/js/components/SearchIndex.js
export class SearchIndex {
    /**
     * Executes strict string scanning parameters across local runtime properties
     * @param {string} rawQuery - Text input from Command Palette
     * @param {Object} appState - Global state reference payload
     */
    static query(rawQuery, appState) {
        const q = rawQuery.toLowerCase().trim();
        if (!q) return [];

        let matches = [];

        // 1. Scan Project Context Footprints
        appState.projects.forEach(p => {
            if (p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))) {
                matches.push({ type: 'Project', label: p.name, desc: p.description, action: () => VaultEngine.switchProject(p.id) });
            }
        });

        // 2. Scan Items within the currently active workspace bundle
        appState.items.forEach(item => {
            let fieldMatch = false;
            if (item.fields) {
                fieldMatch = Object.values(item.fields).some(val => String(val).toLowerCase().includes(q));
            }

            if (
                item.title.toLowerCase().includes(q) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.tags && item.tags.toLowerCase().includes(q)) ||
                fieldMatch
            ) {
                matches.push({
                    type: item.type.toUpperCase(),
                    label: item.title,
                    desc: item.description || 'Secure Item Record Assets',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        VaultEngine.inspectItem(item.id);
                    }
                });
            }
        });

        return matches;
    }

    static renderResults(resultsContainer, matches) {
        if (matches.length === 0) {
            resultsContainer.innerHTML = `<div class="p-4 text-center text-muted small">No structural matches found matching the index parameters.</div>`;
            return;
        }

        resultsContainer.innerHTML = matches.map((m, index) => `
            <div class="p-3 border-bottom border-secondary search-result-item d-flex justify-content-between align-items-center cursor-pointer ${index === 0 ? 'bg-dark text-white' : ''}" data-index="${index}">
                <div>
                    <span class="badge bg-dark border border-secondary text-primary me-2 text-uppercase" style="font-size:10px;">${m.type}</span>
                    <strong class="text-white small d-block d-md-inline-block">${m.label}</strong>
                    <div class="text-muted small mt-1 text-truncate" style="max-width: 500px;">${m.desc}</div>
                </div>
                <i class="bi bi-arrow-return-left text-muted small opacity-50"></i>
            </div>
        `).join('');
    }
}