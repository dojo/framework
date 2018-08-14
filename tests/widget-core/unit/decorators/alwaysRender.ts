const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import { WidgetBase } from './../../../../src/widget-core/WidgetBase';
import { w } from './../../../../src/widget-core/d';
import { renderer } from './../../../../src/widget-core/vdom';
import { alwaysRender } from './../../../../src/widget-core/decorators/alwaysRender';

describe('decorators/alwaysRender', () => {
	it('Widgets should always render', () => {
		let renderCount = 0;

		@alwaysRender()
		class Widget extends WidgetBase {
			render() {
				renderCount++;
				return super.render();
			}
		}

		let invalidate: any;
		class Parent extends WidgetBase {
			constructor() {
				super();
				invalidate = this.invalidate.bind(this);
			}
			render() {
				return w(Widget, {});
			}
		}

		const r = renderer(() => w(Parent, {}));
		r.mount({ sync: true });
		renderCount = 0;
		invalidate();
		assert.strictEqual(renderCount, 1);
		invalidate();
		assert.strictEqual(renderCount, 2);
	});
});
