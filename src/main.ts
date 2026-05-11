import { Plugin } from 'obsidian';
import { ReadingModeScrollHandler } from './scrollHandler';
import { CursorManager } from './cursorManager';

export default class VimScrollingPlugin extends Plugin {
	onload() {
		new ReadingModeScrollHandler(this).register();
		new CursorManager(this).register();
	}

	onunload() {}
}
