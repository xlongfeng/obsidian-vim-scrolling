import { SearchDirection } from '../types';

export interface SearchBarHandlers {
	onInput(query: string): void;
	onCommit(query: string): void;
	onCancel(): void;
}

/** Vim-style command line shown at the bottom of a reading view while typing a search. */
export class SearchBar {
	private readonly barEl: HTMLElement;
	private readonly inputEl: HTMLInputElement;
	private readonly statusEl: HTMLElement;
	private closed = false;

	constructor(private readonly container: HTMLElement, direction: SearchDirection, handlers: SearchBarHandlers) {
		// The bar is absolutely positioned, so its container must be a positioned element
		container.addClass('vim-reading-view-search-host');
		this.barEl = container.createDiv({ cls: 'vim-reading-view-search-bar' });
		this.barEl.createSpan({
			cls: 'vim-reading-view-search-prefix',
			text: direction === 'forward' ? '/' : '?',
		});
		this.inputEl = this.barEl.createEl('input', {
			cls: 'vim-reading-view-search-input',
			type: 'text',
			attr: { spellcheck: 'false' },
		});
		this.statusEl = this.barEl.createSpan({ cls: 'vim-reading-view-search-status' });

		this.inputEl.addEventListener('input', () => handlers.onInput(this.inputEl.value));
		this.inputEl.addEventListener('keydown', (evt: KeyboardEvent) => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				handlers.onCommit(this.inputEl.value);
			} else if (evt.key === 'Escape' || (evt.ctrlKey && evt.key === '[')) {
				evt.preventDefault();
				handlers.onCancel();
			} else if (evt.key === 'Backspace' && this.inputEl.value === '') {
				// Like vim: backspacing past the prompt leaves the command line
				evt.preventDefault();
				handlers.onCancel();
			}
		});
		this.inputEl.addEventListener('blur', () => {
			// Ignore blur caused by the whole window losing focus (e.g. alt-tab)
			if (!this.closed && this.inputEl.ownerDocument.hasFocus()) handlers.onCancel();
		});

		this.inputEl.focus();
	}

	setStatus(text: string): void {
		this.statusEl.setText(text);
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		this.barEl.remove();
		this.container.removeClass('vim-reading-view-search-host');
	}
}
