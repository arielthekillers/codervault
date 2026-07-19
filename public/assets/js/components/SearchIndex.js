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

        // --- SYSTEM COMMANDS ---
        const systemCommands = [
            {
                aliases: ['logout', 'lock', 'exit'],
                item: {
                    type: 'SYSTEM',
                    label: 'Kunci Vault Sekarang (Logout)',
                    desc: 'Tutup semua data dan tampilkan layar kunci PIN',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        VaultEngine.logout();
                    }
                }
            },
            {
                aliases: ['darkmode', 'lightmode', 'dark mode', 'light mode', 'theme', 'tema'],
                item: {
                    type: 'SYSTEM',
                    label: 'Ganti Tema (Dark / Light Mode)',
                    desc: 'Beralih antara mode gelap dan mode terang',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        document.getElementById('themeToggleBtn')?.click();
                    }
                }
            },
            {
                aliases: ['add workspace', 'new workspace', 'buat workspace'],
                item: {
                    type: 'SYSTEM',
                    label: 'Buat Workspace Baru',
                    desc: 'Buka formulir pembuatan ruang kerja',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        VaultEngine.openProjectModal();
                    }
                }
            },
            {
                aliases: ['settings', 'pengaturan', 'config'],
                item: {
                    type: 'SYSTEM',
                    label: 'Pengaturan Sistem',
                    desc: 'Buka konfigurasi CoderVault',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        VaultEngine.openSettings();
                    }
                }
            },
            {
                aliases: ['import', 'impor'],
                item: {
                    type: 'SYSTEM',
                    label: 'Import Data (.cvshare)',
                    desc: 'Impor Workspace atau Item yang dibagikan teman Anda',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('importShareModal')).show();
                    }
                }
            },
            {
                aliases: ['help', 'bantuan', '?', 'shortcut', 'shortcuts'],
                item: {
                    type: 'SYSTEM',
                    label: 'Help & Shortcuts',
                    desc: 'Tampilkan panduan perintah Magic Launcher',
                    action: () => {
                        bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('launcherHelpModal')).show();
                    }
                }
            }
        ];

        // Push any system command where the alias starts with the typed query
        systemCommands.forEach(cmd => {
            if (cmd.aliases.some(alias => alias.startsWith(q))) {
                matches.push(cmd.item);
            }
        });
        
        // --- ADD LAUNCHER MODE ---
        if ((q.startsWith('add ') || q === 'add') && q !== 'add workspace') {
            const addQuery = q.replace(/^add\s*/i, '').trim();
            const parts = addQuery.split(/\s+/).filter(w => w);
            const typeQ = parts.length > 0 ? parts[0] : '';
            const projQ = parts.slice(1).join('').toLowerCase();
            const projKeywords = parts.slice(1);
            
            let matchedTypes = [];
            // Match types
            if (appState.itemTypes) {
                Object.keys(appState.itemTypes).forEach(key => {
                    const label = appState.itemTypes[key].label.toLowerCase();
                    if (!typeQ || key.includes(typeQ) || label.includes(typeQ) || label.replace(/\s+/g, '').includes(typeQ)) {
                        matchedTypes.push({ key, label: appState.itemTypes[key].label });
                    }
                });
            } else {
                const defaults = [{key:'login',label:'Login Credential'},{key:'note',label:'Secure Note'},{key:'database',label:'Database'},{key:'server',label:'Server'}];
                matchedTypes = defaults.filter(t => !typeQ || t.key.includes(typeQ) || t.label.toLowerCase().includes(typeQ));
            }

            let matchedProjects = [];
            if (appState.projects) {
                if (!projQ && appState.activeProject) {
                    matchedProjects.push(appState.activeProject);
                } else {
                    appState.projects.forEach(p => {
                    const pNameNoSpace = p.name.replace(/\s+/g, '').toLowerCase();
                    const pNameFull = p.name.toLowerCase();
                    const pDescNoSpace = (p.description || '').replace(/\s+/g, '').toLowerCase();
                    
                    const matchNoSpace = !projQ || pNameNoSpace.includes(projQ) || pDescNoSpace.includes(projQ);
                    const matchKeywords = !projQ || projKeywords.every(kw => pNameFull.includes(kw));
                    
                    if (matchNoSpace || matchKeywords) {
                        matchedProjects.push(p);
                    }
                });
                }
            }

            // Cap the results so it's manageable if there are too many combos
            let combos = 0;
            matchedTypes.forEach(t => {
                matchedProjects.forEach(p => {
                    if (combos > 50) return;
                    combos++;
                    matches.push({
                        type: 'ADD',
                        label: `<span style="color: var(--text-primary); font-weight: 600;">${t.label.toUpperCase()}</span>`,
                        desc: `di dalam workspace <strong>${p.name}</strong>`,
                        action: async () => {
                            bootstrap.Modal.getInstance(document.getElementById('commandPaletteModal'))?.hide();
                            if (!appState.activeProject || appState.activeProject.id !== p.id) {
                                await VaultEngine.switchProject(p.id);
                            }
                            VaultEngine.openItemModal(t.key);
                        }
                    });
                });
            });
            
            return matches;
        }
        // --- END LAUNCHER MODE ---

        let typePrefix = null;
        let searchQuery = q;
        
        // Parse type prefix, e.g. "login: sintesa corp"
        const prefixMatch = q.match(/^([a-z0-9_-]+)\s*:\s*(.*)$/i);
        if (prefixMatch) {
            typePrefix = prefixMatch[1].toLowerCase().trim();
            searchQuery = prefixMatch[2].trim();
        }

        const keywords = searchQuery.split(/\s+/).filter(w => w);
        const searchQueryNoSpace = searchQuery.replace(/\s+/g, '');

        const isMatch = (textObj) => {
            if (!searchQueryNoSpace) return true; // If only prefix was typed
            
            const fullText = Object.values(textObj).filter(v => v).join(' ').toLowerCase();
            const fullTextNoSpace = fullText.replace(/\s+/g, '');
            
            // Match if target contains the query without spaces, OR contains all individual keywords
            const matchNoSpace = fullTextNoSpace.includes(searchQueryNoSpace);
            const matchKeywords = keywords.every(kw => fullText.includes(kw));
            
            return matchNoSpace || matchKeywords;
        };

        // 1. Scan Project Context Footprints
        if (!typePrefix || typePrefix === 'project') {
            appState.projects.forEach(p => {
                if (isMatch({ n: p.name, d: p.description, t: p.tags })) {
                    matches.push({ type: 'Project', label: p.name, desc: p.description, action: () => VaultEngine.switchProject(p.id) });
                }
            });
        }

        // 2. Scan Items within the currently active workspace bundle
        appState.items.forEach(item => {
            const itemTypeName = appState.itemTypes && appState.itemTypes[item.type] ? appState.itemTypes[item.type].label.toLowerCase() : item.type.toLowerCase();
            
            // If prefix specified, must match item type code OR item type label
            if (typePrefix && !item.type.toLowerCase().includes(typePrefix) && !itemTypeName.includes(typePrefix)) {
                return;
            }

            let textObj = {
                t: item.title,
                d: item.description,
                tags: item.tags
            };
            if (item.fields) {
                Object.keys(item.fields).forEach(k => {
                    textObj['f_' + k] = item.fields[k];
                });
            }

            if (isMatch(textObj)) {
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

        resultsContainer.innerHTML = matches.map((m, index) => {
            let badgeBg = 'var(--bg-dark-edge)';
            let badgeBorder = 'var(--border-color)';
            let badgeColor = 'var(--text-muted)';
            
            const t = (m.type || '').toUpperCase();
            if (t === 'ADD') {
                badgeBg = 'rgba(16, 185, 129, 0.1)';
                badgeBorder = 'rgba(16, 185, 129, 0.3)';
                badgeColor = 'var(--accent-success)';
            } else if (t === 'SYSTEM') {
                badgeBg = 'rgba(239, 68, 68, 0.1)';
                badgeBorder = 'rgba(239, 68, 68, 0.3)';
                badgeColor = 'var(--accent-danger)';
            } else if (t === 'PROJECT') {
                badgeBg = 'rgba(59, 130, 246, 0.1)';
                badgeBorder = 'rgba(59, 130, 246, 0.3)';
                badgeColor = 'var(--accent)';
            } else {
                badgeBg = 'rgba(168, 85, 247, 0.1)';
                badgeBorder = 'rgba(168, 85, 247, 0.3)';
                badgeColor = '#c084fc';
            }
            
            return `
            <div class="p-2 px-3 border-bottom search-result-item d-flex justify-content-between align-items-center cursor-pointer ${index === 0 ? 'active-search-item bg-secondary bg-opacity-25' : ''}" data-index="${index}" style="border-bottom-color: var(--border-color) !important;">
                <div class="text-truncate d-flex align-items-center flex-grow-1 me-3">
                    <span class="badge me-2 text-uppercase" style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-size:10px;">${m.type}</span>
                    <span class="small fw-semibold" style="color: var(--text-primary);">${m.label}</span>
                    <span class="text-muted small ms-2 text-truncate" style="font-size: 0.8rem; margin-top: 1px;">${m.desc}</span>
                </div>
                <i class="bi bi-arrow-return-left text-muted small opacity-50"></i>
            </div>
            `;
        }).join('');
    }
}