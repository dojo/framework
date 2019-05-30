const { it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
const { describe } = intern.getPlugin('jsdom');

import { VNode } from './../../../../src/core/interfaces';
import { registry } from './../../../../src/core/decorators/registry';
import { WidgetBase } from './../../../../src/core/WidgetBase';
import { renderer, v, w } from './../../../../src/core/vdom';

export class Widget1 extends WidgetBase {
	protected render(): VNode {
		return v('span', { classes: ['widget1'] });
	}
}

export class Widget2 extends WidgetBase {
	protected render(): VNode {
		return v('span', { classes: ['widget2'] });
	}
}

describe('decorators/registry', () => {
	it('should use the single entry decorator format to register reg-widget-1', () => {
		@registry('reg-widget-1', Widget1)
		class TestWidget1 extends WidgetBase {
			render() {
				return w('reg-widget-1', {});
			}
		}

		const r = renderer(() => w(TestWidget1, {}));
		const root = document.createElement('div');
		r.mount({ domNode: root, sync: true });

		assert.strictEqual(root.querySelectorAll('.widget1').length, 1);
		assert.strictEqual(root.querySelectorAll('.widget2').length, 0);
	});

	it('should use the registry config format to register multiple widgets', () => {
		@registry({
			'reg-widget-1': Widget1,
			'reg-widget-2': Widget2
		})
		class TestWidget2 extends WidgetBase {
			render() {
				return [w('reg-widget-1', {}), w('reg-widget-2', {})];
			}
		}

		const r = renderer(() => w(TestWidget2, {}));
		const root = document.createElement('div');
		r.mount({ domNode: root, sync: true });

		assert.strictEqual(root.querySelectorAll('.widget1').length, 1);
		assert.strictEqual(root.querySelectorAll('.widget2').length, 1);
	});
});
