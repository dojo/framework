import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentListMixin from 'src/mixins/createParentListMixin';
import createRenderable from 'src/mixins/createRenderable';
import { List } from 'immutable/immutable';

registerSuite({
	name: 'mixins/createParentMixin',
	creation() {
		const parent = createParentListMixin();
		assert.isFunction(parent.append);
		assert.isFunction(parent.insert);
		assert.isObject(parent.children);
	},
	'on("childlist")': {
		'append()'() {
			const dfd = this.async();
			const parent = createParentListMixin();
			const child = createRenderable();
			parent.on('childlist', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'childlist');
				assert.strictEqual(event.target, parent);
				assert.strictEqual(event.children, parent.children);
				assert.isTrue(event.children.equals(List([ child ])));
			}));

			parent.append(child);
		}
	}
});
