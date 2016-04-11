import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMixin from 'src/mixins/createParentMixin';

registerSuite({
	name: 'mixins/createParentMixin',
	creation() {
		const parent = createParentMixin();
		assert.isFunction(parent.append);
		assert.isFunction(parent.insert);
		assert.isObject(parent.children);
	}
});
