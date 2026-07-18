export class FormBuilder {
    static renderFields(schemaConfig, existingValues = {}, isEdit = false) {
        let html = '<div class="row">';
        if (!schemaConfig || !schemaConfig.fields) return '';

        schemaConfig.fields.forEach(field => {
            const val = existingValues[field.name] || field.default || '';
            const isReq = field.required ? 'required' : '';
            html += `<div class="${field.width ? field.width : 'col-12'} mb-3">
                <label class="form-label small text-muted mb-1">${field.label}</label>`;

            if (field.type === 'list') {
                let tasks = [];
                try {
                    tasks = val ? JSON.parse(val) : [];
                } catch (e) {
                    tasks = [];
                }
                const fieldId = `list_${field.name}`;
                html += `
                <input type="hidden" data-field="${field.name}" id="${fieldId}" value="${escapeHtml(val)}">
                <div class="list-container" id="container_${fieldId}">
                    ${tasks.map((t, idx) => FormBuilder.renderListItem(fieldId, idx, t.text, t.completed)).join('')}
                </div>
                <div class="input-group mt-2">
                    <input type="text" class="form-control form-control-vault" id="new_${fieldId}" onkeydown="if(event.key==='Enter') { event.preventDefault(); FormBuilder.addListItem('${fieldId}'); }">
                    <button class="btn btn-outline-secondary border-secondary" type="button" onclick="FormBuilder.addListItem('${fieldId}')" title="Tambah">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
                `;
            } else if (field.type === 'textarea') {
                html += `
                <div class="position-relative input-group">
                    <textarea data-field="${field.name}" class="form-control form-control-vault" rows="16" ${isReq} style="resize: vertical;">${val}</textarea>
                </div>`;
            } else {
                const isPassword = field.type === 'password' || field.revealable;
                const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
                const inputType = isPassword ? (isFirefox ? 'password' : 'text') : field.type;
                const maskStyle = (isPassword && !isFirefox) ? '-webkit-text-security: disc;' : '';
                
                html += `<div class="input-group">`;
                html += `<input type="${inputType}" data-field="${field.name}" class="form-control form-control-vault ${isPassword ? 'secure-field' : ''}" style="${maskStyle}" value="${val}" ${isPassword ? 'autocomplete="new-password"' : 'autocomplete="off"'} data-lpignore="true" spellcheck="false" ${isReq}>`;
                
                if (isPassword) {
                    html += `
                    <button class="btn btn-outline-secondary border-secondary" type="button" onclick="VaultUI.toggleReveal(this)" title="Lihat/Sembunyikan">
                        <i class="bi bi-eye"></i>
                    </button>`;
                }
                
                if (field.type === 'url' && isEdit) {
                    html += `
                    <button class="btn btn-outline-secondary border-secondary" type="button" onclick="VaultUI.openLink(this)" title="Buka Tautan">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>`;
                }
                
                if (isEdit) {
                    html += `
                        <button class="btn btn-outline-secondary border-secondary" type="button" onclick="VaultUI.copyToClipboard(this)" title="Salin">
                            <i class="bi bi-clipboard"></i>
                        </button>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });
        html += '</div>';
        return html;
    }

    static renderListItem(fieldId, idx, text, completed) {
        const textStyle = completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);';
        return `
        <div class="d-flex align-items-center mb-2 list-item-row" data-idx="${idx}">
            <input class="form-check-input me-2 mt-0" type="checkbox" ${completed ? 'checked' : ''} onchange="FormBuilder.updateListState('${fieldId}')" style="cursor: pointer;">
            <input type="text" class="form-control form-control-vault form-control-sm me-2 list-item-text" value="${escapeHtml(text)}" style="${textStyle}" onchange="FormBuilder.updateListState('${fieldId}')">
            <button class="btn btn-sm btn-outline-danger border-secondary" type="button" onclick="this.closest('.list-item-row').remove(); FormBuilder.updateListState('${fieldId}')">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        `;
    }

    static addListItem(fieldId) {
        const input = document.getElementById(`new_${fieldId}`);
        if (!input || !input.value.trim()) return;
        const container = document.getElementById(`container_${fieldId}`);
        const idx = container.querySelectorAll('.list-item-row').length;
        
        container.insertAdjacentHTML('beforeend', FormBuilder.renderListItem(fieldId, idx, input.value.trim(), false));
        input.value = '';
        FormBuilder.updateListState(fieldId);
        input.focus();
    }

    static updateListState(fieldId) {
        const container = document.getElementById(`container_${fieldId}`);
        const hiddenField = document.getElementById(fieldId);
        if (!container || !hiddenField) return;

        const tasks = [];
        container.querySelectorAll('.list-item-row').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const textInput = row.querySelector('.list-item-text');
            tasks.push({
                text: textInput.value,
                completed: checkbox.checked
            });
            textInput.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
            textInput.style.color = checkbox.checked ? 'var(--text-muted)' : 'var(--text-primary)';
        });
        hiddenField.value = JSON.stringify(tasks);
    }
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

if (typeof window !== 'undefined') {
    window.FormBuilder = FormBuilder;
}