import IntersectionObserver, { replace } from '../../../src/shim/IntersectionObserver';
import has, { add } from '../../../src/has/has';
import * as sinon from 'sinon';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let featureValue: any;
let handle: () => void;
registerSuite('intersection observer', {
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
			const disconnect = sinon.stub();
			const observe = sinon.stub();
			const takeRecords = sinon.stub();
			const unobserve = sinon.stub();

			handle = replace(class {
				disconnect = disconnect;
				observe = observe;
				takeRecords = takeRecords;
				unobserve = unobserve;
			} as any);

			const intersectionObserver = new IntersectionObserver(null as any);
			intersectionObserver.disconnect();
			intersectionObserver.observe('observe' as any);
			intersectionObserver.takeRecords();
			intersectionObserver.unobserve('unobserve' as any);

			assert.isTrue(disconnect.calledOnce);
			assert.deepEqual(observe.args, [['observe']]);
			assert.isTrue(takeRecords.calledOnce);
			assert.deepEqual(unobserve.args, [['unobserve']]);
		},

		'should provide the ability to revert replacement functionality'() {
			const disconnect = sinon.stub();
			const observe = sinon.stub();
			const takeRecords = sinon.stub();
			const unobserve = sinon.stub();

			replace(class {
				disconnect = disconnect;
				observe = observe;
				takeRecords = takeRecords;
				unobserve = unobserve;
			} as any)();

			const intersectionObserver = new IntersectionObserver((() => {}) as any);
			intersectionObserver.disconnect();
			intersectionObserver.takeRecords();

			assert.isFalse(disconnect.calledOnce);
			assert.isFalse(takeRecords.calledOnce);
		},

		'should not allow replacement in non-test environments'() {
			add('test', false, true);
			assert.throws(() => {
				replace(null as any);
			}, 'Replacement functionality is only available in a test environment');
		}
	}
});
