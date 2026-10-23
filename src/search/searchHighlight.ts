import { HighlightWindow } from '../types';

const ALL_HIGHLIGHT = 'vim-reading-view-search';
const CURRENT_HIGHLIGHT = 'vim-reading-view-search-current';
const SCROLL_MARGIN_PX = 48;

/**
 * Highlights matches with the CSS Custom Highlight API, which paints ranges
 * without touching the DOM so highlights survive Obsidian re-rendering.
 */
export class SearchHighlighter {
	private win: HighlightWindow | null = null;

	show(win: Window, ranges: Range[], currentIndex: number): void {
		this.clear();
		const highlightWin = win as unknown as HighlightWindow;
		const registry = highlightWin.CSS?.highlights;
		if (!registry) return;

		this.win = highlightWin;
		registry.set(ALL_HIGHLIGHT, new highlightWin.Highlight(...ranges));

		const current = ranges[currentIndex];
		if (current) {
			const emphasis = new highlightWin.Highlight(current);
			emphasis.priority = 1;
			registry.set(CURRENT_HIGHLIGHT, emphasis);
		}
	}

	clear(): void {
		const registry = this.win?.CSS?.highlights;
		registry?.delete(ALL_HIGHLIGHT);
		registry?.delete(CURRENT_HIGHLIGHT);
		this.win = null;
	}
}

/** Vertical position of the range within the scrollable content, independent of the current scroll. */
export function contentOffsetTop(scrollEl: HTMLElement, range: Range): number {
	return range.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
}

/** Instantly scrolls so the range is visible, centring it when it is off-screen. */
export function scrollToRange(scrollEl: HTMLElement, range: Range): void {
	const rect = range.getBoundingClientRect();
	const viewport = scrollEl.getBoundingClientRect();
	const visible = rect.top >= viewport.top + SCROLL_MARGIN_PX && rect.bottom <= viewport.bottom - SCROLL_MARGIN_PX;
	if (visible) return;

	scrollEl.scrollTop += rect.top - viewport.top - scrollEl.clientHeight / 2;
}
