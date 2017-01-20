import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import internalState from '../../../src/mixins/internalState';

const createTestInternalState = compose({
	invalidateCalled: false,
	invalidate(this: any) {
		this.invalidateCalled = true;
	}
}).mixin(internalState);

registerSuite({
	name: 'mixins/internalState',
	'invalidate is called on state change'() {
		const testInternalState = createTestInternalState();
		testInternalState.setState({});
		assert.isTrue(testInternalState.invalidateCalled);
	}
});
