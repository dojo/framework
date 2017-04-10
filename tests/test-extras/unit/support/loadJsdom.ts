import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '@dojo/has/has';
import doc from '../../../src/support/loadJsdom';

registerSuite({
	name: 'support/loadJsdom',

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
	}
});
