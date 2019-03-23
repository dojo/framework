import fetch, { replace } from '../../../src/shim/fetch';
import has, { add } from '../../../src/has/has';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let featureValue: any;
let handle: () => void;
registerSuite('fetch', {
	before() {
		try {
			featureValue = has('test');
		} catch {}
	},
	beforeEach() {
		add('test', true, true);
	},
	after() {
		add('test', typeof featureValue !== 'undefined' ? featureValue : false, true);
		if (handle) {
			handle();
		}
	},
	tests: {
		'should provide replacement functionality'() {
			const response: any = 'fetched';
			handle = replace(() => Promise.resolve(response));
			return fetch('').then((value) => {
				assert.equal(value, response);
			});
		},

		'should provide the ability to revert replacement functionality'() {
			const response: any = 'fetched';
			const handle = replace(() => Promise.resolve(response));
			return fetch('')
				.then((value) => {
					assert.equal(value, response);
					handle();
					return fetch(null as any);
				})
				.then(
					(value) => {
						assert.notEqual(value, response);
					},
					() => {}
				);
		},

		'should not allow replacement in non-test environments'() {
			add('test', false, true);
			assert.throws(() => {
				replace(() => Promise.resolve() as any);
			}, 'Replacement functionality is only available in a test environment');
		}
	}
});
