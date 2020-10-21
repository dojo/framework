const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import Set from '../../../src/shim/Set';
import Map from '../../../src/shim/Map';
import assertRender from '../../../src/testing/assertRender';
import { v, w, create } from '../../../src/core/vdom';
import Themed from '../../../src/core/mixins/Themed';
import WidgetBase from '../../../src/core/WidgetBase';
import { RenderResult } from '../../../src/core/interfaces';

class MockWidget extends Themed(WidgetBase) {
	render() {
		return v('div');
	}
}

const WidgetWithNamedChildren = create().children<{ content: RenderResult; other: RenderResult }>()(
	function WidgetWithNamedChildren() {
		return '';
	}
);

class OtherWidget extends WidgetBase {
	render() {
		return v('div', { key: 'one', classes: 'class' }, ['text node', undefined, '', null, w(MockWidget, {})]);
	}
}

class FalsyChildren extends WidgetBase {
	render() {
		return v('div', { key: 'one', classes: 'class' }, [undefined, '', null]);
	}
}

class ChildWidget extends WidgetBase<any> {}

class WidgetWithMap extends WidgetBase {
	render() {
		const bar = new Set();
		bar.add('foo');
		const foo = new Map();
		foo.set('a', 'a');
		return w(ChildWidget, { foo, bar });
	}
}

function getExpectedError() {
	const mockWidgetName = (MockWidget as any).name || 'Widget-6';
	const widgetWithChildrenName = (MockWidget as any).name ? 'WidgetWithNamedChildren' : 'Widget-7';
	return `
<div
(A)	classes={["one","two","three"]}
(A)	disabled={false}
(E)	classes={"other"}
	extras={"foo"}
(A)	func={function}
	key={"two"}
>
	<span>
		text node
		other
	</span>
	<span>
	</span>
	text node
	<span>
	</span>
(A)	<${mockWidgetName}
(A)		classes={{
(A)			"widget/Widget": {
(A)				"root": ["class"]
(A)			}
(A)		}}
(A)		theme={{
(A)			"widget/Widget": {
(A)				"other": "root-other",
(A)				"root": "theme-class"
(A)			}
(A)		}}
(A)	>
(A)	</${mockWidgetName}>
(A)	<${widgetWithChildrenName}>
(A)		{
(A)			content: (
(A)				<div>
(A)					<span>
(A)						Child
(A)					</span>
(A)				</div>
(A)			),
(A)			other: (
(A)				<div>
(A)					<span>
(A)						Other
(A)					</span>
(A)				</div>
(A)			)
(A)		}
(A)	</${widgetWithChildrenName}>
</div>`;
}

describe('new/assertRender', () => {
	it('should create an informative error message', () => {
		try {
			assertRender(
				v(
					'div',
					{ extras: 'foo', key: 'two', disabled: false, classes: ['one', 'two', 'three'], func: () => {} },
					[
						v('span', ['text node', 'other']),
						v('span'),
						'text node',
						v('span'),
						w(MockWidget, {
							theme: { 'widget/Widget': { root: 'theme-class', other: 'root-other' } },
							classes: { 'widget/Widget': { root: ['class'] } }
						}),
						w(WidgetWithNamedChildren, {}, [
							{ content: v('div', [v('span', ['Child'])]), other: v('div', [v('span', ['Other'])]) }
						])
					]
				),
				v('div', { extras: 'foo', key: 'two', classes: 'other' }, [
					v('span', ['text node', 'other']),
					v('span'),
					'text node',
					v('span')
				])
			);
			assert.fail();
		} catch (e) {
			assert.strictEqual(e.message, getExpectedError());
		}
	});

	it('Should not throw when actual and expected match', () => {
		const widget = new OtherWidget();
		const renderResult = widget.__render__();
		assert.doesNotThrow(() => {
			assertRender(renderResult, renderResult);
		});
	});

	it('Should not throw when actual and expected but properties are ordered differently', () => {
		const widget = new OtherWidget();
		const renderResult = widget.__render__();
		assert.doesNotThrow(() => {
			assertRender(
				renderResult,
				v('div', { classes: 'class', key: 'one' }, ['text node', undefined, '', null, w(MockWidget, {})])
			);
		});
	});

	it('Should not throw when all the children are falsy', () => {
		const widget = new FalsyChildren();
		const renderResult = widget.__render__();
		assert.doesNotThrow(() => {
			assertRender(renderResult, v('div', { classes: 'class', key: 'one' }, [undefined, '', null]));
		});
	});

	it('Should throw when actual and expected do not match', () => {
		const widget = new OtherWidget();
		const renderResult = widget.__render__();
		assert.throws(() => {
			assertRender(renderResult, v('div', { key: 'one', classes: 'class' }, ['text node', v('span')]));
		});
	});

	it('Should not throw when map and set properties are equal', () => {
		const bar = new Set();
		bar.add('foo');
		const foo = new Map();
		foo.set('a', 'a');
		const widget = new WidgetWithMap();
		const renderResult = widget.__render__();
		assert.doesNotThrow(() => {
			assertRender(renderResult, w(ChildWidget, { bar, foo }));
		});
	});

	it('Should throw when a map property is not equal', () => {
		const bar = new Set();
		bar.add('foo');
		const foo = new Map();
		foo.set('a', 'b');
		const widget = new WidgetWithMap();
		const renderResult = widget.__render__();
		assert.throws(() => {
			assertRender(renderResult, w(ChildWidget, { bar, foo }));
		});
	});

	it('Should throw when a set property is not equal', () => {
		const bar = new Set();
		bar.add('bar');
		const foo = new Map();
		foo.set('a', 'a');
		const widget = new WidgetWithMap();
		const renderResult = widget.__render__();
		assert.throws(() => {
			assertRender(renderResult, w(ChildWidget, { bar, foo }));
		});
	});

	it('Should ignore non-nodes', () => {
		assert.doesNotThrow(() => {
			assertRender(
				v('div', { key: 'one' }, [{ something: 'else' } as any, v('div', ['hello'])]),
				v('div', { key: 'one' }, [{ something: 'else' } as any, v('div', ['hello'])])
			);
		});
	});
});
