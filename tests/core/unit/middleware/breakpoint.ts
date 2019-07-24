const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import breakpointMiddleware, { createBreakpointMiddleware } from '../../../../src/core/middleware/breakpoint';

const sb = sandbox.create();
let resizeStub = {
	get: sb.stub()
};

const domRects = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	top: 0,
	right: 0,
	bottom: 0,
	left: 0
};

describe('breakpoint middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('Should return null when no content rects available', () => {
		const { callback } = breakpointMiddleware();
		const breakpoint = callback({
			id: 'test',
			middleware: {
				resize: resizeStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isNull(breakpoint.get('root'));
	});

	it('Should return the content rects and the matched breakpoint', () => {
		const { callback } = breakpointMiddleware();
		const breakpoint = callback({
			id: 'test',
			middleware: {
				resize: resizeStub
			},
			properties: () => ({}),
			children: () => []
		});

		resizeStub.get
			.onFirstCall()
			.returns({ ...domRects, width: 10 })
			.onSecondCall()
			.returns({ ...domRects, width: 600 })
			.onThirdCall()
			.returns({ ...domRects, width: 800 })
			.onCall(3)
			.returns({ ...domRects, width: 1000 });
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'SM',
			contentRect: { ...domRects, width: 10 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'MD',
			contentRect: { ...domRects, width: 600 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'LG',
			contentRect: { ...domRects, width: 800 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'XL',
			contentRect: { ...domRects, width: 1000 }
		});
	});

	it('Should be able to use custom breakpoints', () => {
		const { callback } = breakpointMiddleware();
		const breakpoint = callback({
			id: 'test',
			middleware: {
				resize: resizeStub
			},
			properties: () => ({}),
			children: () => []
		});

		resizeStub.get
			.onFirstCall()
			.returns({ ...domRects, width: 10 })
			.onSecondCall()
			.returns({ ...domRects, width: 600 })
			.onThirdCall()
			.returns({ ...domRects, width: 800 })
			.onCall(3)
			.returns({ ...domRects, width: 1000 });

		assert.isNull(breakpoint.get('root', { 'custom-small': 100, 'custom-large': 700 }));
		assert.deepEqual(breakpoint.get('root', { 'custom-small': 100, 'custom-large': 700 }), {
			breakpoint: 'custom-small',
			contentRect: { ...domRects, width: 600 }
		});
		assert.deepEqual(breakpoint.get('root', { 'custom-small': 100, 'custom-large': 700 }), {
			breakpoint: 'custom-large',
			contentRect: { ...domRects, width: 800 }
		});
		assert.deepEqual(breakpoint.get('root', { 'custom-small': 100, 'custom-large': 700 }), {
			breakpoint: 'custom-large',
			contentRect: { ...domRects, width: 1000 }
		});
	});

	it('Should use custom breakpoints passed to the breakpoint middleware factory', () => {
		const breakpointMiddleware = createBreakpointMiddleware({
			SM: 0,
			MD: 300,
			LG: 400,
			XL: 700
		});
		const { callback } = breakpointMiddleware();
		const breakpoint = callback({
			id: 'test',
			middleware: {
				resize: resizeStub
			},
			properties: () => ({}),
			children: () => []
		});

		resizeStub.get
			.onFirstCall()
			.returns({ ...domRects, width: 10 })
			.onSecondCall()
			.returns({ ...domRects, width: 600 })
			.onThirdCall()
			.returns({ ...domRects, width: 800 })
			.onCall(3)
			.returns({ ...domRects, width: 1000 });
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'SM',
			contentRect: { ...domRects, width: 10 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'LG',
			contentRect: { ...domRects, width: 600 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'XL',
			contentRect: { ...domRects, width: 800 }
		});
		assert.deepEqual(breakpoint.get('root'), {
			breakpoint: 'XL',
			contentRect: { ...domRects, width: 1000 }
		});
	});
});
