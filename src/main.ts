import { Plugin } from 'obsidian';
import { ReadingModeScrollHandler } from './scrollHandler';
import { CursorManager } from './cursorManager';
import { SearchController } from './search/searchController';

export default class VimScrollingPlugin extends Plugin {
	private search = new SearchController(this);

	onload() {
		this.search.register();
		new ReadingModeScrollHandler(this, this.search).register();
		new CursorManager(this).register();
	}

	onunload() {
		this.search.clear();
	}
}
