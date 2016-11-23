import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentListMixin from '../../../src/mixins/createParentListMixin';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { arrayEquals } from '../../../src/util/lang';

registerSuite({
	name: 'mixins/createParentMixin',
	creation() {
		const parent = createParentListMixin();
		assert.isFunction(parent.append);
		assert.isFunction(parent.insert);
		assert.isArray(parent.children);
	},
	'on("childlist")': {
		'append()'(this: any) {
			const dfd = this.async();
			const parent = createParentListMixin();
			const child = createWidgetBase();
			parent.on('childlist', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'childlist');
				assert.strictEqual(event.target, parent);
				assert.strictEqual(event.children, parent.children);
				assert.isTrue(arrayEquals(event.children, [ child ]));
			}));

			parent.append(child);
		}
	}
});
