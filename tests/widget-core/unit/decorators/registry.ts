const { it } = intern.getInterface('bdd');
import { v, w } from '../../../../src/widget-core/d';
const { assert } = intern.getPlugin('chai');
const { describe } = intern.getPlugin('jsdom');

import { VNode } from './../../../../src/widget-core/interfaces';
import { registry } from './../../../../src/widget-core/decorators/registry';
import { WidgetBase } from './../../../../src/widget-core/WidgetBase';
import ProjectorMixin from './../../../../src/widget-core/mixins/Projector';

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

		const Projector = ProjectorMixin(TestWidget1);
		const projector = new Projector();
		projector.async = false;

		const root = document.createElement('div');
		projector.append(root);

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

		const Projector = ProjectorMixin(TestWidget2);
		const projector = new Projector();
		projector.async = false;

		const root = document.createElement('div');
		projector.append(root);

		assert.strictEqual(root.querySelectorAll('.widget1').length, 1);
		assert.strictEqual(root.querySelectorAll('.widget2').length, 1);
	});
});
