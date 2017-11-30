/* tslint:disable:no-var-keyword */

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import * as sinon from 'sinon';
import * as aspect from '../../src/aspect';
import { Handle } from '../../src/interfaces';
import Map from '@dojo/shim/Map';
import { ObjectSuiteDescriptor } from 'intern/lib/interfaces/object';

const slice = Array.prototype.slice;
let obj: any;
let methodSpy: any;
let map: Map<string | symbol, (...args: any[]) => any>;

function createBeforeSpy() {
	return sinon.spy(function (a: number) {
		return [a + 1];
	});
}

function indexableTests(property: string | symbol): ObjectSuiteDescriptor {
	return {
		beforeEach() {
			methodSpy = sinon.spy(function (a: number) {
				return a + 1;
			});
			obj = { [property]: methodSpy };
		},

		tests: {
			'.before': {
				'return value passed as arguments'() {
					let aspectSpy = createBeforeSpy();

					aspect.before(obj, property, aspectSpy);

					obj[property](0);
					assert.isTrue(aspectSpy.calledBefore(methodSpy));
					assert.isTrue(aspectSpy.calledOnce);
					assert.isTrue(methodSpy.calledOnce);
					assert.strictEqual(aspectSpy.lastCall.args[0], 0);
					assert.strictEqual(methodSpy.lastCall.args[0], 1);
					assert.strictEqual(methodSpy.returnValues[0], 2);
				},

				'no return value from advising function'() {
					let receivedArgs: string[] = [];
					let beforeCalled = false;
					let obj = {
						[property]: function (...args: string[]) {
							receivedArgs = args;
						}
					};

					aspect.before(obj, property, function () {
						beforeCalled = true;
					});

					obj[property]('foo', 'bar');

					assert.isTrue(beforeCalled,
						'Before advice should be called before original function');
					assert.deepEqual(receivedArgs, [ 'foo', 'bar' ],
						'Arguments passed to original method should be unaltered if before advice returns undefined');
				},

				'multiple aspect.before()'() {
					const aspectSpy1 = createBeforeSpy();
					const aspectSpy2 = createBeforeSpy();

					aspect.before(obj, property, aspectSpy1);
					aspect.before(obj, property, aspectSpy2);

					obj[property](5);
					assert.isTrue(aspectSpy2.calledBefore(aspectSpy1));
					assert.isTrue(aspectSpy1.calledBefore(methodSpy));
					assert.strictEqual(aspectSpy2.lastCall.args[0], 5);
					assert.strictEqual(aspectSpy1.lastCall.args[0], 6);
					assert.strictEqual(methodSpy.lastCall.args[0], 7);
					assert.strictEqual(methodSpy.returnValues[0], 8);
				},

				'multiple aspect.before() with removal inside handler'() {
					let count = 0;

					const handle1 = aspect.before(obj, property, function () {
						count++;
					});

					// FIXME: TDZ
					var handle2 = aspect.before(obj, property, function () {
						handle2.destroy();
						handle1.destroy();
						count++;
					});

					assert.doesNotThrow(function () {
						obj[property]();
					});
					assert.strictEqual(count, 1, 'Only one advising function should be called');
				}
			},

			'.after': {
				'overriding return value from original method'() {
					const expected = 'override!';
					const aspectSpy = sinon.stub().returns(expected);

					aspect.after(obj, property, aspectSpy);
					assert.strictEqual(obj[property](0), expected);
					assert.isTrue(aspectSpy.calledAfter(methodSpy));
				},

				'multiple aspect.after()'() {
					const aspectStub1 = sinon.stub();
					const aspectStub2 = sinon.stub();

					aspect.after(obj, property, aspectStub1);
					aspect.after(obj, property, aspectStub2);

					obj[property](0);
					assert.isTrue(aspectStub1.calledAfter(methodSpy));
					assert.isTrue(aspectStub2.calledAfter(aspectStub1));
				},

				'multiple aspect.after() with removal inside handler'() {
					let count = 0;

					let handle2: Handle;

					// FIXME: TDZ
					var handle1 = aspect.after(obj, property, function () {
						handle1.destroy();
						handle2.destroy();
						count++;
					});

					handle2 = aspect.after(obj, property, function () {
						count++;
					});

					assert.doesNotThrow(function () {
						obj[property]();
					});
					assert.strictEqual(count, 1, 'Only one advising function should be called');
				},

				'provides the original arguments to the aspect method'() {
					const expected = 'expected';
					const aspectStub = sinon.stub().returns(expected);

					aspect.after(obj, property, aspectStub);
					assert.strictEqual(obj[property](0), expected);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
					assert.strictEqual(aspectStub.lastCall.args[0], 1);
					assert.deepEqual(slice.call(aspectStub.lastCall.args[1]), methodSpy.lastCall.args);
				}
			},

			'.around': {
				'single around'() {
					const expected = 5;
					const aroundFunction = sinon.stub().returns(expected);
					const aspectStub = sinon.stub().returns(aroundFunction);

					aspect.around(obj, property, aspectStub);

					assert.strictEqual(obj[property](0), expected);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aroundFunction.calledOnce);
					assert.strictEqual(aroundFunction.firstCall.args[0], 0);
					assert.isFalse(methodSpy.called);

					// test that the original method was provided
					aspectStub.callArgWith(0, 10);
					assert.isTrue(methodSpy.calledOnce);
					assert.strictEqual(methodSpy.firstCall.args[0], 10);
				}
			},

			'.on()': {
				'advising function returns undefined, returns original result'() {
					const aspectStub = sinon.stub();

					aspect.on(obj, property, aspectStub);

					assert.strictEqual(obj[property](0), 1);

					assert.deepEqual(aspectStub.lastCall.args, methodSpy.lastCall.args);
					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
				},

				'advising function returns defined values, returns advising function result'() {
					const aspectStub = sinon.stub().returns(2);

					aspect.on(obj, property, aspectStub);

					assert.strictEqual(obj[property](0), 2);
					assert.deepEqual(aspectStub.lastCall.args, methodSpy.lastCall.args);
					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
				},

				'there are previous advising functions (covering previous.next)'() {
					const aspectStub1 = sinon.stub().returns(2);
					const aspectStub2 = sinon.stub();
					const aspectStub3 = sinon.stub().returns(6);

					aspect.on(obj, property, aspectStub1);
					aspect.on(obj, property, aspectStub2);
					aspect.on(obj, property, aspectStub3);

					assert.strictEqual(obj[property](0), 6);

					assert.deepEqual(aspectStub1.lastCall.args, methodSpy.lastCall.args);
					assert.deepEqual(aspectStub2.lastCall.args, methodSpy.lastCall.args);
					assert.deepEqual(aspectStub3.lastCall.args, methodSpy.lastCall.args);

					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub1.calledOnce);
					assert.isTrue(aspectStub2.calledOnce);
					assert.isTrue(aspectStub3.calledOnce);

					sinon.assert.callOrder(methodSpy, aspectStub1, aspectStub2, aspectStub3);
				}
			},

			'handle.destroy()': {
				'prevents aspect from being called'() {
					const aspectSpy = createBeforeSpy();
					const handle = aspect.before(obj, property, aspectSpy);

					obj[property](0);
					assert.notEqual(obj[property], methodSpy);

					handle.destroy();
					obj[property](1);
					assert.notEqual(obj[property], methodSpy);
					assert.isTrue(methodSpy.calledTwice);
					assert.isTrue(aspectSpy.calledOnce);
				},

				'can remove an aspect from the middle of a list'() {
					const aspectSpy1 = createBeforeSpy();
					const aspectSpy2 = createBeforeSpy();
					const handle = aspect.before(obj, property, aspectSpy1);

					aspect.before(obj, property, aspectSpy2);
					handle.destroy();

					obj[property](0);
					assert.isTrue(methodSpy.called);
					assert.isTrue(aspectSpy2.called);
					assert.isFalse(aspectSpy1.called);
				},

				'removing a aspect stub'() {
					const obj: any = {};
					const aspectSpy = sinon.stub();
					aspect.before(obj, property, sinon.stub());
					const handle = aspect.before(obj, property, aspectSpy);

					handle.destroy();
					obj[property](0);
					assert.isFalse(aspectSpy.called);
				},

				'removing the first of multiple aspects'() {
					const aroundFunction = sinon.stub();
					const aspectStub = sinon.stub().returns(aroundFunction);
					const handle = aspect.around(obj, property, aspectStub);

					handle.destroy();
					obj[property](0);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(methodSpy.calledOnce);
					assert.isFalse(aroundFunction.called);
				}
			}
		}
	};
}

function mapTests(property: string | symbol): ObjectSuiteDescriptor {
	return {
		beforeEach() {
			methodSpy = sinon.spy(function (a: number) {
				return a + 1;
			});
			map = new Map([ [ property, methodSpy ] ]);
		},

		tests: {
			'.before': {
				'return value passed as arguments'() {
					let aspectSpy = createBeforeSpy();

					aspect.before(map, property, aspectSpy);

					const method = map.get(property);
					method && method(0);
					assert.isTrue(aspectSpy.calledBefore(methodSpy));
					assert.isTrue(aspectSpy.calledOnce);
					assert.isTrue(methodSpy.calledOnce);
					assert.strictEqual(aspectSpy.lastCall.args[0], 0);
					assert.strictEqual(methodSpy.lastCall.args[0], 1);
					assert.strictEqual(methodSpy.returnValues[0], 2);
				},

				'no return value from advising function'() {
					let receivedArgs: string[] = [];
					let beforeCalled = false;
					map = new Map([ [ property, function (...args: string[]) {
							receivedArgs = args;
						} ] ]);

					aspect.before(map, property, function () {
						beforeCalled = true;
					});

					const method = map.get(property);
					method && method('foo', 'bar');

					assert.isTrue(beforeCalled,
						'Before advice should be called before original function');
					assert.deepEqual(receivedArgs, [ 'foo', 'bar' ],
						'Arguments passed to original method should be unaltered if before advice returns undefined');
				},

				'multiple aspect.before()'() {
					const aspectSpy1 = createBeforeSpy();
					const aspectSpy2 = createBeforeSpy();

					aspect.before(map, property, aspectSpy1);
					aspect.before(map, property, aspectSpy2);

					const method = map.get(property);
					method && method(5);
					assert.isTrue(aspectSpy2.calledBefore(aspectSpy1));
					assert.isTrue(aspectSpy1.calledBefore(methodSpy));
					assert.strictEqual(aspectSpy2.lastCall.args[0], 5);
					assert.strictEqual(aspectSpy1.lastCall.args[0], 6);
					assert.strictEqual(methodSpy.lastCall.args[0], 7);
					assert.strictEqual(methodSpy.returnValues[0], 8);
				},

				'multiple aspect.before() with removal inside handler'() {
					let count = 0;

					const handle1 = aspect.before(map, property, function () {
						count++;
					});

					// FIXME: TDZ
					var handle2 = aspect.before(map, property, function () {
						handle2.destroy();
						handle1.destroy();
						count++;
					});

					assert.doesNotThrow(function () {
						const method = map.get(property);
						method && method();
					});
					assert.strictEqual(count, 1, 'Only one advising function should be called');
				}
			},

			'.after': {
				'overriding return value from original method'() {
					const expected = 'override!';
					const aspectSpy = sinon.stub().returns(expected);

					aspect.after(map, property, aspectSpy);
					const method = map.get(property);
					assert.strictEqual(method && method(0), expected);
					assert.isTrue(aspectSpy.calledAfter(methodSpy));
				},

				'multiple aspect.after()'() {
					const aspectStub1 = sinon.stub();
					const aspectStub2 = sinon.stub();

					aspect.after(map, property, aspectStub1);
					aspect.after(map, property, aspectStub2);

					const method = map.get(property);
					method && method(0);
					assert.isTrue(aspectStub1.calledAfter(methodSpy));
					assert.isTrue(aspectStub2.calledAfter(aspectStub1));
				},

				'multiple aspect.after() with removal inside handler'() {
					let count = 0;

					let handle2: Handle;

					// FIXME: TDZ
					var handle1 = aspect.after(map, property, function () {
						handle1.destroy();
						handle2.destroy();
						count++;
					});

					handle2 = aspect.after(map, property, function () {
						count++;
					});

					assert.doesNotThrow(function () {
						const method = map.get(property);
						method && method();
					});
					assert.strictEqual(count, 1, 'Only one advising function should be called');
				},

				'provides the original arguments to the aspect method'() {
					const expected = 'expected';
					const aspectStub = sinon.stub().returns(expected);

					aspect.after(map, property, aspectStub);
					const method = map.get(property);
					assert.strictEqual(method && method(0), expected);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
					assert.strictEqual(aspectStub.lastCall.args[0], 1);
					assert.deepEqual(slice.call(aspectStub.lastCall.args[1]), methodSpy.lastCall.args);
				}
			},

			'.around': {
				'single around'() {
					const expected = 5;
					const aroundFunction = sinon.stub().returns(expected);
					const aspectStub = sinon.stub().returns(aroundFunction);

					aspect.around(map, property, aspectStub);

					const method = map.get(property);
					assert.strictEqual(method && method(0), expected);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aroundFunction.calledOnce);
					assert.strictEqual(aroundFunction.firstCall.args[0], 0);
					assert.isFalse(methodSpy.called);

					// test that the original method was provided
					aspectStub.callArgWith(0, 10);
					assert.isTrue(methodSpy.calledOnce);
					assert.strictEqual(methodSpy.firstCall.args[0], 10);
				}
			},

			'.on()': {
				'advising function returns undefined, returns original result'() {
					const aspectStub = sinon.stub();

					aspect.on(map, property, aspectStub);

					const method = map.get(property);
					assert.strictEqual(method && method(0), 1);

					assert.deepEqual(aspectStub.lastCall.args, methodSpy.lastCall.args);
					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
				},

				'advising function returns defined values, returns advising function result'() {
					const aspectStub = sinon.stub().returns(2);

					aspect.on(map, property, aspectStub);

					const method = map.get(property);
					assert.strictEqual(method && method(0), 2);
					assert.deepEqual(aspectStub.lastCall.args, methodSpy.lastCall.args);
					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(aspectStub.calledAfter(methodSpy));
				},

				'there are previous advising functions (covering previous.next)'() {
					const aspectStub1 = sinon.stub().returns(2);
					const aspectStub2 = sinon.stub();
					const aspectStub3 = sinon.stub().returns(6);

					aspect.on(map, property, aspectStub1);
					aspect.on(map, property, aspectStub2);
					aspect.on(map, property, aspectStub3);

					const method = map.get(property);
					assert.strictEqual(method && method(0), 6);

					assert.deepEqual(aspectStub1.lastCall.args, methodSpy.lastCall.args);
					assert.deepEqual(aspectStub2.lastCall.args, methodSpy.lastCall.args);
					assert.deepEqual(aspectStub3.lastCall.args, methodSpy.lastCall.args);

					assert.isTrue(methodSpy.calledOnce);
					assert.isTrue(aspectStub1.calledOnce);
					assert.isTrue(aspectStub2.calledOnce);
					assert.isTrue(aspectStub3.calledOnce);

					sinon.assert.callOrder(methodSpy, aspectStub1, aspectStub2, aspectStub3);
				}
			},

			'handle.destroy()': {
				'prevents aspect from being called'() {
					const aspectSpy = createBeforeSpy();
					const handle = aspect.before(map, property, aspectSpy);

					let method = map.get(property);
					method && method(0);
					assert.notEqual(map.get(property), methodSpy);

					handle.destroy();
					method = map.get(property);
					method && method(1);
					assert.notEqual(map.get(property), methodSpy);
					assert.isTrue(methodSpy.calledTwice);
					assert.isTrue(aspectSpy.calledOnce);
				},

				'can remove an aspect from the middle of a list'() {
					const aspectSpy1 = createBeforeSpy();
					const aspectSpy2 = createBeforeSpy();
					const handle = aspect.before(map, property, aspectSpy1);

					aspect.before(map, property, aspectSpy2);
					handle.destroy();

					const method = map.get(property);
					method && method(0);
					assert.isTrue(methodSpy.called);
					assert.isTrue(aspectSpy2.called);
					assert.isFalse(aspectSpy1.called);
				},

				'removing a aspect stub'() {
					const map = new Map();
					const aspectSpy = sinon.stub();
					aspect.before(map, property, sinon.stub());
					const handle = aspect.before(map, property, aspectSpy);

					handle.destroy();
					const method: any = map.get(property);
					method && method(0);
					assert.isFalse(aspectSpy.called);
				},

				'removing the first of multiple aspects'() {
					const aroundFunction = sinon.stub();
					const aspectStub = sinon.stub().returns(aroundFunction);
					const handle = aspect.around(map, property, aspectStub);

					handle.destroy();
					const method = map.get(property);
					method && method(0);
					assert.isTrue(aspectStub.calledOnce);
					assert.isTrue(methodSpy.calledOnce);
					assert.isFalse(aroundFunction.called);
				}
			}
		}
	};
}

registerSuite('aspect', {
	'with indexable objects': {
		'string properties': indexableTests('method'),
		'symbol properties': indexableTests(Symbol())
	},

	'with maps': {
		'string indexes': mapTests('method'),
		'symbol indexes': mapTests(Symbol())
	},
	'join points': {
		'before advice': {
			'adjust arguments': function () {
				let result = 0;
				function foo(a: number) {
					result = a;
				}

				function advice(a: number) {
					return [ a * a ];
				}

				const fn = aspect.before(foo, advice);

				fn(2);

				assert.strictEqual(result, 4, '"result" should equal 4');
			},
			'passes this': function () {
				let result = 0;
				function foo(this: any) {
					result = this.a;
				}

				function advice(this: any) {
					this.a = 2;
				}

				const fn = aspect.before(foo, advice);
				const context = { a: 0 };
				fn.call(context);
				assert.strictEqual(context.a, 2, 'context.a should equal 2');
				assert.strictEqual(result, 2, 'result should equal 2');
			},
			'multiple before advice': function () {
				let result = 0;
				const calls: string[] = [];
				function foo(a: number) {
					result = a;
				}

				function advice1(...args: any[]) {
					calls.push('1');
					args[0] = args[0] + args[0];
					return args;
				}

				function advice2(a: number) {
					calls.push('2');
					return [ ++a ];
				}

				const fn = aspect.before(aspect.before(foo, advice1), advice2);
				fn(2);
				assert.strictEqual(result, 6, '"result" should equal 5');
				assert.deepEqual(calls, [ '2', '1' ], 'advice should be called in order');
			}
		},
		'after advice': {
			'adjust return value': function () {
				function foo(a: number) {
					return a;
				}

				function advice(prevResult: number, ...args: any[]) {
					return prevResult * args[0];
				}

				const fn = aspect.after(foo, advice);

				const result = fn(2);

				assert.strictEqual(result, 4, '"result" should equal 4');
			},
			'passes this': function () {
				function foo(this: any) {
					return this.a;
				}

				function advice(this: any, prevResult: number) {
					this.c = prevResult + this.b;
					return this.c;
				}

				const fn = aspect.after(foo, advice);
				const context = { a: 2, b: 2, c: 0 };
				const result = fn.call(context);
				assert.strictEqual(result, 4, '"result" should equal 4');
				assert.strictEqual(context.c, 4, '"context.c" should equal 4');
			},
			'multiple after advice': function () {
				const calls: string[] = [];
				function foo(a: number): number {
					return a;
				}

				function advice1(prevResult: number, ...args: any[]) {
					calls.push('1');
					return prevResult + args[0];
				}

				function advice2(prevResult: number, ...args: any[]) {
					calls.push('2');
					return prevResult + args[0] + 1;
				}

				let fn = aspect.after(foo, advice1);
				fn = aspect.after(fn, advice2);
				const result = fn(2);
				assert.strictEqual(result, 7, '"result" should equal 7');
				assert.deepEqual(calls, [ '1', '2' ], 'call should have been made in order');
			}
		},
		'around advice': {
			'basic function': function () {
				function foo(a: number): number {
					return a;
				}

				function advice(origFn: Function): (...args: any[]) => number {
					return function(this: any, ...args: any[]): number {
						args[0] = args[0] + args[0];
						let result = origFn.apply(this, args);
						return ++result;
					};
				}

				const fn = aspect.around(foo, advice);
				const result = fn(2);
				assert.strictEqual(result, 5, '"result" should equal 5');
			},
			'preserves this': function () {
				function foo(this: any, a: number): number {
					return this.a;
				}

				function advice(origFn: Function): (...args: any[]) => number {
					return function(this: any, ...args: any[]): number {
						this.a = 2;
						return origFn.apply(this, args);
					};
				}

				const context = { a: 2 };
				const fn = aspect.around(foo, advice);
				const result = fn.apply(context);
				assert.strictEqual(result, 2, '"result" should equal 2');
			},
			'multiple around advice': function () {
				const calls: string[] = [];
				function foo(a: number): number {
					return a;
				}

				function advice1(origFn: Function): (...args: any[]) => number {
					return function (this: any, ...args: any[]): number {
						calls.push('1');
						args[0]++;
						return origFn.apply(this, args) + 1;
					};
				}

				function advice2(origFn: Function): (...args: any[]) => number {
					return function (this: any, ...args: any[]): number {
						calls.push('2');
						args[0] += args[0];
						return origFn.apply(this, args) + 1;
					};
				}

				const fn = aspect.around(aspect.around(foo, advice1), advice2);
				const result = fn(2);
				assert.strictEqual(result, 7, '"result" should equal 7');
				assert.deepEqual(calls, [ '2', '1' ]);
			}
		},
		'combined advice': {
			'before and after': function () {
				function foo(a: number): number {
					return a + a;
				}

				function adviceBefore(...args: any[]): any[] {
					args[0] = args[0] + args[0];
					return args;
				}

				function adviceAfter(origResult: number, ...args: any[]): number {
					return origResult + args[0] + 1;
				}

				let fn = aspect.after(foo, adviceAfter);
				fn = aspect.before(fn, adviceBefore);
				const result = fn(2);
				assert.strictEqual(result, 13, '"result" should equal 13');
			}
		},
		'chained advice'() {
			function foo(a: string): string {
				return a;
			}

			function adviceAfter(origResult: string): string {
				return origResult + 'foo';
			}

			const fn = aspect.after(aspect.after(foo, adviceAfter), adviceAfter);
			aspect.after(fn, adviceAfter);
			assert.strictEqual(fn('bar'), 'barfoofoo', 'should only apply advice twice');
		}
	}
});
