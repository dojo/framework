const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../../src/core/WidgetBase';
import Focus from '../../../../src/core/mixins/Focus';

class Foo extends Focus(WidgetBase) {}

describe('Focus Mixin', () => {
	it('should allow once focus when focus property returns true', () => {
		const widget = new Foo();
		widget.__setProperties__({ focus: () => true });
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});

	it('should not focus when focus property returns false', () => {
		const widget = new Foo();
		widget.__setProperties__({ focus: () => false });
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
		widget.__setProperties__({ focus: () => true });
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});

	it('should not focus when is not passed', () => {
		const widget = new Foo();
		widget.__setProperties__({});
		assert.isFalse(widget.shouldFocus());
		widget.focus();
		assert.isTrue(widget.shouldFocus());
		assert.isFalse(widget.shouldFocus());
	});
});
