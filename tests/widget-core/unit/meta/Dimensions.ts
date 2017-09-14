import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, spy } from 'sinon';
import Dimensions from '../../../src/meta/Dimensions';
import NodeHandler from '../../../src/NodeHandler';

let rAF: any;
const defaultDimensions = {
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
	rAF.reset();
}

registerSuite({
	name: 'meta - Dimensions',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'Will return default dimensions if node not loaded'() {
		const nodeHandler = new NodeHandler();

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), defaultDimensions);
	},
	'Will create event listener for node if not yet loaded'() {
		const nodeHandler = new NodeHandler();
		const onSpy = spy(nodeHandler, 'on');

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
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
			nodeHandler
		});

		dimensions.get('foo');
		assert.isTrue(onSpy.calledOnce);
		assert.isTrue(onSpy.firstCall.calledWith('foo'));

		const element = document.createElement('div');
		const getRectSpy = spy(element, 'getBoundingClientRect');

		nodeHandler.add(element, { key: 'foo' });

		resolveRAF();
		assert.isTrue(invalidateStub.calledOnce);

		onSpy.reset();
		dimensions.get('foo');

		assert.isFalse(onSpy.called);
		assert.isTrue(getRectSpy.calledOnce);
	},
	'Will return element dimensions if node is loaded'() {
		const nodeHandler = new NodeHandler();

		const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
		const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
		const position = { bottom: 10, left: 10, right: 10, top: 10 };
		const size = { width: 10, height: 10 };

		const element = {
			...offset,
			...scroll,
			getBoundingClientRect: stub().returns({
				...position,
				...size
			})
		};

		nodeHandler.add(element as any, { key: 'foo' });

		const dimensions = new Dimensions({
			invalidate: () => {},
			nodeHandler
		});

		assert.deepEqual(dimensions.get('foo'), {
			offset: { height: 10, left: 10, top: 10, width: 10 },
			scroll: { height: 10, left: 10, top: 10, width: 10 },
			position,
			size
		});
	}
});
