const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { WidgetBase } from './../../../src/WidgetBase';
import { w } from './../../../src/d';
import { ProjectorMixin } from './../../../src/mixins/Projector';
import { alwaysRender } from './../../../src/decorators/alwaysRender';

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
		projector.setProperties({});
		assert.strictEqual(renderCount, 2);
	});
});
