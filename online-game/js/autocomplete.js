class AccessibleAutocomplete {
    constructor(container, options) {
        this.container = container;
        this.options = {
            items: [],
            onSelect: () => {},
            placeholder: 'Rechercher un pays...',
            onFocus: () => {},
            onBlur: () => {},
            onActiveStateChange: () => {},
            ...options
        };
        
        this.selectedIndex = -1;
        this.isActive = false;
        this.init();
    }

    init() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'autocomplete-wrapper';
        this.wrapper.setAttribute('role', 'combobox');
        this.wrapper.setAttribute('aria-expanded', 'false');
        this.wrapper.setAttribute('aria-haspopup', 'listbox');

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'autocomplete-input';
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-controls', 'autocomplete-list');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.placeholder = this.options.placeholder;

        this.list = document.createElement('ul');
        this.list.className = 'autocomplete-list';
        this.list.setAttribute('role', 'listbox');
        this.list.id = 'autocomplete-list';
        this.list.style.display = 'none';

        this.wrapper.appendChild(this.input);
        this.wrapper.appendChild(this.list);
        this.container.appendChild(this.wrapper);

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.input.addEventListener('input', () => {
            const value = this.input.value.toLowerCase();
            this.showSuggestions(value);
        });

        this.input.addEventListener('keydown', (e) => {
            const items = Array.from(this.list.children);
            const isListVisible = this.list.style.display !== 'none';
            
            switch(e.key) {
                case 'ArrowDown':
                    if (!isListVisible) {
                        e.preventDefault();
                        this.showSuggestions(this.input.value.toLowerCase());
                    } else {
                        e.preventDefault();
                        this.selectedIndex = (this.selectedIndex + 1) % items.length;
                        this.updateSelection();
                    }
                    break;
                    
                case 'ArrowUp':
                    if (isListVisible) {
                        e.preventDefault();
                        this.selectedIndex = this.selectedIndex <= 0 ? items.length - 1 : this.selectedIndex - 1;
                        this.updateSelection();
                    }
                    break;
                    
                case 'Enter':
                    if (isListVisible && this.selectedIndex >= 0) {
                        e.preventDefault();
                        this.selectItem(items[this.selectedIndex].textContent);
                    }
                    break;
                    
                case 'Escape':
                    if (isListVisible) {
                        e.preventDefault();
                        this.hideList();
                    }
                    break;

                case 'Tab':
                    if (isListVisible && this.selectedIndex >= 0) {
                        e.preventDefault();
                        this.selectItem(items[this.selectedIndex].textContent);
                    }
                    break;
            }
        });

        this.input.addEventListener('focus', () => {
            this.options.onFocus();
            this.showSuggestions(this.input.value.toLowerCase());
        });

        this.input.addEventListener('blur', (e) => {
            setTimeout(() => {
                if (!this.wrapper.contains(document.activeElement)) {
                    this.hideList();
                    this.options.onBlur();
                }
            }, 200);
        });

        this.list.addEventListener('mouseover', (e) => {
            const item = e.target.closest('li');
            if (item) {
                this.selectedIndex = Array.from(this.list.children).indexOf(item);
                this.updateSelection();
            }
        });

        this.list.addEventListener('click', (e) => {
            const item = e.target.closest('li');
            if (item) {
                this.selectItem(item.textContent);
            }
        });
    }

    showSuggestions(query) {
        this.list.innerHTML = '';
        const matches = this.options.items.filter(item => 
            item.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length > 0) {
            matches.forEach((item, index) => {
                const li = document.createElement('li');
                li.textContent = item;
                li.setAttribute('role', 'option');
                li.className = 'autocomplete-item';
                li.setAttribute('id', `autocomplete-item-${index}`);
                li.setAttribute('aria-selected', 'false');
                this.list.appendChild(li);
            });

            this.list.style.display = 'block';
            this.wrapper.setAttribute('aria-expanded', 'true');
            
            // Sélectionner automatiquement le premier élément
            this.selectedIndex = 0;
            this.updateSelection();
            this.setActive(true);
        } else {
            this.hideList();
        }
    }

    updateSelection() {
        const items = Array.from(this.list.children);
        items.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected.toString());
        });

        if (this.selectedIndex >= 0) {
            const selectedItem = items[this.selectedIndex];
            selectedItem.scrollIntoView({ block: 'nearest' });
            this.input.setAttribute('aria-activedescendant', selectedItem.id);
        } else {
            this.input.removeAttribute('aria-activedescendant');
        }
    }

    hideList() {
        this.list.style.display = 'none';
        this.wrapper.setAttribute('aria-expanded', 'false');
        this.selectedIndex = -1;
        this.input.removeAttribute('aria-activedescendant');
        this.setActive(false);
    }

    selectItem(value) {
        this.input.value = value;
        this.hideList();
        this.options.onSelect(value);
    }

    setActive(active) {
        if (this.isActive !== active) {
            this.isActive = active;
            this.options.onActiveStateChange(active);
        }
    }

    static get styles() {
        return `
    .autocomplete-wrapper {
        position: relative;
        width: 100%;
        max-width: 400px;
    }

    .autocomplete-input {
        width: 100%;
        padding: 10px;
        font-size: 16px;
        border: 2px solid #ddd;
        border-radius: 4px;
        outline: none;
        transition: border-color 0.2s;
    }

    .autocomplete-input:focus {
        border-color: #4CAF50;
    }

    .autocomplete-list {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
        margin-top: 4px;
    }

    .autocomplete-item {
        padding: 10px;
        cursor: pointer;
        list-style: none;
    }

    .autocomplete-item:hover,
    .autocomplete-item.selected {
        background-color: #f0f0f0;
    }
        `;
    }
}

const style = document.createElement('style');
style.textContent = AccessibleAutocomplete.styles;
document.head.appendChild(style);

export default AccessibleAutocomplete; 