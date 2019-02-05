const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from '../../../src/testing/harness';
import { WidgetBase } from '../../../src/widget-core/WidgetBase';
import { v, w } from '../../../src/widget-core/d';
import { tsx } from '../../../src/widget-core/tsx';
import assertionTemplate from '../../../src/testing/assertionTemplate';

class MyWidget extends WidgetBase<{
	toggleProperty?: boolean;
	prependChild?: boolean;
	appendChild?: boolean;
	replaceChild?: boolean;
}> {
	render() {
		const { toggleProperty, prependChild, appendChild, replaceChild } = this.properties;
		let children = ['hello'];
		if (prependChild) {
			children = ['prepend', ...children];
		}
		if (appendChild) {
			children = [...children, 'append'];
		}
		if (replaceChild) {
			children = ['replace'];
		}
		return v('div', { classes: ['root'] }, [
			v('h2', children),
			v('ul', [v('li', { foo: toggleProperty ? 'b' : 'a' }, ['one']), v('li', ['two']), v('li', ['three'])])
		]);
	}
}

const baseAssertion = assertionTemplate(() =>
	v('div', { '~key': 'root', classes: ['root'] }, [
		v('h2', { '~key': 'header' }, ['hello']),
		v('ul', [v('li', { '~key': 'li-one', foo: 'a' }, ['one']), v('li', ['two']), v('li', ['three'])])
	])
);

const tsxAssertion = assertionTemplate(() => (
	<div classes={['root']}>
		<h2>hello</h2>
		<ul>
			<li assertion-key="li-one" foo="a">
				one
			</li>
			<li>two</li>
			<li>three</li>
		</ul>
	</div>
));

describe('assertionTemplate', () => {
	it('can get a property', () => {
		const classes = baseAssertion.getProperty('~root', 'classes');
		assert.deepEqual(classes, ['root']);
	});

	it('can get a child', () => {
		const children = baseAssertion.getChildren('~header');
		assert.equal(children[0], 'hello');
	});

	it('can assert a base assertion', () => {
		const h = harness(() => w(MyWidget, {}));
		h.expect(baseAssertion);
	});

	it('can set a property', () => {
		const h = harness(() => w(MyWidget, { toggleProperty: true }));
		const propertyAssertion = baseAssertion.setProperty('~li-one', 'foo', 'b');
		h.expect(propertyAssertion);
	});

	it('can set a child', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['replace']);
		h.expect(childAssertion);
	});

	it('can set a child with replace', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['replace'], 'replace');
		h.expect(childAssertion);
	});

	it('can set a child with prepend', () => {
		const h = harness(() => w(MyWidget, { prependChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['prepend'], 'prepend');
		h.expect(childAssertion);
	});

	it('can set a child with append', () => {
		const h = harness(() => w(MyWidget, { appendChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['append'], 'append');
		h.expect(childAssertion);
	});

	it('can be used with tsx', () => {
		const h = harness(() => <MyWidget toggleProperty={true} />);
		const propertyAssertion = tsxAssertion.setProperty('~li-one', 'foo', 'b');
		h.expect(propertyAssertion);
	});
});
