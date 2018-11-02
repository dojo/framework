const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import harness from '../../../../src/testing/harness';
import { v, w } from '../../../../src/widget-core/d';
import { WidgetBase } from '../../../../src/widget-core/WidgetBase';
import Focus from '../../../../src/widget-core/mixins/Focus';

class Foo extends Focus(WidgetBase) {}

describe('Focus Mixin', () => {
	it('should allow once focus when focus property returns true', () => {
		const h = harness(() => w(Foo, { focus: () => true }));
		const widget: Foo = (h.getRender(0) as any).bind;
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});

	it('should not focus when focus property returns false', () => {
		let properties = { focus: () => false };
		const h = harness(() => w(Foo, properties));
		let widget: Foo = (h.getRender(0) as any).bind;
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
		properties = { focus: () => true };
		h.expect(() => v('div'));
		widget = (h.getRender(1) as any).bind;
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});

	it('should not focus when is not passed', () => {
		const h = harness(() => w(Foo, {}));
		const widget: Foo = (h.getRender(0) as any).bind;
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});
});
