import { SinonStub, sandbox } from 'sinon';

import dragMiddleware from '../../../../src/core/middleware/drag';
import icacheMiddleware from '../../../../src/core/middleware/icache';
import global from '../../../../src/shim/global';

const { it, describe, after, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

const sb = sandbox.create();
const emptyCoordinates = { x: 0, y: 0 };
const targetStub = {
	setAttribute: () => {},
	style: {}
};

const createMockPointerEvent = (position = 0, target: any) => ({
	button: 0,
	clientX: position,
	clientY: position,
	isPrimary: true,
	offsetX: position,
	offsetY: position,
	pageX: position,
	pageY: position,
	preventDefault: sb.stub(),
	screenX: position,
	screenY: position,
	stopPropagation: sb.stub(),
	target
});

describe('drag middleware', () => {
	before(() => {
		global.addEventListener = sb.stub();
		global.removeEventListener = sb.stub();
	});

	after(() => {
		sb.restore();
	});

	it('should invalidate when drag occurs', () => {
		const invalidatorStub = sb.stub();
		const icacheInvalidatorStub = sb.stub();

		const icache = icacheMiddleware().callback({
			children: () => [],
			id: 'test-cache',
			middleware: {
				destroy: () => {},
				invalidator: icacheInvalidatorStub
			},
			properties: () => ({})
		});

		const drag = dragMiddleware().callback({
			children: () => [],
			id: 'test',
			middleware: {
				destroy: () => {},
				icache,
				invalidator: invalidatorStub,
				node: { get: () => targetStub as any }
			},
			properties: () => ({})
		});

		assert.deepEqual(drag.get('key'), {
			delta: emptyCoordinates,
			isDragging: false
		});

		(global.addEventListener as SinonStub).args.forEach(([name, listener]) => {
			switch (name) {
				case 'pointerdown':
					listener(createMockPointerEvent(0, {}));
					return listener(createMockPointerEvent(0, targetStub));
				case 'pointermove':
					return listener(createMockPointerEvent(1, targetStub));
				case 'pointerup':
					return listener(createMockPointerEvent(2, targetStub));
			}
		});

		assert.deepEqual(drag.get('key'), {
			delta: {
				x: 2,
				y: 2
			},
			start: {
				client: emptyCoordinates,
				offset: emptyCoordinates,
				page: emptyCoordinates,
				screen: emptyCoordinates
			},
			isDragging: false
		});

		assert.isTrue(invalidatorStub.calledTwice);
		assert.isTrue(icacheInvalidatorStub.calledTwice);
	});

	it('should stop drag when secondary pointer is detected', () => {
		const invalidatorStub = sb.stub();
		const icacheInvalidatorStub = sb.stub();

		const icache = icacheMiddleware().callback({
			children: () => [],
			id: 'test-cache',
			middleware: {
				destroy: () => {},
				invalidator: icacheInvalidatorStub
			},
			properties: () => ({})
		});

		const drag = dragMiddleware().callback({
			children: () => [],
			id: 'test',
			middleware: {
				destroy: () => {},
				icache,
				invalidator: invalidatorStub,
				node: { get: () => targetStub as any }
			},
			properties: () => ({})
		});

		assert.deepEqual(drag.get('key'), {
			delta: emptyCoordinates,
			isDragging: false
		});

		let pointerdown: any;
		(global.addEventListener as SinonStub).args.forEach(([name, listener]) => {
			switch (name) {
				case 'pointerdown':
					pointerdown = listener;
					return listener(createMockPointerEvent(0, targetStub));
				case 'pointermove':
					listener(createMockPointerEvent(1, targetStub));
					return (
						pointerdown &&
						pointerdown({
							...createMockPointerEvent(0, targetStub),
							isPrimary: false
						})
					);
				case 'pointerup':
					return listener(createMockPointerEvent(2, targetStub));
			}
		});

		assert.deepEqual(drag.get('key'), {
			delta: {
				x: 1,
				y: 1
			},
			start: {
				client: emptyCoordinates,
				offset: emptyCoordinates,
				page: emptyCoordinates,
				screen: emptyCoordinates
			},
			isDragging: false
		});

		assert.isTrue(invalidatorStub.calledTwice);
		assert.isTrue(icacheInvalidatorStub.calledTwice);
	});

	it('should ignore secondary pointer events', () => {
		const invalidatorStub = sb.stub();

		const icache = icacheMiddleware().callback({
			children: () => [],
			id: 'test-cache',
			middleware: {
				destroy: () => {},
				invalidator: () => {}
			},
			properties: () => ({})
		});

		const drag = dragMiddleware().callback({
			children: () => [],
			id: 'test',
			middleware: {
				destroy: () => {},
				icache,
				invalidator: invalidatorStub,
				node: { get: () => targetStub as any }
			},
			properties: () => ({})
		});

		assert.deepEqual(drag.get('key'), {
			delta: emptyCoordinates,
			isDragging: false
		});

		(global.addEventListener as SinonStub).args.forEach(([name, listener]) => {
			switch (name) {
				case 'pointerdown':
					return listener({
						...createMockPointerEvent(0, targetStub),
						button: 1
					});
				case 'pointermove':
					return listener({
						...createMockPointerEvent(1, targetStub),
						button: 1
					});
				case 'pointerup':
					return listener({
						...createMockPointerEvent(2, targetStub),
						button: 1
					});
			}
		});

		assert.deepEqual(drag.get('key'), {
			delta: emptyCoordinates,
			isDragging: false
		});

		assert.isFalse(invalidatorStub.called);
	});

	it('should return empty results for nodes that are not found', () => {
		const invalidatorStub = sb.stub();

		const icache = icacheMiddleware().callback({
			children: () => [],
			id: 'test-cache',
			middleware: {
				destroy: () => {},
				invalidator: () => {}
			},
			properties: () => ({})
		});

		const drag = dragMiddleware().callback({
			children: () => [],
			id: 'test',
			middleware: {
				destroy: () => {},
				icache,
				invalidator: invalidatorStub,
				node: { get: () => undefined as any }
			},
			properties: () => ({})
		});

		assert.deepEqual(drag.get('key'), {
			delta: emptyCoordinates,
			isDragging: false
		});

		assert.isFalse(invalidatorStub.called);
	});

	it('Should register disconnect with destroy', () => {
		const destroyStub = sb.stub();

		const icache = icacheMiddleware().callback({
			children: () => [],
			id: 'test-cache',
			middleware: {
				destroy: () => {},
				invalidator: () => {}
			},
			properties: () => ({})
		});

		dragMiddleware().callback({
			children: () => [],
			id: 'test',
			middleware: {
				destroy: destroyStub,
				icache,
				invalidator: () => {},
				node: { get: () => targetStub as any }
			},
			properties: () => ({})
		});

		destroyStub.getCall(0).callArg(0);
		assert.isTrue((global.removeEventListener as SinonStub).calledThrice);
	});
});
