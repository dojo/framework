const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import has from '@dojo/has/has';
import global from '@dojo/shim/global';
import doc from '../../../src/support/loadJsdom';

registerSuite('support/loadJsdom', {
	'document is global and matches export'() {
		assert(document, 'document should be in the global scope');
		assert.strictEqual(document, doc, 'document should equal default export of module');
	},

	'window is global and matches document.defaultView'(this: any) {
		if (!has('host-node')) {
			this.skip('Not a NodeJS Environment');
		}
		assert(window, 'window should be global');
		assert.strictEqual(window, document.defaultView, 'window should equal document.defaultView');
	},

	'global.window is defined'() {
		assert(global.window, 'window should be defined in global');
		assert.strictEqual(global.window, window, 'global window should equal window');
	},

	'global.Element is defined'() {
		assert(global.Element, 'there should be a globally defined Element');
	},

	'global.DOMParser is defined'() {
		assert(global.DOMParser, 'there should be a globally defined DOMParser');
	},

	'window has a reference to itself'(this: any) {
		assert.strictEqual(window, window.window, 'window should have a reference to itself');
	},

	'transition should be patched'(this: any) {
		if (!has('host-node')) {
			this.skip('Not a NodeJS Environment');
		}
		assert.isTrue('transition' in document.createElement('div').style);
	},

	'requestAnimationFrame should be patched'(this: any) {
		if (!has('host-node')) {
			this.skip('Not a NodeJS Environment');
		}
		const dfd = this.async();

		assert.isFunction(requestAnimationFrame);
		assert(requestAnimationFrame(dfd.callback(() => {})));
	},

	'cancelAnimationFrame should be patched'(this: any) {
		if (!has('host-node')) {
			this.skip('Not a NodeJS Environment');
		}
		assert.isFunction(cancelAnimationFrame);
	},

	'has flag is set properly'() {
		assert[has('host-node') ? 'isTrue' : 'isFalse'](has('jsdom'), 'should have proper flag set for "jsdom"');
	}
});
