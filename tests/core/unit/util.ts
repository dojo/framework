import { isVNode, isWNode, v, w } from '../../../src/core/vdom';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as sinon from 'sinon';
import {
	debounce,
	deepAssign,
	deepMixin,
	throttle,
	uuid,
	mixin,
	partial,
	guaranteeMinimumTimeout,
	replace
} from '../../../src/core/util';
import { Handle } from '../../../src/core/Destroyable';
import WidgetBase from '../../../src/core/WidgetBase';
import { DNode, VNode, WNode } from '../../../src/core/interfaces';

const TIMEOUT = 3000;
let timerHandle: Handle | null;

function destroyTimerHandle() {
	if (timerHandle) {
		timerHandle.destroy();
		timerHandle = null;
	}
}

registerSuite('util functions', {
	'.deepAssign()'() {
		const source: {
			a: number;
			b: {
				enumerable: boolean;
				configurable: boolean;
				writable: boolean;
				value: number;
			};
			c: {
				d: number;
				e: any[];
			};
		} = Object.create(
			{ a: 1 },
			{
				b: {
					enumerable: false,
					configurable: true,
					writable: true,
					value: 2
				}
			}
		);

		source.c = {
			d: 3,
			e: [4, [5], { f: 6 }]
		};

		const object: {} = Object.create(null);
		const assignedObject: {} & typeof source = deepAssign(object, source);

		assert.strictEqual(object, assignedObject, 'deepAssign should return the modified target object');
		assert.isUndefined(assignedObject.a, 'deepAssign should not copy inherited properties');
		assert.isUndefined(assignedObject.b, 'deepAssign should not copy non-enumerable properties');
		assert.strictEqual(assignedObject.c.d, 3);
		assert.strictEqual(assignedObject.c.e.length, 3);
		assert.notStrictEqual(assignedObject.c.e[1], source.c.e[1], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(assignedObject.c.e[2], source.c.e[2], 'deepAssign should perform a deep copy');
		assert.notStrictEqual(assignedObject.c.e, source.c.e, 'deepAssign should perform a deep copy');
	},

	'.deepAssign() merges nested object on to the target'() {
		const target = {
			apple: 0,
			banana: {
				weight: 52,
				price: 100,
				details: {
					colour: 'brown',
					texture: 'soft'
				}
			},
			cherry: 97
		};

		const source = {
			banana: { price: 200, details: { colour: 'yellow' } },
			durian: 100
		};

		const assignedObject = deepAssign(target, source);
		assert.deepEqual(assignedObject, {
			apple: 0,
			banana: { weight: 52, price: 200, details: { colour: 'yellow', texture: 'soft' } },
			cherry: 97,
			durian: 100
		});
	},

	'.deepAssign() objects with circular references'() {
		const target: any = {
			nested: {
				baz: 'foo',
				qux: 'baz'
			}
		};

		target.cyclical = target;

		const source: any = {
			nested: {
				foo: 'bar',
				bar: 'baz',
				baz: 'qux'
			}
		};
		source.cyclical = source;

		const assignedObject = deepAssign(target, source);
		assert.deepEqual(assignedObject.nested, { foo: 'bar', bar: 'baz', baz: 'qux', qux: 'baz' });
	},

	'.deepAssign with a source with two properties holding the same reference'() {
		const target: any = {};

		const foo = {
			foo: 'bar'
		};

		const source: any = {
			bar: foo,
			baz: foo,
			qux: {
				foo,
				bar: {
					foo
				}
			}
		};

		const assignedObject = deepAssign(target, source);
		assert.deepEqual(assignedObject, {
			bar: { foo: 'bar' },
			baz: { foo: 'bar' },
			qux: { foo: { foo: 'bar' }, bar: { foo: { foo: 'bar' } } }
		});
	},

	'.mixin()'() {
		const source: {
			a: number;
			c: number;
			nested: {
				a: number;
			};
			b: number;
			hidden: number;
		} = Object.create({
			a: 1
		});
		source.c = 3;
		source.nested = { a: 5 };
		Object.defineProperty(source, 'b', {
			enumerable: true,
			get: function() {
				return 2;
			}
		});
		Object.defineProperty(source, 'hidden', {
			enumerable: false,
			value: 4
		});

		const object: {} = Object.create(null);
		const mixedObject = mixin(object, source);

		assert.strictEqual(object, mixedObject, 'mixin should return the modified target object');
		assert.strictEqual(mixedObject.a, 1, 'mixin should copy inherited properties');
		assert.strictEqual(mixedObject.b, 2);
		assert.strictEqual(mixedObject.c, 3);
		assert.isUndefined(mixedObject.hidden, 'mixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested, source.nested, 'mixin should perform a shallow copy');
		assert.strictEqual(mixedObject.nested.a, 5);
	},

	'.mixin() - multiple sources'() {
		const source1 = {
			a: 12,
			b: false
		};
		const source2 = {
			c: 'string'
		};
		const mixedObject = mixin({}, source1, source2);

		assert.strictEqual(mixedObject.a, 12);
		assert.strictEqual(mixedObject.b, false);
		assert.strictEqual(mixedObject.c, 'string');
	},

	'.deepMixin()'() {
		const source: {
			nested: {
				a: number;
				b: any[];
			};
			a: number;
			b: number;
			c: number;
			d: Date;
			e: RegExp;
			hidden: number;
		} = Object.create({
			nested: {
				a: 1,
				b: [2, [3], { f: 4 }]
			}
		});
		source.a = 1;
		source.c = 3;
		source.d = new Date();
		source.e = /abc/;
		Object.defineProperty(source, 'b', {
			enumerable: true,
			get: function() {
				return 2;
			}
		});
		Object.defineProperty(source, 'hidden', {
			enumerable: false,
			value: 4
		});

		const object: {} = Object.create(null);
		const mixedObject: {} & typeof source = deepMixin(object, source);

		assert.strictEqual(object, mixedObject, 'deepMixin should return the modified target object');
		assert.strictEqual(mixedObject.a, 1);
		assert.strictEqual(mixedObject.b, 2);
		assert.strictEqual(mixedObject.c, 3);
		assert.strictEqual(mixedObject.d, source.d, 'deepMixin should not deep copy Date object');
		assert.strictEqual(mixedObject.e, source.e, 'deepMixin should not deep copy RegExp object');
		assert.isUndefined(mixedObject.hidden, 'deepMixin should not copy non-enumerable properties');
		assert.strictEqual(mixedObject.nested.a, 1, 'deepMixin should copy inherited properties');
		assert.notStrictEqual(mixedObject.nested, source.nested, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b, source.nested.b, 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[1], source.nested.b[1], 'deepMixin should perform a deep copy');
		assert.notStrictEqual(mixedObject.nested.b[2], source.nested.b[2], 'deepMixin should perform a deep copy');
	},

	'.deepMixin() merges nested object on to the target'() {
		const target = Object.create({
			apple: 0,
			banana: {
				weight: 52,
				price: 100,
				details: {
					colour: 'brown',
					texture: 'soft'
				}
			},
			cherry: 97
		});

		const source = Object.create({
			banana: { price: 200, details: { colour: 'yellow' } },
			durian: 100
		});

		const assignedObject = deepMixin(target, source);
		assert.deepEqual(assignedObject, {
			apple: 0,
			banana: { weight: 52, price: 200, details: { colour: 'yellow', texture: 'soft' } },
			cherry: 97,
			durian: 100
		});
	},

	'.deepMixin() objects with circular references'() {
		let target: any = {
			nested: {
				baz: 'foo',
				qux: 'baz'
			}
		};

		target.cyclical = target;

		target = Object.create(target);

		let source: any = {
			nested: {
				foo: 'bar',
				bar: 'baz',
				baz: 'qux'
			}
		};
		source.cyclical = source;
		source = Object.create(source);

		const assignedObject = deepMixin(target, source);
		assert.deepEqual(assignedObject.nested, { foo: 'bar', bar: 'baz', baz: 'qux', qux: 'baz' });
	},

	'.partial()'() {
		const ending = 'jumps over the lazy dog';
		const finish = partial(
			function(this: any) {
				const start = this && this.start ? [this.start] : [];

				return start.concat(Array.prototype.slice.call(arguments)).join(' ');
			},
			'jumps',
			'over'
		);

		function Sentence(this: any, start: string = '') {
			this.start = start;
		}
		Sentence.prototype.finish = finish;

		assert.strictEqual(
			finish('the lazy dog'),
			ending,
			'The arguments supplied to `partial` should be prepended to the arguments list of the ' +
				'original function.'
		);
		assert.strictEqual(
			finish(),
			'jumps over',
			'The arguments supplied to `partial` should still be used even if no arguments are passed to the ' +
				'wrapped function.'
		);
		assert.strictEqual(
			new (<any>Sentence)('The quick brown fox').finish('the lazy dog'),
			'The quick brown fox ' + ending,
			'A function passed to `partial` should inherit its context.'
		);
	},
	'v4 uuid'() {
		const firstId = uuid();

		assert.isDefined(firstId);
		assert.match(
			firstId,
			new RegExp('^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$', 'ig')
		);

		const secondId = uuid();

		assert.match(
			secondId,
			new RegExp('^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$', 'ig')
		);
		assert.notEqual(firstId, secondId);
	},
	guaranteeMinimumTimeout: {
		destroy(this: any) {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			timerHandle = guaranteeMinimumTimeout(spy, 100);

			setTimeout(function() {
				destroyTimerHandle();
			}, 50);

			setTimeout(
				dfd.callback(function() {
					assert.strictEqual(spy.callCount, 0);
				}),
				110
			);
		},

		timeout(this: any) {
			const dfd = this.async(1000);
			const startTime = Date.now();
			timerHandle = guaranteeMinimumTimeout(
				dfd.callback(function() {
					const dif = Date.now() - startTime;
					assert.isTrue(dif >= 100, 'Delay was ' + dif + 'ms.');
				}),
				100
			);
		},

		'timeout no delay'(this: any) {
			const dfd = this.async(1000);
			timerHandle = guaranteeMinimumTimeout(
				dfd.callback(function() {
					// test will timeout if not called
				})
			);
		},

		'timeout zero delay'(this: any) {
			const dfd = this.async(1000);
			timerHandle = guaranteeMinimumTimeout(
				dfd.callback(function() {
					// test will timeout if not called
				}),
				0
			);
		}
	},
	debounce: {
		'preserves context'(this: any) {
			const dfd = this.async(TIMEOUT);
			// FIXME
			let foo = {
				bar: debounce(
					dfd.callback(function(this: any) {
						assert.strictEqual(this, foo, 'Function should be executed with correct context');
					}),
					0
				)
			};

			foo.bar();
		},

		'receives arguments'(this: any) {
			const dfd = this.async(TIMEOUT);
			const testArg1 = 5;
			const testArg2 = 'a';
			const debouncedFunction = debounce(
				dfd.callback(function(a: number, b: string) {
					assert.strictEqual(a, testArg1, 'Function should receive correct arguments');
					assert.strictEqual(b, testArg2, 'Function should receive correct arguments');
				}),
				0
			);

			debouncedFunction(testArg1, testArg2);
		},

		'debounces callback'(this: any) {
			const dfd = this.async(TIMEOUT);
			const debouncedFunction = debounce(
				dfd.callback(function() {
					assert.isAbove(
						Date.now() - lastCallTick,
						10,
						'Function should not be called until period has elapsed without further calls'
					);

					// Typically, we expect the 3rd invocation to be the one that is executed.
					// Although the setTimeout in 'run' specifies a delay of 5ms, a very slow test environment may
					// take longer. If 25+ ms has actually elapsed, then the first or second invocation may end up
					// being eligible for execution.
				}),
				25
			);

			let runCount = 1;
			let lastCallTick: number;

			function run() {
				lastCallTick = Date.now();
				debouncedFunction();
				runCount += 1;

				if (runCount < 4) {
					setTimeout(run, 5);
				}
			}

			run();
		}
	},
	throttle: {
		'preserves context'(this: any) {
			const dfd = this.async(TIMEOUT);
			// FIXME
			const foo = {
				bar: throttle(
					dfd.callback(function(this: any) {
						assert.strictEqual(this, foo, 'Function should be executed with correct context');
					}),
					0
				)
			};

			foo.bar();
		},

		'receives arguments'(this: any) {
			const dfd = this.async(TIMEOUT);
			const testArg1 = 5;
			const testArg2 = 'a';
			const throttledFunction = throttle(
				dfd.callback(function(a: number, b: string) {
					assert.strictEqual(a, testArg1, 'Function should receive correct arguments');
					assert.strictEqual(b, testArg2, 'Function should receive correct arguments');
				}),
				0
			);

			throttledFunction(testArg1, testArg2);
		},

		'throttles callback'(this: any) {
			const dfd = this.async(TIMEOUT);
			let callCount = 0;
			let cleared = false;
			const throttledFunction = throttle(
				dfd.rejectOnError(function(a: string) {
					callCount++;
					assert.notStrictEqual(a, 'b', 'Second invocation should be throttled');
					// Rounding errors?
					// Technically, the time diff should be greater than 24ms, but in some cases
					// it is equal to 24ms.
					assert.isAbove(
						Date.now() - lastRunTick,
						23,
						'Function should not be called until throttle delay has elapsed'
					);

					lastRunTick = Date.now();
					if (callCount > 1) {
						destroyTimerHandle();
						cleared = true;
						dfd.resolve();
					}
				}),
				25
			);

			let runCount = 1;
			let lastRunTick = 0;

			function run() {
				throttledFunction('a');
				throttledFunction('b');
				runCount += 1;

				if (runCount < 10 && !cleared) {
					timerHandle = guaranteeMinimumTimeout(run, 5);
				}
			}

			run();
			assert.strictEqual(callCount, 1, 'Function should be called as soon as it is first invoked');
		}
	},
	replace: {
		'returning a new node replaces the node, and new children will be checked'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const newGrandChild = v('div', { id: 'grand-child' });
			const newChildOne = w(WidgetBase, {}, [newGrandChild]);
			const newNewGrandChild = v('div', { id: 'new-grand-child' });
			const newChildFour = v('div', { id: 'new-child-four' });
			const newNodeFour = v('div', { id: 'new-node-four' }, [newChildFour]);
			const newNodes = replace(nodes, {
				replace: (node: DNode) => {
					if (node === 'text node') {
						return 'new text node';
					}

					if (isVNode(node) || isWNode(node)) {
						if (node.properties.id === 'child-one') {
							return newChildOne;
						}

						if (node.properties.id === 'node-four') {
							return newNodeFour;
						}

						if (node.properties.id === 'node-three') {
							return false;
						}

						if (node.properties.id === 'grand-child') {
							return newNewGrandChild;
						}

						if (node.properties.id === 'new-child-four') {
							return undefined;
						}
					}

					return node;
				}
			});
			assert.strictEqual(newNodes.length, 4);
			assert.strictEqual(nodeOne.children[0], newChildOne);
			assert.strictEqual(newChildOne.children[0], newNewGrandChild);
			assert.strictEqual(newNodes[1], 'new text node');
			assert.isFalse(newNodes[2]);
			assert.strictEqual(newNodes[3], newNodeFour);
			assert.isUndefined(newNodeFour.children![0]);
		},

		'should accept a replace function'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const newGrandChild = v('div', { id: 'grand-child' });
			const newChildOne = w(WidgetBase, {}, [newGrandChild]);
			const newNewGrandChild = v('div', { id: 'new-grand-child' });
			const newChildFour = v('div', { id: 'new-child-four' });
			const newNodeFour = v('div', { id: 'new-node-four' }, [newChildFour]);
			const newNodes = replace(nodes, (node: DNode) => {
				if (node === 'text node') {
					return 'new text node';
				}

				if (isVNode(node) || isWNode(node)) {
					if (node.properties.id === 'child-one') {
						return newChildOne;
					}

					if (node.properties.id === 'node-four') {
						return newNodeFour;
					}

					if (node.properties.id === 'node-three') {
						return false;
					}

					if (node.properties.id === 'grand-child') {
						return newNewGrandChild;
					}

					if (node.properties.id === 'new-child-four') {
						return undefined;
					}
				}

				return node;
			});
			assert.strictEqual(newNodes.length, 4);
			assert.strictEqual(nodeOne.children[0], newChildOne);
			assert.strictEqual(newChildOne.children[0], newNewGrandChild);
			assert.strictEqual(newNodes[1], 'new text node');
			assert.isFalse(newNodes[2]);
			assert.strictEqual(newNodes[3], newNodeFour);
			assert.isUndefined(newNodeFour.children![0]);
		},

		'should not recurse if "shallow" option is true'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const newNodeFour = v('div', { id: 'new-node-four' });
			const newNodes = replace(nodes, {
				shallow: true,
				replace: (node: DNode) => {
					if (node === 'text node') {
						return 'new text node';
					}

					if (isVNode(node) || isWNode(node)) {
						if (node.properties.id && node.properties.id.indexOf('child') > -1) {
							return null;
						}

						if (node.properties.id === 'node-four') {
							return newNodeFour;
						}

						if (node.properties.id === 'node-three') {
							return false;
						}
					}

					return node;
				}
			});
			assert.strictEqual(newNodes.length, 4);
			assert.strictEqual(nodeOne.children[0], childOne);
			assert.strictEqual(newNodes[1], 'new text node');
			assert.isFalse(newNodes[2]);
			assert.strictEqual(newNodes[3], newNodeFour);
		},

		'replaces only nodes that match predicate'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div', { id: 'child-two' });
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const newNodes = replace(nodes, () => null, function(node: any): node is VNode {
				return Boolean(node.properties && node.properties.id && node.properties.id.indexOf('child') > -1);
			});
			assert.strictEqual(newNodes.length, 4);
			assert.strictEqual(newNodes[0], nodeOne);
			assert.strictEqual(newNodes[1], nodeTwo);
			assert.strictEqual(newNodes[2], nodeThree);
			assert.strictEqual(newNodes[3], nodeFour);
			assert.strictEqual(nodeOne.children[0], null);
			assert.strictEqual((nodeThree as any).children[0], null);
		},

		'replaces no node when predicate not matched'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const predicate = (node: DNode): node is WNode => {
				return false;
			};
			const newNodes = replace(nodes, () => null, predicate);
			assert.strictEqual(newNodes.length, 4);
			assert.strictEqual(newNodes[0], nodeOne);
			assert.strictEqual(newNodes[1], nodeTwo);
			assert.strictEqual(newNodes[2], nodeThree);
			assert.strictEqual(newNodes[3], nodeFour);
			assert.strictEqual(nodeOne.children[0], childOne);
			assert.strictEqual((nodeThree as any).children[0], childTwo);
		},

		'Calling the breaker drains the node queue'() {
			const childOne = v('div', { id: 'child-one' });
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', { id: 'node-three' }, [childTwo]);
			const nodeFour = v('div', { id: 'node-four' });
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			const newNodes = replace(nodes, (node: DNode, breaker) => {
				if (node === 'text node') {
					breaker();
					return 'new text node';
				}

				return null;
			});
			assert.strictEqual(newNodes.length, 4);
			assert.isNull(newNodes[0]);
			assert.strictEqual(newNodes[1], 'new text node');
			assert.strictEqual(newNodes[2], nodeThree);
			assert.strictEqual(newNodes[3], nodeFour);
			assert.strictEqual((newNodes[2] as any).children[0], childTwo);
		},

		'Calling the breaker drains the node queue when editing child nodes'() {
			const childOne = v('div', { id: 'child-one' });
			const childTwo = v('div', { id: 'child-two' });
			const childThree = v('div', { id: 'child-three' });
			const nodeOne = w(WidgetBase, {}, [childOne, childTwo]);
			const nodeTwo = 'text node';
			const nodeThree = w(WidgetBase, {}, [childThree]);
			const nodes = [nodeOne, nodeTwo, nodeThree];
			const newNodes = replace(nodes, (node: DNode, breaker) => {
				if (node === 'text node') {
					return 'new text node';
				}

				if (isVNode(node) && node.properties.id && node.properties.id.indexOf('child') > -1) {
					breaker();
					return null;
				}

				return node;
			});
			assert.strictEqual(newNodes.length, 3);
			assert.strictEqual(newNodes[0], nodeOne);
			assert.strictEqual(newNodes[1], 'new text node');
			assert.strictEqual(newNodes[2], nodeThree);
			assert.isNull((newNodes[0] as any).children[0]);
			assert.strictEqual((newNodes[0] as any).children[1], childTwo);
			assert.strictEqual((newNodes[2] as any).children[0], childThree);
		}
	}
});
