const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from '../../../src/testing/harness';
import { WidgetBase } from '../../../src/widget-core/WidgetBase';
import { v, w } from '../../../src/widget-core/d';
import assertionTemplate from '../../../src/testing/assertionTemplate';

class MyWidget extends WidgetBase<{ toggleProperty?: boolean; toggleChild?: boolean }> {
	render() {
		const { toggleProperty, toggleChild } = this.properties;
		return v('div', { classes: ['root'] }, [
			v('h2', [toggleChild ? 'world' : 'hello']),
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
		const h = harness(() => w(MyWidget, { toggleChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['world']);
		h.expect(childAssertion);
	});
});
