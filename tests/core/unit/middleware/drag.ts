import { sandbox, SinonSpy } from 'sinon';
import { drag } from '../../../../src/core/middleware/drag';
import global from '../../../../src/shim/global';
const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
const { describe } = intern.getPlugin('jsdom');

const sb = sandbox.create();
const nodeStub = {
	get: sb.stub()
};
const invalidatorStub = sb.stub();

const domNode = {
	style: {
		touchAction: ''
	},
	setAttribute: sb.stub()
};

const emptyResult = {
	isDragging: false,
	delta: { x: 0, y: 0 }
};

let oldEventListener: any;

function createEvent(coords: Partial<PointerEvent>) {
	return {
		target: domNode,
		bubbles: true,
		isPrimary: true,
		button: 0,
		clientX: 0,
		clientY: 0,
		offsetX: 0,
		offsetY: 0,
		pageX: 0,
		pageY: 0,
		screenX: 0,
		screenY: 0,
		preventDefault: sb.stub(),
		stopPropagation: sb.stub(),
		...coords
	};
}

describe('drag middleware', () => {
	beforeEach(() => {
		oldEventListener = global.window.addEventListener;
		global.window.addEventListener = sb.stub();
	});

	afterEach(() => {
		global.window.addEventListener = oldEventListener;

		sb.resetHistory();
		domNode.style.touchAction = '';
	});

	it('should override touch action', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		const results = d.get('root');

		assert.deepEqual(results, emptyResult, 'Should have returned an empty result');
		assert.equal(domNode.style.touchAction, 'none', 'Should have set touch-action type to none');
		assert.isTrue(
			domNode.setAttribute.calledWith('touch-action', 'none'),
			'Should have set touch-action attribute to none'
		);
	});

	it('drags a node with the pointer', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];
		const pointerMove = global.window.addEventListener.getCall(1).args[1];
		const pointerUp = global.window.addEventListener.getCall(2).args[1];

		const downEvent = createEvent({
			clientX: 100,
			clientY: 50,
			offsetX: 10,
			offsetY: 5,
			pageX: 100,
			pageY: 50,
			screenX: 1100,
			screenY: 1050
		});

		pointerDown(downEvent);

		assert.isTrue((downEvent.preventDefault as SinonSpy).called);
		assert.isTrue((downEvent.stopPropagation as SinonSpy).called);

		const downResult = d.get('root');
		assert.deepEqual(downResult, {
			isDragging: true,
			delta: { x: 0, y: 0 },
			start: {
				client: {
					x: 100,
					y: 50
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 100,
					y: 50
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});

		const moveEvent = createEvent({
			clientX: 110,
			clientY: 55,
			offsetX: 10,
			offsetY: 5,
			pageX: 110,
			pageY: 55,
			screenX: 1100,
			screenY: 1050
		});

		pointerMove(moveEvent);

		assert.isTrue((moveEvent.preventDefault as SinonSpy).called);
		assert.isTrue((moveEvent.stopPropagation as SinonSpy).called);

		const moveResult = d.get('root');
		assert.deepEqual(moveResult, {
			isDragging: true,
			delta: { x: 10, y: 5 },
			start: {
				client: {
					x: 100,
					y: 50
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 100,
					y: 50
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});

		pointerMove(
			createEvent({
				clientX: 115,
				clientY: 65,
				offsetX: 10,
				offsetY: 5,
				pageX: 115,
				pageY: 65,
				screenX: 1100,
				screenY: 1050
			})
		);

		const move2Result = d.get('root');
		assert.deepEqual(move2Result, {
			isDragging: true,
			delta: { x: 5, y: 10 },
			start: {
				client: {
					x: 110,
					y: 55
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 110,
					y: 55
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});

		const upEvent = createEvent({
			clientX: 120,
			clientY: 70,
			offsetX: 10,
			offsetY: 5,
			pageX: 120,
			pageY: 70,
			screenX: 1100,
			screenY: 1050
		});

		pointerUp(upEvent);

		const upResult = d.get('root');
		assert.deepEqual(upResult, {
			isDragging: false,
			delta: { x: 5, y: 5 },
			start: {
				client: {
					x: 115,
					y: 65
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 115,
					y: 65
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});
	});

	it('accumulates movements across renders', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];
		const pointerMove = global.window.addEventListener.getCall(1).args[1];

		pointerDown(
			createEvent({
				clientX: 100,
				clientY: 50,
				offsetX: 10,
				offsetY: 5,
				pageX: 100,
				pageY: 50,
				screenX: 1100,
				screenY: 1050
			})
		);

		d.get('root');

		pointerMove(
			createEvent({
				clientX: 110,
				clientY: 55,
				offsetX: 10,
				offsetY: 5,
				pageX: 110,
				pageY: 55,
				screenX: 1100,
				screenY: 1050
			})
		);

		pointerMove(
			createEvent({
				clientX: 115,
				clientY: 60,
				offsetX: 10,
				offsetY: 5,
				pageX: 115,
				pageY: 60,
				screenX: 1100,
				screenY: 1050
			})
		);

		const result = d.get('root');

		assert.deepEqual(result, {
			isDragging: true,
			delta: { x: 15, y: 10 },
			start: {
				client: {
					x: 100,
					y: 50
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 100,
					y: 50
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});
	});

	it('render not done between drag and pointer up should be cumulative', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];
		const pointerMove = global.window.addEventListener.getCall(1).args[1];
		const pointerUp = global.window.addEventListener.getCall(2).args[1];

		pointerDown(
			createEvent({
				clientX: 100,
				clientY: 50,
				offsetX: 10,
				offsetY: 5,
				pageX: 100,
				pageY: 50,
				screenX: 1100,
				screenY: 1050
			})
		);

		d.get('root');

		pointerMove(
			createEvent({
				clientX: 110,
				clientY: 55,
				offsetX: 10,
				offsetY: 5,
				pageX: 110,
				pageY: 55,
				screenX: 1100,
				screenY: 1050
			})
		);

		pointerMove(
			createEvent({
				clientX: 115,
				clientY: 60,
				offsetX: 10,
				offsetY: 5,
				pageX: 115,
				pageY: 60,
				screenX: 1100,
				screenY: 1050
			})
		);

		pointerUp(
			createEvent({
				clientX: 120,
				clientY: 70,
				offsetX: 10,
				offsetY: 5,
				pageX: 120,
				pageY: 70,
				screenX: 1100,
				screenY: 1050
			})
		);

		const result = d.get('root');

		assert.deepEqual(result, {
			isDragging: false,
			delta: { x: 20, y: 20 },
			start: {
				client: {
					x: 100,
					y: 50
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 100,
					y: 50
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});
	});

	it('ignores movement if start event is not present', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerMove = global.window.addEventListener.getCall(1).args[1];
		const pointerUp = global.window.addEventListener.getCall(2).args[1];

		const moveEvent = createEvent({});

		pointerMove(moveEvent);
		assert.isFalse((moveEvent.preventDefault as SinonSpy).called);
		assert.isFalse((moveEvent.stopPropagation as SinonSpy).called);

		const upEvent = createEvent({});

		pointerUp(upEvent);
		assert.isFalse((upEvent.preventDefault as SinonSpy).called);
		assert.isFalse((upEvent.stopPropagation as SinonSpy).called);
	});

	it('dragging where descendent is target', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];

		pointerDown(
			createEvent({
				target: {
					parentElement: domNode
				} as any
			})
		);

		const result = d.get('root');

		assert.deepEqual(result, {
			isDragging: true,
			delta: { x: 0, y: 0 },
			start: {
				client: {
					x: 0,
					y: 0
				},
				offset: {
					x: 0,
					y: 0
				},
				page: {
					x: 0,
					y: 0
				},
				screen: {
					x: 0,
					y: 0
				}
			}
		});
	});

	it('dragging untracked node should not report results', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];

		const event = createEvent({
			target: {} as any
		});

		pointerDown(event);

		assert.isFalse((event.preventDefault as SinonSpy).called);
		assert.isFalse((event.stopPropagation as SinonSpy).called);
	});

	it('ignores drag events from non-primary events', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];

		const downEvent = createEvent({
			isPrimary: false,
			button: 1
		});

		pointerDown(downEvent);

		assert.isFalse((downEvent.preventDefault as SinonSpy).called);
		assert.isFalse((downEvent.stopPropagation as SinonSpy).called);
	});

	it('should stop dragging on two finger touch', () => {
		const { callback } = drag();
		nodeStub.get.withArgs('root').returns(domNode);

		const d = callback({
			id: 'test',
			middleware: {
				node: nodeStub,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		d.get('root');

		const pointerDown = global.window.addEventListener.getCall(0).args[1];

		pointerDown(
			createEvent({
				clientX: 100,
				clientY: 50,
				offsetX: 10,
				offsetY: 5,
				pageX: 100,
				pageY: 50,
				screenX: 1100,
				screenY: 1050
			})
		);

		const result1 = d.get('root');

		assert.deepEqual(result1, {
			isDragging: true,
			delta: { x: 0, y: 0 },
			start: {
				client: {
					x: 100,
					y: 50
				},
				offset: {
					x: 10,
					y: 5
				},
				page: {
					x: 100,
					y: 50
				},
				screen: {
					x: 1100,
					y: 1050
				}
			}
		});

		pointerDown({
			isPrimary: false,
			clientX: 100,
			clientY: 50,
			offsetX: 10,
			offsetY: 5,
			pageX: 100,
			pageY: 50,
			screenX: 1100,
			screenY: 1050
		});

		const result2 = d.get('root');

		assert.deepEqual(result2, {
			isDragging: false,
			delta: { x: 0, y: 0 }
		});
	});
});
