import ResizeObserver, { replace } from '../../../src/shim/ResizeObserver';
import has, { add } from '../../../src/has/has';
import * as sinon from 'sinon';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let featureValue: any;
let handle: () => void;
registerSuite('resize observer', {
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
			const unobserve = sinon.stub();

			replace(class {
				disconnect = disconnect;
				observe = observe;
				unobserve = unobserve;
				callback: any;

				constructor(callback: any) {
					this.callback = callback;
				}
			} as any);

			const resizeObserver = new ResizeObserver('callback' as any);
			assert.strictEqual((resizeObserver as any).callback, 'callback');
			resizeObserver.observe('observe' as any);
			resizeObserver.unobserve('unobserve' as any);
			resizeObserver.disconnect();

			assert.isTrue(disconnect.calledOnce);
			assert.deepEqual(observe.args, [['observe']]);
			assert.deepEqual(unobserve.args, [['unobserve']]);
		},

		'should provide the ability to revert replacement functionality'() {
			const disconnect = sinon.stub();
			const observe = sinon.stub();
			const unobserve = sinon.stub();

			replace(class {
				disconnect = disconnect;
				observe = observe;
				unobserve = unobserve;
				callback: any;

				constructor(callback: any) {
					this.callback = callback;
				}
			} as any)();

			const resizeObserver = new ResizeObserver(() => {});
			resizeObserver.disconnect();
			assert.isFalse(disconnect.called);
		},

		'should not allow replacement in non-test environments'() {
			add('test', false, true);
			assert.throws(() => {
				replace(null as any);
			}, 'Replacement functionality is only available in a test environment');
		}
	}
});
