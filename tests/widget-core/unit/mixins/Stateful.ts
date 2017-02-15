import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { StatefulMixin } from './../../../src/mixins/Stateful';
import { WidgetBase } from './../../../src/WidgetBase';

class Test extends StatefulMixin(WidgetBase)<any> { }

registerSuite({
	name: 'mixins/StatefulMixin',
	creation() {
		const stateful = new Test();
		assert.deepEqual(stateful.state, {}, 'stateful should have empty state');
	},
	'get and set state'() {
		const stateful = new Test();
		const state = {
			foo: 'bar'
		};
		stateful.setState(state);

		assert.deepEqual(stateful.state, state);
	},
	'partially update state'() {
		const stateful = new Test();
		const state = {
			foo: 'bar'
		};
		const updatedState = {
			baz: 'qux'
		};

		stateful.setState(state);
		assert.deepEqual(stateful.state, state);
		stateful.setState(updatedState);
		assert.deepEqual(stateful.state, { foo: 'bar', baz: 'qux' });
	},
	'emits `state:changed` event on state update'() {
		const stateful = new Test();
		const state = {
			foo: 'bar'
		};
		let called = false;

		stateful.on('state:changed', (event: any) => {
			called = true;
			assert.equal(event.target, stateful);
			assert.equal(event.type, 'state:changed');
			assert.deepEqual(event.state, state);
		});
		stateful.setState(state);
		assert.isTrue(called);
	},
	'invalidate is called on state change'() {
		let invalidateCalled = false;
		const stateful = new class extends Test {
			invalidate() {
				super.invalidate();
				invalidateCalled = true;
			}
		}();
		stateful.setState({});
		assert.isTrue(invalidateCalled);
	}
});
