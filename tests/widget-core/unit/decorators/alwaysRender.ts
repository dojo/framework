const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import { WidgetBase } from './../../../../src/widget-core/WidgetBase';
import { w } from './../../../../src/widget-core/d';
import { ProjectorMixin } from './../../../../src/widget-core/mixins/Projector';
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

		class Parent extends ProjectorMixin(WidgetBase) {
			render() {
				return w(Widget, {});
			}
		}

		const projector = new Parent();
		projector.async = false;
		projector.setProperties({});
		projector.append();
		assert.strictEqual(renderCount, 1);

		projector.invalidate();
		assert.strictEqual(renderCount, 2);
	});
});
