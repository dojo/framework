import global from '../../../../src/shim/global';
import wrapper from '../../../../src/shim/util/wrapper';
import * as has from '../../../../src/core/has';
import * as sinon from 'sinon';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let sandbox: sinon.SinonSandbox;
let fetch: any = global.fetch;
registerSuite('wrapper', {
	beforeEach() {
		sandbox = sinon.createSandbox();
	},
	afterEach() {
		sandbox.restore();
	},
	after() {
		global.fetch = fetch;
	},
	tests: {
		'should return a live binding to a global value if in a test environment'() {
			sandbox.stub(has, 'default').returns(true);
			const boundFetch = wrapper('fetch');

			const fetchSpy = sinon.spy();
			global.fetch = fetchSpy;

			boundFetch('foo');

			assert.deepEqual(fetchSpy.args, [['foo']]);

			const boundClassFetch = wrapper('fetch', true);
			const constructorSpy = sinon.spy();

			global.fetch = class {
				constructor(arg: any) {
					constructorSpy(arg);
				}
			} as any;

			new boundClassFetch('bar');

			assert.deepEqual(constructorSpy.args, [['bar']]);
		},

		'should return the function itself if not in a test environment'() {
			sandbox.stub(has, 'default').returns(false);

			const fetchSpy = sinon.spy();
			global.fetch = fetchSpy;
			const unboundFetch = wrapper('fetch');

			const newFetchSpy = sinon.spy();
			global.fetch = newFetchSpy;

			unboundFetch('foo');

			assert.equal(unboundFetch, fetchSpy);
			assert.deepEqual(fetchSpy.args, [['foo']]);
			assert.isFalse(newFetchSpy.called);
		},

		'should optionally bind the function to the global object when not in a test environment'() {
			sandbox.stub(has, 'default').returns(false);

			const fetchSpy = sinon.spy();
			const bindSpy = sinon.stub().returns(fetchSpy);
			global.fetch = {
				bind: bindSpy
			};
			const unboundFetch = wrapper('fetch', false, true);
			assert.isTrue(bindSpy.calledOnce);
			assert.equal(bindSpy.firstCall.args[0], global);

			const newFetchSpy = sinon.spy();
			global.fetch = newFetchSpy;

			unboundFetch('foo');

			assert.equal(unboundFetch, fetchSpy);
			assert.deepEqual(fetchSpy.args, [['foo']]);
			assert.isFalse(newFetchSpy.called);
		}
	}
});
