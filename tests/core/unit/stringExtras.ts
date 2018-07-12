const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as stringExtras from '../../src/stringExtras';

registerSuite('string functions', {
	'.escapeRegExp()'() {
		assert.strictEqual(stringExtras.escapeRegExp(''), '');
		assert.strictEqual(
			stringExtras.escapeRegExp('[]{}()|/\\^$.*+?'),
			'\\[\\]\\{\\}\\(\\)\\|\\/\\\\\\^\\$\\.\\*\\+\\?'
		);
	},

	'.escapeXml()'() {
		let html = '<p class="text">Fox & Hound\'s</p>';

		assert.strictEqual(stringExtras.escapeXml(''), '');
		assert.strictEqual(stringExtras.escapeXml(html, false), '&lt;p class="text">Fox &amp; Hound\'s&lt;/p>');
		assert.strictEqual(
			stringExtras.escapeXml(html),
			'&lt;p class=&quot;text&quot;&gt;Fox &amp; Hound&#39;s&lt;/p&gt;'
		);
	}
});
