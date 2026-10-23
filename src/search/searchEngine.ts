const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, div';
const EXCLUDED_SELECTOR = 'script, style, .vim-reading-view-search-bar';

/** Vim smartcase: case-sensitive only when the query contains an uppercase letter */
export function isCaseSensitive(query: string): boolean {
	return query !== query.toLowerCase();
}

/** Finds every literal occurrence of `query` in the rendered text under `root`. */
export function findMatches(root: HTMLElement, query: string): Range[] {
	if (!query) return [];

	const caseSensitive = isCaseSensitive(query);
	const needle = caseSensitive ? query : query.toLowerCase();
	const ranges: Range[] = [];

	for (const nodes of groupTextNodes(root)) {
		const text = nodes.map((node) => node.data).join('');
		const haystack = caseSensitive ? text : text.toLowerCase();

		let from = 0;
		for (;;) {
			const start = haystack.indexOf(needle, from);
			if (start === -1) break;

			const range = createRange(nodes, start, start + needle.length);
			if (range) ranges.push(range);
			from = start + needle.length;
		}
	}

	return ranges;
}

/**
 * Groups text nodes by their nearest block element so a phrase split across
 * inline formatting (e.g. `foo **bar**`) is still matched as one string.
 */
function groupTextNodes(root: HTMLElement): Text[][] {
	const groups = new Map<Element, Text[]>();
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const parent = node.parentElement;
		if (!parent || parent.closest(EXCLUDED_SELECTOR)) continue;

		const block = parent.closest(BLOCK_SELECTOR) ?? root;
		const group = groups.get(block);
		if (group) {
			group.push(node as Text);
		} else {
			groups.set(block, [node as Text]);
		}
	}

	return [...groups.values()];
}

function createRange(nodes: Text[], start: number, end: number): Range | null {
	const from = locate(nodes, start, false);
	const to = locate(nodes, end, true);
	if (!from || !to) return null;

	const range = from.node.ownerDocument.createRange();
	range.setStart(from.node, from.offset);
	range.setEnd(to.node, to.offset);
	return range;
}

/** Maps an offset in the concatenated text back to a text node and offset within it. */
function locate(nodes: Text[], position: number, isEnd: boolean): { node: Text; offset: number } | null {
	let nodeStart = 0;
	for (const node of nodes) {
		const length = node.data.length;
		const within = isEnd ? position <= nodeStart + length : position < nodeStart + length;
		if (within) {
			return { node, offset: Math.min(Math.max(position - nodeStart, 0), length) };
		}
		nodeStart += length;
	}
	return null;
}
