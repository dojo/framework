import { Set } from '../../../../src/shim/Set';
import { Map } from '../../../../src/shim/Map';
import transition from '../../../../src/core/animations/cssTransitions';
const { describe } = intern.getPlugin('jsdom');
const { it, beforeEach, afterEach } = intern.getInterface('bdd');
import global from '../../../../src/shim/global';

const { assert } = intern.getPlugin('chai');

function createMockElement() {
	const classList = new Set<string>();
	const eventListeners = new Map<string, any>();

	const node: any = {
		removed: false,
		parentNode: {
			removeChild: () => (node.removed = true)
		},
		classList: {
			add(className: string) {
				classList.add(className);
			},
			remove(className: string) {
				classList.delete(className);
			}
		},
		addEventListener(event: string, listener: any) {
			eventListeners.set(event, listener);
		},
		removeEventListener(event: string) {
			eventListeners.delete(event);
		},
		style: {
			transition: true
		}
	};

	return {
		classList,
		eventListeners,
		node
	};
}

let originalRaf: () => void;
let rafCallbacks: (() => void)[] = [];

describe('cssTransitions', () => {
	beforeEach(() => {
		originalRaf = global.requestAnimationFrame;
		global.requestAnimationFrame = (callback: () => void) => rafCallbacks.push(callback);
	});

	afterEach(() => {
		global.requestAnimationFrame = originalRaf;
		rafCallbacks = [];
	});

	describe('enter', () => {
		it('applies classes to element', () => {
			const { classList, node } = createMockElement();

			transition.enter(node, 'class1 class2');

			assert.isTrue(classList.has('class1'), 'class1 has been applied');
			assert.isTrue(classList.has('class2'), 'class2 has been applied');
		});

		it('adds active classes after animation begins', () => {
			const { classList, node } = createMockElement();

			transition.enter(node, 'class1', 'active1 active2');

			assert.lengthOf(rafCallbacks, 1, 'requestAnimationFrame has been called');
			rafCallbacks[0]();

			assert.isTrue(classList.has('active1'), 'active1 class has been applied');
			assert.isTrue(classList.has('active2'), 'active2 class has been applied');
		});

		it('adds default active classes when they are not specified', () => {
			const { classList, node } = createMockElement();

			transition.enter(node, 'class1 class2');

			assert.lengthOf(rafCallbacks, 1, 'requestAnimationFrame has been called');
			rafCallbacks[0]();

			assert.isTrue(classList.has('class1-active'), 'class1-active class has been applied');
			assert.isTrue(classList.has('class2-active'), 'class2-active class has been applied');
		});

		it('removes classes when the animation has finished', () => {
			const { classList, node, eventListeners } = createMockElement();

			transition.enter(node, 'class1', 'active1');
			rafCallbacks[0]();

			assert.isTrue(classList.has('class1'), 'class1 class has been applied');
			assert.isTrue(classList.has('active1'), 'active class has been applied');

			assert.isTrue(eventListeners.has('transitionend'), 'transitionend event listener has been registered');
			eventListeners.get('transitionend')();

			assert.isFalse(classList.has('class1'), 'class1 class should not be applied');
			assert.isFalse(classList.has('active1'), 'active1 class should not be applied');
		});
	});

	describe('exit', () => {
		it('applies exit classes', () => {
			const { classList, node } = createMockElement();

			transition.exit(node, 'animation');

			assert.isTrue(classList.has('animation'), 'animation class has been applied');
		});

		it('adds active classes after animation begins', () => {
			const { classList, node } = createMockElement();

			transition.exit(node, 'class1', 'active1 active2');

			assert.lengthOf(rafCallbacks, 1, 'requestAnimationFrame has been called');
			rafCallbacks[0]();

			assert.isTrue(classList.has('active1'), 'active1 class has been applied');
			assert.isTrue(classList.has('active2'), 'active2 class has been applied');
		});

		it('adds default active classes when they are not specified', () => {
			const { classList, node } = createMockElement();

			transition.exit(node, 'class1 class2');

			assert.lengthOf(rafCallbacks, 1, 'requestAnimationFrame has been called');
			rafCallbacks[0]();

			assert.isTrue(classList.has('class1-active'), 'class1-active class has been applied');
			assert.isTrue(classList.has('class2-active'), 'class2-active class has been applied');
		});

		it('removes the node when animation is complete', () => {
			const { classList, node, eventListeners } = createMockElement();

			transition.exit(node, 'class1', 'active1');
			rafCallbacks[0]();

			assert.isTrue(classList.has('class1'), 'class1 class has been applied');
			assert.isTrue(classList.has('active1'), 'active class has been applied');

			assert.isTrue(eventListeners.has('transitionend'), 'transitionend event listener has been registered');
			eventListeners.get('transitionend')();

			assert.isTrue(node.removed, 'node has been removed');
		});
	});
});
