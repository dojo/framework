const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import { tsx, create } from '../../../../../src/core/vdom';
import validity from '../../../../../src/core/middleware/validity';
import createValidityMock from '../../../../../src/testing/mocks/middleware/validity';
import renderer, { assertion } from '../../../../../src/testing/renderer';

describe('validity mock', () => {
	it('should mock validity', () => {
		const factory = create({ validity });
		const validityMock = createValidityMock();
		const App = factory(({ middleware: { validity } }) => {
			const { valid, message } = validity.get('test', 'test value');
			return !valid ? <div>{message}</div> : <div>valid</div>;
		});

		validityMock('test', { valid: false, message: 'test message' });
		let r = renderer(() => <App />, { middleware: [[validity, validityMock]] });
		r.expect(assertion(() => <div>test message</div>));

		validityMock('test', { valid: true, message: '' });
		r = renderer(() => <App />, { middleware: [[validity, validityMock]] });
		r.expect(assertion(() => <div>valid</div>));
	});

	it('defaults to a default return value', () => {
		const factory = create({ validity });
		const validityMock = createValidityMock();
		const App = factory(({ middleware: { validity } }) => {
			const { valid, message } = validity.get('test', 'test value');
			assert.isUndefined(valid);
			assert.strictEqual(message, '');
			return !valid ? <div>{message}</div> : <div>valid</div>;
		});

		const r = renderer(() => <App />, { middleware: [[validity, validityMock]] });
		r.expect(assertion(() => <div />));
	});
});
