const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import dimensionsMiddleware from '../../../../src/core/middleware/dimensions';

const sb = sandbox.create();
const nodeStub = {
	get: sb.stub()
};

describe('dimensions middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('Should get dimensions when the node is available', () => {
		const { callback } = dimensionsMiddleware();
		const dimensions = callback({
			id: 'test',
			middleware: {
				node: nodeStub
			},
			properties: () => ({}),
			children: () => []
		});
		const client = { clientLeft: 1, clientTop: 2, clientWidth: 3, clientHeight: 4 };
		const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
		const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
		const position = { bottom: 10, left: 10, right: 10, top: 10 };
		const size = { width: 10, height: 10 };

		const domNode = {
			...offset,
			...scroll,
			...client,
			getBoundingClientRect: sb.stub().returns({
				...position,
				...size
			})
		};
		nodeStub.get.withArgs('root').returns(domNode);
		const dims = dimensions.get('root');
		assert.deepEqual(dims, {
			offset: { height: 10, left: 10, top: 10, width: 10 },
			scroll: { height: 10, left: 10, top: 10, width: 10 },
			position,
			size,
			client: { height: 4, left: 1, top: 2, width: 3 }
		});
	});

	it('Should clone default dimensions', () => {
		const { callback } = dimensionsMiddleware();
		const dimensions = callback({
			id: 'test',
			middleware: {
				node: nodeStub
			},
			properties: () => ({}),
			children: () => []
		});
		let defaultDims = dimensions.get('div');
		assert.deepEqual(defaultDims, {
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
				width: 0,
				height: 0
			}
		});
		defaultDims.client.height = 99;
		defaultDims = dimensions.get('div');
		assert.deepEqual(defaultDims, {
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
				width: 0,
				height: 0
			}
		});
	});
});
