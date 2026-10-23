import { MarkdownView, Notice, Plugin } from 'obsidian';
import { SearchDirection } from '../types';
import { SearchBar } from './searchBar';
import { findMatches } from './searchEngine';
import { SearchHighlighter, contentOffsetTop, scrollToRange } from './searchHighlight';

export class SearchController {
	private plugin: Plugin;
	private readonly highlighter = new SearchHighlighter();
	private bar: SearchBar | null = null;
	private view: MarkdownView | null = null;
	private scrollEl: HTMLElement | null = null;
	private direction: SearchDirection = 'forward';
	private lastQuery = '';
	private matches: Range[] = [];
	private index = -1;
	// Scroll position when the command line opened; incremental search always starts from here
	private originScrollTop = 0;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	register(): void {
		const { workspace } = this.plugin.app;

		const clearIfViewLeft = () => {
			if (!this.view) return;
			const active = workspace.getActiveViewOfType(MarkdownView);
			if (this.view.getMode() !== 'preview' || (active && active !== this.view)) this.clear();
		};

		this.plugin.registerEvent(workspace.on('active-leaf-change', clearIfViewLeft));
		this.plugin.registerEvent(workspace.on('layout-change', clearIfViewLeft));
		this.plugin.registerEvent(workspace.on('file-open', () => this.clear()));
	}

	/** True while highlights are shown, so Esc can clear them. */
	hasHighlights(): boolean {
		return this.matches.length > 0;
	}

	open(view: MarkdownView, scrollEl: HTMLElement, direction: SearchDirection): void {
		this.closeBar();
		this.view = view;
		this.scrollEl = scrollEl;
		this.direction = direction;
		this.originScrollTop = scrollEl.scrollTop;

		this.bar = new SearchBar(view.contentEl, direction, {
			onInput: (query) => this.search(query),
			onCommit: (query) => this.commit(query),
			onCancel: () => this.cancel(),
		});
	}

	/** Jumps to the next match (`n`), or the previous one when `reverse` is set (`N`). */
	step(view: MarkdownView, scrollEl: HTMLElement, reverse: boolean): void {
		if (!this.lastQuery) return;

		const hadPosition = this.index >= 0;
		this.view = view;
		this.scrollEl = scrollEl;
		// Re-run the search: Obsidian may have re-rendered sections since the last one
		this.matches = findMatches(scrollEl, this.lastQuery);

		if (this.matches.length === 0) {
			this.index = -1;
			this.highlighter.clear();
			new Notice(`Pattern not found: ${this.lastQuery}`);
			return;
		}

		const backward = (this.direction === 'backward') !== reverse;
		if (hadPosition) {
			const length = this.matches.length;
			this.index = (this.index + (backward ? -1 : 1) + length) % length;
		} else {
			this.index = this.pickFrom(scrollEl.scrollTop, backward ? 'backward' : 'forward');
		}
		this.showCurrent();
	}

	clear(): void {
		this.closeBar();
		this.highlighter.clear();
		this.matches = [];
		this.index = -1;
		this.view = null;
		this.scrollEl = null;
	}

	private search(query: string): void {
		const scrollEl = this.scrollEl;
		if (!scrollEl) return;

		this.matches = findMatches(scrollEl, query);
		if (this.matches.length === 0) {
			this.index = -1;
			this.highlighter.clear();
			this.bar?.setStatus(query ? 'No match' : '');
			scrollEl.scrollTop = this.originScrollTop;
			return;
		}

		this.index = this.pickFrom(this.originScrollTop, this.direction);
		this.showCurrent();
	}

	private commit(query: string): void {
		const pattern = query || this.lastQuery;
		this.closeBar();
		if (!pattern) {
			this.clear();
			return;
		}

		this.lastQuery = pattern;
		this.search(pattern);
		if (this.matches.length === 0) new Notice(`Pattern not found: ${pattern}`);
	}

	private cancel(): void {
		if (this.scrollEl) this.scrollEl.scrollTop = this.originScrollTop;
		this.clear();
	}

	/** Index of the first match at or after (forward) / before (backward) `offset`, wrapping around. */
	private pickFrom(offset: number, direction: SearchDirection): number {
		const scrollEl = this.scrollEl;
		if (!scrollEl) return 0;

		const offsets = this.matches.map((range) => contentOffsetTop(scrollEl, range));
		if (direction === 'forward') {
			const found = offsets.findIndex((top) => top >= offset - 1);
			return found === -1 ? 0 : found;
		}
		const found = offsets.reduce((last, top, i) => (top < offset - 1 ? i : last), -1);
		return found === -1 ? this.matches.length - 1 : found;
	}

	private showCurrent(): void {
		const range = this.matches[this.index];
		if (!range || !this.view || !this.scrollEl) return;

		scrollToRange(this.scrollEl, range);
		this.highlighter.show(this.view.containerEl.win, this.matches, this.index);
		this.bar?.setStatus(`${this.index + 1}/${this.matches.length}`);
	}

	private closeBar(): void {
		this.bar?.close();
		this.bar = null;
	}
}
