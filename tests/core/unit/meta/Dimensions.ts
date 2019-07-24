const { registerSuite } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import global from '../../../../src/shim/global';
import { stub, spy } from 'sinon';
import Dimensions from '../../../../src/core/meta/Dimensions';
import NodeHandler from '../../../../src/core/NodeHandler';
import WidgetBase from '../../../../src/core/WidgetBase';

let rAF: any;
let bindInstance: WidgetBase;
const defaultDimensions = {
	client: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	offset: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	position: {
		bottom: 0,
		left: 0,
		right: 0,
		top: 0
	},
	scroll: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	size: {
		height: 0,
		width: 0
	}
};

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.resetHistory();
}

registerSuite('meta - Dimensions', {
	before() {
		bindInstance = new WidgetBase();
	},

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	tests: {
		'Will return default dimensions if node not loaded'() {
			const nodeHandler = new NodeHandler();

			const dimensions = new Dimensions({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.deepEqual(dimensions.get('foo'), defaultDimensions);
		},
		'Will accept a number key'() {
			const nodeHandler = new NodeHandler();

			const dimensions = new Dimensions({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.deepEqual(dimensions.get(1234), defaultDimensions);
		},
		'Will create event listener for node if not yet loaded'() {
			const nodeHandler = new NodeHandler();
			const onSpy = spy(nodeHandler, 'on');

			const dimensions = new Dimensions({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			dimensions.get('foo');
			assert.isTrue(onSpy.calledOnce);
			assert.isTrue(onSpy.firstCall.calledWith('foo'));
		},
		'Will call invalidate when awaited node is available'() {
			const nodeHandler = new NodeHandler();
			const onSpy = spy(nodeHandler, 'on');
			const invalidateStub = stub();

			const dimensions = new Dimensions({
				invalidate: invalidateStub,
				nodeHandler,
				bind: bindInstance
			});

			dimensions.get('foo');
			assert.isTrue(onSpy.calledOnce);
			assert.isTrue(onSpy.firstCall.calledWith('foo'));

			const element = document.createElement('div');
			document.body.appendChild(element);
			const getRectSpy = spy(element, 'getBoundingClientRect');

			nodeHandler.add(element, 'foo');

			resolveRAF();
			assert.isTrue(invalidateStub.calledOnce);

			onSpy.resetHistory();
			dimensions.get('foo');

			assert.isFalse(onSpy.called);
			assert.isTrue(getRectSpy.calledOnce);
			document.body.removeChild(element);
		},
		'Will return element dimensions if node is loaded'() {
			const nodeHandler = new NodeHandler();

			const client = { clientLeft: 1, clientTop: 2, clientWidth: 3, clientHeight: 4 };
			const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
			const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
			const position = { bottom: 10, left: 10, right: 10, top: 10 };
			const size = { width: 10, height: 10 };

			const element = {
				...offset,
				...scroll,
				...client,
				getBoundingClientRect: stub().returns({
					...position,
					...size
				})
			};

			nodeHandler.add(element as any, 'foo');

			const dimensions = new Dimensions({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.deepEqual(dimensions.get('foo'), {
				offset: { height: 10, left: 10, top: 10, width: 10 },
				scroll: { height: 10, left: 10, top: 10, width: 10 },
				position,
				size,
				client: { height: 4, left: 1, top: 2, width: 3 }
			});
		}
	}
});
