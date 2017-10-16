const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import {
	createConstructRecord,
	CustomDiff,
	diff,
	patch
} from '../../src/compare';

registerSuite('compare', {
	diff: {
		'plain object': {
			'add property'() {
				const patchRecords = diff({
					foo: 'bar'
				}, {});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);
			},

			'update property'() {
				const patchRecords = diff({
					foo: 'bar'
				}, {
					foo: 'qat'
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'update'
					}
				]);
			},

			'delete property'() {
				const patchRecords = diff({}, {
					foo: 'qat'
				});

				assert.deepEqual(patchRecords, [
					{
						name: 'foo',
						type: 'delete'
					}
				]);
			},

			'allowFunctionValues - equal'() {
				const patchRecords = diff({
					foo() { }
				}, {
					foo() { }
				}, { allowFunctionValues: true });

				assert.strictEqual(patchRecords.length, 0, 'should not see a difference');
			},

			'allowFunctionValues - add property'() {
				function foo() {}
				const patchRecords = diff({
					foo
				}, { }, { allowFunctionValues: true });

				assert.deepEqual(patchRecords, [
					{
						type: 'add',
						name: 'foo',
						descriptor: {
							value: foo,
							writable: true,
							enumerable: true,
							configurable: true
						}
					}
				]);
			},

			'primative values'() {
				const patchRecords = diff({
					foo: undefined,
					bar: null,
					baz: '',
					qat: 0,
					qux: false
				}, {});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: undefined, writable: true },
						name: 'foo',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: null, writable: true },
						name: 'bar',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: '', writable: true },
						name: 'baz',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: 0, writable: true },
						name: 'qat',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: false, writable: true },
						name: 'qux',
						type: 'add'
					}
				]);
			},

			'deep add value'() {
				const patchRecords = diff({
					foo: {
						bar: 'baz'
					}
				}, {});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'foo',
						type: 'add',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'baz', writable: true },
								name: 'bar',
								type: 'add'
							}
						]
					}
				]);
			},

			'deep update value'() {
				const patchRecords = diff({
					foo: {
						bar: 'baz'
					}
				}, {
					foo: {
						bar: 1
					}
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: { bar: 1 }, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'baz', writable: true },
								name: 'bar',
								type: 'update'
							}
						]
					}
				]);
			},

			'complex diff'() {
				const patchRecords = diff({
					foo: {
						bar: 'qat'
					},
					baz: {
						qat: {
							qux: true
						}
					},
					qat: 'foo'
				}, {
					foo: {
						bar: {
							qat: true
						},
						baz: undefined
					},
					baz: 1,
					qux: {
						baz: 2
					}
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: { bar: { qat: true }, baz: undefined }, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'qat', writable: true },
								name: 'bar',
								type: 'update'
							},
							{
								name: 'baz',
								type: 'delete'
							}
						]
					}, {
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'baz',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
								name: 'qat',
								type: 'add',
								valueRecords: [
									{
										descriptor: { configurable: true, enumerable: true, value: true, writable: true },
										name: 'qux',
										type: 'add'
									}
								]
							}
						]
					}, {
						descriptor: { configurable: true, enumerable: true, value: 'foo', writable: true },
						name: 'qat',
						type: 'add'
					}, {
						name: 'qux',
						type: 'delete'
					}
				]);
			},

			'no differences'() {
				const patchRecords = diff({
					foo: 'bar'
				}, {
					foo: 'bar'
				});

				assert.deepEqual(patchRecords, []);
			},

			'deep no differences'() {
				const patchRecords = diff({
					foo: { bar: 1 }
				}, {
					foo: { bar: 1 }
				});

				assert.deepEqual(patchRecords, []);
			},

			'symbols are ignored'() {
				const patchRecords = diff({
					foo: 'bar',
					[Symbol.iterator]() { }
				}, {});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);
			},

			'non-enumerable properties are ignored'() {
				const a = {
					foo: 'bar'
				};

				Object.defineProperty(a, 'bar', {
					value: 'baz',
					writable: true,
					enumerable: false,
					configurable: true
				});

				const patchRecords = diff(a, {});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);
			},

			'complex objects': {
				'b object differ is called'() {
					let called = false;
					const a = {
						foo: /foo/
					};
					const customDiff = new CustomDiff((value: RegExp, name, parent) => {
						called = true;
						assert.instanceOf(value, RegExp, 'value should be a regualar expression');
						assert.strictEqual(name, 'foo', 'name should equal "foo"');
						assert.strictEqual(parent, a, 'correct parent should be passed');
					});
					const patchRecords = diff(a, { foo: customDiff });
					assert.isTrue(called, 'object differ should have been called');
					assert.deepEqual(patchRecords, [], 'should have found no differences');
				},

				'a object differ is called'() {
					let called = false;
					const b = { foo: /foo/ };
					const customDiff = new CustomDiff((value: RegExp, name, parent) => {
						called = true;
						assert.instanceOf(value, RegExp, 'value should be a regualar expression');
						assert.strictEqual(name, 'foo', 'name should equal "foo"');
						assert.strictEqual(parent, b, 'correct parent should be passed');
					});
					const a = {
						foo: customDiff
					};
					const patchRecords = diff(a, b);
					assert.isTrue(called, 'object differ should have been called');
					assert.deepEqual(patchRecords, [], 'should have found no differences');
				},

				'difference'() {
					const a = {
						foo: /foo/
					};
					const customDiff = new CustomDiff(() => {
						return createConstructRecord(RegExp);
					});
					const patchRecords = diff(a, { foo: customDiff });
					assert.deepEqual(patchRecords, [
						{ Ctor: RegExp, name: 'foo' }
					], 'should have expected patch records');
				},

				'difference with arguments'() {
					const a = {
						foo: /foo/
					};
					const customDiff = new CustomDiff(() => {
						return createConstructRecord(RegExp, [ '/bar/' ]);
					});
					const patchRecords = diff(a, { foo: customDiff });
					assert.deepEqual(patchRecords, [
						{ args: [ '/bar/' ], Ctor: RegExp, name: 'foo' }
					], 'should have expected patch records');
				},

				'difference with descriptor'() {
					const a = {
						foo: /foo/
					};
					const customDiff = new CustomDiff(() => {
						return createConstructRecord(RegExp, undefined, { writable: true });
					});
					const patchRecords = diff(a, { foo: customDiff });
					assert.deepEqual(patchRecords, [
						{ Ctor: RegExp, descriptor: { writable: true },  name: 'foo' }
					], 'should have expected patch records');
				},

				'deleted property'() {
					const customDiff = new CustomDiff(() => {
						return createConstructRecord(RegExp);
					});
					const patchRecords = diff({ }, { foo: customDiff });
					assert.deepEqual(patchRecords, [
						{ name: 'foo', type: 'delete' }
					], 'should have expected patch records');
				},

				'added property'() {
					const customDiff = new CustomDiff(() => {
						return createConstructRecord(RegExp);
					});
					const patchRecords = diff({ foo: customDiff }, { });
					assert.deepEqual(patchRecords, [
						{ Ctor: RegExp, name: 'foo' }
					], 'should have expected patch records');
				}
			},

			'ignored properties': {
				'string property added'() {
					const a = {
						foo: 'bar',
						bar: 1
					};

					const patchRecords = diff(a, {}, { ignoreProperties: [ 'bar' ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'string property deleted'() {
					const b = {
						foo: 'bar',
						bar: 1
					};

					const patchRecords = diff({}, b, { ignoreProperties: [ 'bar' ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'regex property added'() {
					const a = {
						foo: 'bar',
						_bar: 1
					};

					const patchRecords = diff(a, {}, { ignoreProperties: [ /^_/ ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'regex property deleted'() {
					const b = {
						foo: 'bar',
						_bar: 1
					};

					const patchRecords = diff({}, b, { ignoreProperties: [ /^_/ ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'combined string - regex added'() {
					const a = {
						foo: 'bar',
						bar: 'bar',
						_bar: 1
					};

					const patchRecords = diff(a, {}, { ignoreProperties: [ 'bar', /^_/ ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'combined string - regex deleted'() {
					const b = {
						foo: 'bar',
						bar: 'bar',
						_bar: 1
					};

					const patchRecords = diff({}, b, { ignoreProperties: [ 'bar', /^_/ ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'function added'() {
					const a = {
						foo: 'bar',
						_bar: 1
					};

					const patchRecords = diff(a, {}, { ignoreProperties: (name) => /^_/.test(name) });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'function deleted'() {
					const b = {
						foo: 'bar',
						_bar: 1
					};

					const patchRecords = diff({}, b, { ignoreProperties: (name) => /^_/.test(name) });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'function'() {
					const propertyStack: string[] = [];

					const a = {
						foo: 'bar',
						bar: 1,
						baz: false
					};

					const b = {
						foo: 'bar',
						bar: 1,
						baz: false
					};

					const patchRecords = diff(a, b, { ignoreProperties(name, first, second) {
						propertyStack.push(name);
						assert.strictEqual(first, a);
						assert.strictEqual(second, b);
						return false;
					} });

					assert.deepEqual(patchRecords, [], 'should be no differences');
					assert.deepEqual(propertyStack, [ 'foo', 'bar', 'baz' ]);
				},

				'function and ignored'() {
					const propertyStack: string[] = [];

					const a = {
						foo: 'bar',
						bar: 1,
						baz: false
					};

					const b = {
						foo: 'bar',
						bar: 1,
						baz: false
					};

					const patchRecords = diff(a, b, { ignoreProperties(name, first, second) {
						propertyStack.push(name);
						assert.strictEqual(first, a);
						assert.strictEqual(second, b);
						return true;
					} });

					assert.deepEqual(patchRecords, [], 'should be no differences');
					assert.deepEqual(propertyStack, [ 'foo', 'bar', 'baz' ]);
				}
			},

			'ignored values': {
				'string property equal'() {
					const a = {
						foo: new Error('foo')
					};

					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff(a, b, { ignorePropertyValues: [ 'foo' ] });

					assert.deepEqual(patchRecords, []);
				},

				'string property added'() {
					const foo = new Error('foo');
					const a = {
						foo
					};

					const patchRecords = diff(a, { }, { ignorePropertyValues: [ 'foo' ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: foo, writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'string property deleted'() {
					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff({ }, b, { ignorePropertyValues: [ 'foo' ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'regex property equal'() {
					const a = {
						foo: new Error('foo')
					};

					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff(a, b, { ignorePropertyValues: [ /^foo$/ ] });

					assert.deepEqual(patchRecords, []);
				},

				'regex property added'() {
					const foo = new Error('foo');
					const a = {
						foo
					};

					const patchRecords = diff(a, { }, { ignorePropertyValues: [ /^foo$/ ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: foo, writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'regex property deleted'() {
					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff({ }, b, { ignorePropertyValues: [ /^foo$/ ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				},

				'combined property equal'() {
					const a = {
						foo: new Error('foo'),
						bar: new Error('bar')
					};

					const b = {
						foo: new Error('foo'),
						bar: new Error('bar')
					};

					const patchRecords = diff(a, b, { ignorePropertyValues: [ 'bar', /^foo$/ ] });

					assert.deepEqual(patchRecords, []);
				},

				'combined property added'() {
					const foo = new Error('foo');
					const bar = new Error('bar');
					const a = {
						foo,
						bar
					};

					const patchRecords = diff(a, { }, { ignorePropertyValues: [ 'bar', /^foo$/ ] });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: foo, writable: true },
							name: 'foo',
							type: 'add'
						}, {
							descriptor: { configurable: true, enumerable: true, value: bar, writable: true },
							name: 'bar',
							type: 'add'
						}
					]);
				},

				'combined property deleted'() {
					const b = {
						foo: new Error('foo'),
						bar: new Error('bar')
					};

					const patchRecords = diff({ }, b, { ignorePropertyValues: [ 'bar', /^foo$/ ] });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}, {
							name: 'bar',
							type: 'delete'
						}
					]);
				},

				'function property equal'() {
					const a = {
						foo: new Error('foo')
					};

					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff(a, b, { ignorePropertyValues: (name) => /^foo$/.test(name) });

					assert.deepEqual(patchRecords, []);
				},

				'function property added'() {
					const foo = new Error('foo');
					const a = {
						foo
					};

					const patchRecords = diff(a, { }, { ignorePropertyValues: (name) => /^foo$/.test(name) });

					assert.deepEqual(patchRecords, [
						{
							descriptor: { configurable: true, enumerable: true, value: foo, writable: true },
							name: 'foo',
							type: 'add'
						}
					]);
				},

				'function property deleted'() {
					const b = {
						foo: new Error('foo')
					};

					const patchRecords = diff({ }, b, { ignorePropertyValues: (name) => /^foo$/.test(name) });

					assert.deepEqual(patchRecords, [
						{
							name: 'foo',
							type: 'delete'
						}
					]);
				}
			}
		},

		'array': {
			'same'() {
				const patchRecords = diff([ 1, 2, 3 ], [ 1, 2, 3 ]);

				assert.deepEqual(patchRecords, [ ]);
			},

			'shorter'() {
				const patchRecords = diff([ 1, 2, 3 ], [ 1, 2, 3, 4, 5 ]);

				assert.deepEqual(patchRecords, [
					{
						deleteCount: 2,
						start: 3,
						type: 'splice'
					}
				]);
			},

			'longer'() {
				const patchRecords = diff([ 1, 2, 3, 4, 5 ], [ 1, 2, 3 ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 4, 5 ],
						deleteCount: 0,
						start: 3,
						type: 'splice'
					}
				]);
			},

			'first element changed'() {
				const patchRecords = diff([ 1, 2, 3 ], [ false, 2, 3 ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 1 ],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'middle element changed'() {
				const patchRecords = diff([ 1, 2, 3 ], [ 1, false, 3 ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 2 ],
						deleteCount: 1,
						start: 1,
						type: 'splice'
					}
				]);
			},

			'last element changed' () {
				const patchRecords = diff([ 1, 2, 3 ], [ 1, 2, false ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 3 ],
						deleteCount: 1,
						start: 2,
						type: 'splice'
					}
				]);
			},

			'tail changed plus shorter'() {
				const patchRecords = diff([ 1, 2, 3 ], [ 1, 2, false, 4, 5 ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 3 ],
						deleteCount: 3,
						start: 2,
						type: 'splice'
					}
				]);
			},

			'tail changed plug longer'() {
				const patchRecords = diff([ 1, 2, 3, 4, 5 ], [ 1, 2, false ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 3, 4, 5 ],
						deleteCount: 1,
						start: 2,
						type: 'splice'
					}
				]);
			},

			'multiple changes'() {
				const patchRecords = diff([ 1, 2, 3, 4, 5 ], [ 1, false, 3, 4, false, 6, 7 ]);

				assert.deepEqual(patchRecords, [
					{
						add: [ 2 ],
						deleteCount: 1,
						start: 1,
						type: 'splice'
					}, {
						add: [ 5 ],
						deleteCount: 3,
						start: 4,
						type: 'splice'
					}
				]);
			},

			'primative values array'() {
				const patchRecords = diff([ '', 0, false, undefined, null ], []);

				assert.deepEqual(patchRecords, [
					{
						add: [ '', 0, false, undefined, null ],
						deleteCount: 0,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'allowFunctionValues - equal'() {
				const patchRecords = diff([ function foo () { } ], [ () => undefined ], { allowFunctionValues: true });

				assert.lengthOf(patchRecords, 0, 'should have no differences');
			},

			'allowFunctionValues - add'() {
				function foo() {}
				const patchRecords = diff([ foo ], [], { allowFunctionValues: true });

				assert.deepEqual(patchRecords, [
					{
						add: [ foo ],
						deleteCount: 0,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'array of arrays'() {
				const patchRecords = diff(
					[ [ 1, 2, 3 ], [ 'foo', 'bar', 'baz' ], [ true, false ] ],
					[ [ 1, false, 3], [ 'bar', 'baz' ] ]
				);

				assert.deepEqual(patchRecords, [
					{
						add: [
							[
								{
									add: [ 2 ],
									deleteCount: 1,
									start: 1,
									type: 'splice'
								}
							], [
								{
									add: [ 'foo', 'bar', 'baz' ],
									deleteCount: 2,
									start: 0,
									type: 'splice'
								}
							], [
								{
									add: [ true, false ],
									deleteCount: 0,
									start: 0,
									type: 'splice'
								}
							]
						],
						deleteCount: 2,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'deep no changes'() {
				const patchRecords = diff(
					[ [ 1, 2, 3 ], [ 'foo', 'bar', 'baz' ], [ true, false ] ],
					[ [ 1, 2, 3 ], [ 'foo', 'bar', 'baz' ], [ true, false ] ]
				);

				assert.deepEqual(patchRecords, [ ]);
			}
		},

		'mixed object/arrays': {
			'object with array'() {
				const patchRecords = diff({
					foo: [ 1, 2, 3 ]
				}, {
					foo: [ 1, false, 3 ]
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: [ 1, false, 3 ], writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								add: [ 2 ],
								deleteCount: 1,
								start: 1,
								type: 'splice'
							}
						]
					}
				]);
			},

			'array with objects'() {
				const patchRecords = diff(
					[ { bar: 1 }, { foo: 'bar' }, { baz: 1, qat: false }, { qux: null }, { } ],
					[ { bar: 1 }, { foo: 'baz' }, { baz: 1 }, { }, { qux: null } ]
				);

				assert.deepEqual(patchRecords, [
					{
						add: [
							[
								{
									descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
									name: 'foo',
									type: 'update'
								}
							], [
								{
									descriptor: { configurable: true, enumerable: true, value: false, writable: true },
									name: 'qat',
									type: 'add'
								}
							], [
								{
									descriptor: { configurable: true, enumerable: true, value: null, writable: true },
									name: 'qux',
									type: 'add'
								}
							], [
								{
									name: 'qux',
									type: 'delete'
								}
							]
						],
						deleteCount: 4,
						start: 1,
						type: 'splice'
					}
				]);
			},

			'object array value to object value'() {
				const patchRecords = diff({
					foo: [ 1, 2, 3 ]
				}, {
					foo: { bar: 1 }
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: [ ], writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								add: [ 1, 2, 3 ],
								deleteCount: 0,
								start: 0,
								type: 'splice'
							}
						]
					}
				]);
			},

			'object object value to array value'() {
				const patchRecords = diff({
					foo: { bar: 1 }
				}, {
					foo: [ 1, 2, 3 ]
				});

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 1, writable: true },
								name: 'bar',
								type: 'add'
							}
						]
					}
				]);
			},

			'array array value to object value'() {
				const patchRecords = diff([ [ 1, 2, 3 ] ], [ {
					foo: 1
				} ]);

				assert.deepEqual(patchRecords, [
					{
						add: [
							[
								{
									add: [ 1, 2, 3 ],
									deleteCount: 0,
									start: 0,
									type: 'splice'
								}
							]
						],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'array object value to array value'() {
				const patchRecords = diff([ {
					foo: 1
				} ], [ [ 1, 2, 3 ] ]);

				assert.deepEqual(patchRecords, [
					{
						add: [
							[
								{
									descriptor: { configurable: true, enumerable: true, value: 1, writable: true },
									name: 'foo',
									type: 'add'
								}
							]
						],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'array to object'() {
				const patchRecords = diff([ 1, 2, 3 ], {
					foo: 'bar'
				});

				assert.deepEqual(patchRecords, [
					{
						add: [ 1, 2, 3 ],
						deleteCount: 0,
						start: 0,
						type: 'splice'
					}
				]);
			},

			'object to array'() {
				const patchRecords = diff({
					foo: 'bar'
				}, [ 1, 2, 3 ]);

				assert.deepEqual(patchRecords, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);
			}
		},

		'negative tests'() {
			assert.throws(() => {
				diff({}, 'foo');
			}, TypeError, 'Arguments are not of type object.');

			assert.throws(() => {
				diff('foo', {});
			}, TypeError, 'Arguments are not of type object.');

			assert.throws(() => {
				diff({
					foo: /bar/
				}, {});
			}, TypeError, 'Value of property named "foo" from first argument is not a primative, plain Object, or Array.');

			assert.throws(() => {
				diff([ /foo/ ], []);
			}, TypeError, 'Value of array element "0" from first argument is not a primative, plain Object, or Array.');

			assert.doesNotThrow(() => {
				diff([ ], [ /foo/ ]);
			});

			class Foo {
				bar = 'bar';
			}

			const foo = new Foo();

			assert.throws(() => {
				diff(foo, {});
			}, TypeError, 'Arguments are not plain Objects or Arrays.');

			assert.throws(() => {
				diff({}, foo);
			}, TypeError, 'Arguments are not plain Objects or Arrays.');
		}
	},

	'patch': {
		'plain object': {
			'add property'() {
				const target = {};
				const result = patch(target, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);

				assert.deepEqual(result, {
					foo: 'bar'
				});
				assert.strictEqual(result, target);
			},

			'update property'() {
				const result = patch({
					foo: 'qat'
				}, [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'update'
					}
				]);

				assert.deepEqual(result, {
					foo: 'bar'
				});
			},

			'delete property'() {
				const result = patch({
					foo: 'qat'
				}, [
					{
						name: 'foo',
						type: 'delete'
					}
				]);

				assert.deepEqual(result, {});
			},

			'primative values'() {
				const result = patch({}, [
					{
						descriptor: { configurable: true, enumerable: true, value: undefined, writable: true },
						name: 'foo',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: null, writable: true },
						name: 'bar',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: '', writable: true },
						name: 'baz',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: 0, writable: true },
						name: 'qat',
						type: 'add'
					}, {
						descriptor: { configurable: true, enumerable: true, value: false, writable: true },
						name: 'qux',
						type: 'add'
					}
				]);

				assert.deepEqual(result, {
					foo: undefined,
					bar: null,
					baz: '',
					qat: 0,
					qux: false
				});
			},

			'deep add value'() {
				const result = patch({}, [
					{
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'foo',
						type: 'add',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'baz', writable: true },
								name: 'bar',
								type: 'add'
							}
						]
					}
				]);

				assert.deepEqual(result, {
					foo: {
						bar: 'baz'
					}
				});
			},

			'deep update value'() {
				const target = {
					foo: {
						bar: 1
					}
				};

				const result = patch(target, [
					{
						descriptor: { configurable: true, enumerable: true, value: target.foo, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'baz', writable: true },
								name: 'bar',
								type: 'update'
							}
						]
					}
				]);

				assert.deepEqual(result, {
					foo: {
						bar: 'baz'
					}
				});
				assert.strictEqual(result.foo, target.foo);
			},

			'complex diff'() {
				const target = {
					foo: {
						bar: {
							qat: true
						},
						baz: undefined
					},
					baz: 1,
					qux: {
						baz: 2
					}
				};

				const result = patch(target, [
					{
						descriptor: { configurable: true, enumerable: true, value: target.foo, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 'qat', writable: true },
								name: 'bar',
								type: 'update'
							},
							{
								name: 'baz',
								type: 'delete'
							}
						]
					}, {
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'baz',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
								name: 'qat',
								type: 'add',
								valueRecords: [
									{
										descriptor: { configurable: true, enumerable: true, value: true, writable: true },
										name: 'qux',
										type: 'add'
									}
								]
							}
						]
					}, {
						descriptor: { configurable: true, enumerable: true, value: 'foo', writable: true },
						name: 'qat',
						type: 'add'
					}, {
						name: 'qux',
						type: 'delete'
					}
				]);

				const expected = {
					foo: {
						bar: 'qat'
					},
					baz: {
						qat: {
							qux: true
						}
					},
					qat: 'foo'
				};

				assert.deepEqual(result, expected, 'Result should match expected');
				assert.deepEqual(target, expected, 'Original target should match expected');
				assert.strictEqual(target, result, 'target and result should be strictly equal');
			},

			'empty patch'() {
				const target = {};
				const result = patch(target, [ ]);

				assert.deepEqual(result, {});
				assert.strictEqual(result, target);
			}
		},

		'array': {
			'same'() {
				const target = [ 1, 2, 3 ];
				const result = patch(target, [ ]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
				assert.deepEqual(result, target);
				assert.strictEqual(target, result);
			},

			'shorter'() {
				const target = [ 1, 2, 3, 4, 5 ];
				const result = patch(target, [
					{
						deleteCount: 2,
						start: 3,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
				assert.strictEqual(target, result);
			},

			'longer'() {
				const target = [ 1, 2, 3 ];
				const result = patch(target, [
					{
						add: [ 4, 5 ],
						deleteCount: 0,
						start: 3,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3, 4, 5 ]);
				assert.strictEqual(result, target);
			},

			'first element changed'() {
				const result = patch([ false, 2, 3 ], [
					{
						add: [ 1 ],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
			},

			'middle element changed'() {
				const result = patch([ 1, false, 3 ], [
					{
						add: [ 2 ],
						deleteCount: 1,
						start: 1,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
			},

			'last element changed' () {
				const result = patch([ 1, 2, false ], [
					{
						add: [ 3 ],
						deleteCount: 1,
						start: 2,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
			},

			'tail changed plus shorter'() {
				const result = patch([ 1, 2, false, 4, 5 ], [
					{
						add: [ 3 ],
						deleteCount: 3,
						start: 2,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
			},

			'tail changed plug longer'() {
				const result = patch([ 1, 2, false ], [
					{
						add: [ 3, 4, 5 ],
						deleteCount: 1,
						start: 2,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3, 4, 5 ]);
			},

			'multiple changes'() {
				const result = patch([ 1, false, 3, 4, false, 6, 7 ], [
					{
						add: [ 2 ],
						deleteCount: 1,
						start: 1,
						type: 'splice'
					}, {
						add: [ 5 ],
						deleteCount: 3,
						start: 4,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3, 4, 5 ]);
			},

			'primative values array'() {
				const result = patch([], [
					{
						add: [ '', 0, false, undefined, null ],
						deleteCount: 0,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ '', 0, false, undefined, null ]);
			},

			'array of arrays'() {
				const result = patch([ [ 1, false, 3], [ 'bar', 'baz' ] ], [
					{
						add: [
							[
								{
									add: [ 2 ],
									deleteCount: 1,
									start: 1,
									type: 'splice'
								}
							], [
								{
									add: [ 'foo', 'bar', 'baz' ],
									deleteCount: 2,
									start: 0,
									type: 'splice'
								}
							], [
								{
									add: [ true, false ],
									deleteCount: 0,
									start: 0,
									type: 'splice'
								}
							]
						],
						deleteCount: 2,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ [ 1, 2, 3 ], [ 'foo', 'bar', 'baz' ], [ true, false ] ]);
			}
		},

		'mixed object/arrays': {
			'object with array'() {
				const target = {
					foo: [ 1, false, 3 ]
				};

				const result = patch(target, [
					{
						descriptor: { configurable: true, enumerable: true, value: target.foo, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								add: [ 2 ],
								deleteCount: 1,
								start: 1,
								type: 'splice'
							}
						]
					}
				]);

				assert.deepEqual(result, {
					foo: [ 1, 2, 3 ]
				});
				assert.strictEqual(target, result);
				assert.strictEqual(target.foo, result.foo);
			},

			'array with objects'() {
				const target = [ { bar: 1 }, { foo: 'baz' }, { baz: 1 }, { }, { qux: null } ];

				const result = patch(target, [
					{
						add: [
							[
								{
									descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
									name: 'foo',
									type: 'update'
								}
							], [
								{
									descriptor: { configurable: true, enumerable: true, value: false, writable: true },
									name: 'qat',
									type: 'add'
								}
							], [
								{
									descriptor: { configurable: true, enumerable: true, value: null, writable: true },
									name: 'qux',
									type: 'add'
								}
							], [
								{
									name: 'qux',
									type: 'delete'
								}
							]
						],
						deleteCount: 4,
						start: 1,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ { bar: 1 }, { foo: 'bar' }, { baz: 1, qat: false }, { qux: null }, { } ]);
				assert.strictEqual(target, result);
				target.forEach((item, index) => {
					assert.strictEqual(item, result[index]);
				});
			},

			'object array value to object value'() {
				const result = patch({
					foo: { bar: 1 }
				}, [
					{
						descriptor: { configurable: true, enumerable: true, value: [ ], writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								add: [ 1, 2, 3 ],
								deleteCount: 0,
								start: 0,
								type: 'splice'
							}
						]
					}
				]);

				assert.deepEqual(result, {
					foo: [ 1, 2, 3 ]
				});
			},

			'object object value to array value'() {
				const result = patch({
					foo: [ 1, 2, 3 ]
				}, [
					{
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								descriptor: { configurable: true, enumerable: true, value: 1, writable: true },
								name: 'bar',
								type: 'add'
							}
						]
					}
				]);

				assert.deepEqual(result, {
					foo: { bar: 1 }
				});
			},

			'array array value to object value'() {
				const result = patch([ {
					foo: 1
				} ], [
					{
						add: [
							[
								{
									add: [ 1, 2, 3 ],
									deleteCount: 0,
									start: 0,
									type: 'splice'
								}
							]
						],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ [ 1, 2, 3 ] ]);
			},

			'array object value to array value'() {
				const result = patch([ [ 1, 2, 3 ] ], [
					{
						add: [
							[
								{
									descriptor: { configurable: true, enumerable: true, value: 1, writable: true },
									name: 'foo',
									type: 'add'
								}
							]
						],
						deleteCount: 1,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ {
					foo: 1
				} ]);
			},

			'array to object'() {
				const result = patch({
					foo: 'bar'
				}, [
					{
						add: [ 1, 2, 3 ],
						deleteCount: 0,
						start: 0,
						type: 'splice'
					}
				]);

				assert.deepEqual(result, [ 1, 2, 3 ]);
			},

			'object to array'() {
				const result = patch([ 1, 2, 3 ], [
					{
						descriptor: { configurable: true, enumerable: true, value: 'bar', writable: true },
						name: 'foo',
						type: 'add'
					}
				]);

				assert.deepEqual(result, {
					foo: 'bar'
				});
			}
		},

		'plain object with construct records': {
			'basic property construct'() {
				const result = patch({}, [
					{ args: [ 'foo' ], Ctor: RegExp, name: 'foo' }
				]);

				assert.instanceOf(result.foo, RegExp, 'should be a regular expression');
				assert.strictEqual(result.foo.toString(), '/foo/', 'should have a pattern of foo');
			},

			'property construct with descriptor'() {
				const result = patch({}, [
					{ args: [ 'foo' ], Ctor: RegExp, name: 'foo', descriptor: { writable: false, enumerable: false, configurable: false } },
					{ args: [ 'foo' ], Ctor: RegExp, name: 'bar' }
				]);

				const descriptorFoo = Object.getOwnPropertyDescriptor(result, 'foo');
				const descriptorBar = Object.getOwnPropertyDescriptor(result, 'bar');
				assert.isFalse(descriptorFoo.writable);
				assert.isFalse(descriptorFoo.enumerable);
				assert.isFalse(descriptorFoo.configurable);
				assert.instanceOf(descriptorFoo.value, RegExp);
				assert.isTrue(descriptorBar.writable);
				assert.isTrue(descriptorBar.enumerable);
				assert.isTrue(descriptorBar.configurable);
				assert.instanceOf(descriptorBar.value, RegExp);
			},

			'with property records'() {
				class Foo {
					foo: number;
					bar: string;
				}

				const result = patch({}, [
					{ Ctor: Foo, name: 'foo', propertyRecords:
						[
							{
								descriptor: { configurable: true, enumerable: true, value: 1, writable: true },
								name: 'foo',
								type: 'add'
							}, {
								descriptor: { configurable: true, enumerable: true, value: 'baz', writable: true },
								name: 'bar',
								type: 'add'
							}
						]
					}
				]);

				assert.instanceOf(result.foo, Foo, 'should be instance of Foo');
				assert.strictEqual(result.foo.foo, 1, 'should have set property value');
				assert.strictEqual(result.foo.bar, 'baz', 'should have set property value');
			},

			'with construct property records'() {
				class Foo {
					foo?: Foo;
				}

				const result = patch({}, [
					{ Ctor: Foo, name: 'foo', propertyRecords: [
							{
								Ctor: Foo,
								name: 'foo'
							}
						]
					}
				]);

				assert.instanceOf(result.foo, Foo);
				assert.instanceOf(result.foo.foo, Foo);
			},

			'plain object has complex property'() {
				const result = patch({
					foo: []
				}, [
					{
						descriptor: { configurable: true, enumerable: true, value: { }, writable: true },
						name: 'foo',
						type: 'update',
						valueRecords: [
							{
								args: [ 'foo' ],
								Ctor: RegExp,
								name: 'bar'
							}
						]
					}
				]);

				assert.instanceOf(result.foo.bar, RegExp);
				assert.strictEqual(result.foo.bar.toString(), '/foo/');
			}
		},

		'negative tests'() {
			assert.throws(() => {
				patch(/foo/, [ ]);
			}, TypeError, 'A target for a patch must be either an array or a plain object.');

			class Foo {
				bar: 'bar';
			}

			assert.throws(() => {
				patch(new Foo(), [ ]);
			}, TypeError, 'A target for a patch must be either an array or a plain object.');

			const foo = {};
			Object.freeze(foo);

			assert.throws(() => {
				patch(foo, []);
			}, TypeError, 'Cannot patch sealed or frozen objects.');

			const bar = {};
			Object.seal(bar);

			assert.throws(() => {
				patch(bar, []);
			}, TypeError, 'Cannot patch sealed or frozen objects.');
		}
	}
});
