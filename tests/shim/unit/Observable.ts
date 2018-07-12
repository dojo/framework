import Observable, { Subscription } from '../../src/Observable';
import Map from '../../src/Map';
import '../../src/Symbol';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

class MoreObservable extends Observable<any> {}

registerSuite('Observable', {
	subscribe: {
		observer() {
			let source = Observable.of(1, 2, 3);
			let startCalled = false;
			let nextCalled = false;
			let completeCalled = false;

			source.subscribe({
				start: () => {
					startCalled = true;
				},
				next: () => {
					nextCalled = true;
				},
				complete: () => {
					completeCalled = true;
				}
			});

			assert.isTrue(startCalled);
			assert.isTrue(nextCalled);
			assert.isTrue(completeCalled);
		},
		functions() {
			let source = Observable.of(1, 2, 3);
			let nextCalled = false;
			let completeCalled = false;

			source.subscribe(
				() => {
					nextCalled = true;
				},
				undefined,
				() => {
					completeCalled = true;
				}
			);

			assert.isTrue(nextCalled);
			assert.isTrue(completeCalled);
		},
		'invalid observer'() {
			let source = Observable.of(1, 2);

			assert.throws(() => {
				source.subscribe(<any>undefined);
			});

			assert.throws(() => {
				source.subscribe(<any>'test');
			});
		}
	},

	creation: {
		constructor: {
			constructor() {
				let source = new Observable((observer) => {
					observer.next(1);
				});

				source.subscribe((value: any) => {
					assert.strictEqual(value, 1);
				});
			},
			'errors for bad subscriber function'() {
				assert.throws(() => {
					new Observable(<any>undefined);
				});

				assert.throws(() => {
					new Observable(<any>'test');
				});
			},
			'thrown error during subscription'() {
				const source = new Observable((observer) => {
					observer.next(1);
					throw new Error('error');
				});

				let values: any[] = [];

				source.subscribe(
					(value: any) => {
						values.push(value);
					},
					(error: Error) => {
						assert.deepEqual(values, [1]);
						assert.strictEqual(error.message, 'error');
					},
					() => {
						assert.fail('Should not have completed');
					}
				);
			},
			'manual error during subscription w/ error handler'() {
				const source = new Observable((observer) => {
					observer.error(new Error('error'));
				});

				source.subscribe(
					() => {
						assert.fail('should not have called next');
					},
					(error: Error) => {
						assert.strictEqual(error.message, 'error');
					},
					() => {
						assert.fail('Should not have completed');
					}
				);
			},
			'manual error during subscription w/ completion handler'() {
				const source = new Observable((observer) => {
					observer.error(new Error('error'));
				});

				source.subscribe(
					() => {
						assert.fail('should not have called next');
					},
					undefined,
					(error: any) => {
						assert.strictEqual(error.message, 'error');
					}
				);
			},
			'subscriber return value is an unsubscribe method'() {
				let cleanUp = false;

				new Observable((observer) => {
					observer.complete();

					return {
						unsubscribe: () => {
							cleanUp = true;
						}
					};
				}).subscribe({});

				assert.isTrue(cleanUp);
			},
			'subscriber can return undefined'() {
				new Observable((observer) => {
					observer.complete();

					return;
				}).subscribe({});
			},
			'subscriber can return null'() {
				new Observable((observer) => {
					observer.complete();

					return <any>null;
				}).subscribe({});
			},
			'subscriber cannot return a number/string/boolean'() {
				assert.throws(() => {
					new Observable((observer) => {
						observer.complete();

						return <any>1;
					}).subscribe({});
				});

				assert.throws(() => {
					new Observable((observer) => {
						observer.complete();

						return <any>'test';
					}).subscribe({});
				});

				assert.throws(() => {
					new Observable((observer) => {
						observer.complete();

						return <any>false;
					}).subscribe({});
				});
			}
		},
		of: {
			'multiple values'() {
				let source = Observable.of(1, 2, 3, 4);
				let allValues: any[] = [];
				let completeCalled = false;

				let subscription = source.subscribe(
					(value: any) => {
						allValues.push(value);
					},
					undefined,
					() => {
						completeCalled = true;
					}
				);

				assert.deepEqual(allValues, [1, 2, 3, 4]);
				assert.isTrue(subscription.closed);
				assert.isTrue(completeCalled);
			},

			'single value'() {
				let source = Observable.of('test');
				let allValues: any[] = [];
				let completeCalled = false;

				let subscription = source.subscribe(
					(value: any) => {
						allValues.push(value);
					},
					undefined,
					() => {
						completeCalled = true;
					}
				);

				assert.deepEqual(allValues, ['test']);
				assert.isTrue(subscription.closed);
				assert.isTrue(completeCalled);
			},

			'invalid this value'() {
				const source = Observable.of.call({}, 1);
				let allValues: any[] = [];

				source.subscribe((value: any) => {
					allValues.push(value);
				});

				assert.deepEqual(allValues, [1]);
			}
		},

		from: {
			array() {
				let source = Observable.from([1, 2, 3]);
				let expectedValues = [1, 2, 3];
				let i = 0;
				let completeCalled = false;

				let subscription = source.subscribe(
					(value: any) => {
						assert.strictEqual(value, expectedValues[i++]);
					},
					undefined,
					() => {
						completeCalled = true;
					}
				);

				assert.equal(i, 3);
				assert.isTrue(subscription.closed);
				assert.isTrue(completeCalled);
			},
			iterable() {
				let map = new Map([[1, 'one'], [2, 'two']]);

				let source = Observable.from(map.keys());
				let values: any[] = [];
				let completeCalled = false;

				let subscription = source.subscribe(
					(value: any) => {
						values.push(value);
					},
					undefined,
					() => {
						completeCalled = true;
					}
				);

				assert.deepEqual(values, [1, 2]);
				assert.isTrue(subscription.closed);
				assert.isTrue(completeCalled);
			},
			'invalid value'() {
				assert.throws(() => {
					Observable.from(<any>null);
				});

				assert.throws(() => {
					Observable.from(<any>undefined);
				});

				assert.throws(() => {
					Observable.from(<any>5);
				});
			},
			'invalid this value'() {
				let values: number[] = [];

				Observable.from.call({}, [1]).subscribe({
					next: (value: number) => {
						values.push(value);
					}
				});

				assert.deepEqual(values, [1]);
			},
			'observable value': {
				'another Observable'() {
					let o = new Observable(() => {});

					assert.isTrue(Observable.from(o) === o);
				},
				'subclass observable'() {
					let o = new MoreObservable(() => {});

					assert.isTrue(Observable.from(o) === o);
				},
				'observable with object return value'() {
					let called = false;

					let source = Observable.from({
						[Symbol.observable]() {
							return {
								subscribe() {
									called = true;
								}
							};
						}
					});

					assert.isFalse(called);

					source.subscribe({});

					assert.isTrue(called);
				},
				'observable with object return value but no subscribe'() {
					let obj = {};
					let value: any;

					let source = Observable.from({
						[Symbol.observable]() {
							return obj;
						}
					});

					source.subscribe((v: any) => {
						value = v;
					});

					assert.equal(value, obj);
				},
				'observable with object return value but no subscribe not on this context'() {
					let obj = {};
					let value: any;

					let source = Observable.from.call(function() {}, {
						[Symbol.observable]() {
							return obj;
						}
					});

					source.subscribe((v: any) => {
						value = v;
					});

					assert.equal(value, obj);
				},
				'invalid observable'() {
					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: 42
						});
					});

					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: () => {
								return 42;
							}
						});
					});

					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: () => {
								return 'test';
							}
						});
					});

					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: () => {
								return false;
							}
						});
					});

					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: () => {
								return null;
							}
						});
					});

					assert.throws(() => {
						Observable.from(<any>{
							[Symbol.observable]: () => {
								return;
							}
						});
					});
				}
			}
		},
		unsubscribe: {
			'closed reflects state'() {
				new Observable((observer) => {
					assert.isFalse(observer.closed);
					observer.complete();
					assert.isTrue(observer.closed);
				}).subscribe({});
			},

			'unsubscribe handler is only called once'() {
				let called = 0;

				const source = new Observable((observer) => {
					observer.complete();

					return () => {
						called++;
					};
				});

				const subscription = source.subscribe({});

				subscription.unsubscribe();

				assert.strictEqual(called, 1);
			},

			'with unsubscribe handler'() {
				let unsubscribed = false;
				let observer: any;
				const source = new Observable((o) => {
					observer = o;

					return () => {
						unsubscribed = true;
					};
				});

				let values: any[] = [];

				const subscription = source.subscribe((value: any) => {
					values.push(value);

					if (value === 1) {
						subscription.unsubscribe();
					}
				});

				observer.next(0);
				observer.next(1);
				observer.next(2);

				assert.deepEqual(values, [0, 1]);
				assert.isTrue(unsubscribed);
			},
			'without unsubscribe handler'() {
				let observer: any;

				const source = new Observable((o) => {
					observer = o;
				});

				let values: any[] = [];

				const subscription = source.subscribe((value: any) => {
					values.push(value);

					if (value === 1) {
						subscription.unsubscribe();
					}
				});

				observer.next(0);
				observer.next(1);
				observer.next(2);

				assert.deepEqual(values, [0, 1]);
			}
		}
	},
	'observer.next': {
		next: {
			normal() {
				const source = new Observable((observer) => {
					observer.next(1);
					observer.next(2);
				});

				let values: any[] = [];

				source.subscribe(
					(value: any) => {
						values.push(value);
					},
					() => {
						assert.fail('Should not have errored');
					},
					() => {
						assert.fail('Should not have completed');
					}
				);

				assert.deepEqual(values, [1, 2]);
			},
			'invalid next observer'() {
				const source = new Observable((observer) => {
					observer.next(1);
				});

				assert.throws(() => {
					source.subscribe({
						next: <any>1
					});
				});

				assert.throws(() => {
					source.subscribe({
						next: <any>false
					});
				});

				assert.doesNotThrow(() => {
					source.subscribe({
						next: <any>null
					});
				});

				assert.doesNotThrow(() => {
					source.subscribe({
						next: undefined
					});
				});
			},

			closed() {
				const source = new Observable((observer) => {
					observer.next(1);
					observer.complete();
					observer.next(2);
				});

				let values: any[] = [];

				source.subscribe((value: any) => {
					values.push(value);
				});

				assert.deepEqual(values, [1]);
			},
			'thrown error in subscriber'() {
				const source = Observable.of(1, 2, 3);

				source.subscribe(
					() => {
						throw new Error('error');
					},
					(error: Error) => {
						assert.strictEqual(error.message, 'error');
					},
					() => {
						assert.fail('Should not have completed');
					}
				);
			}
		}
	},
	'observer.complete': {
		normal() {
			let called = false;

			new Observable((observer) => {
				observer.complete();
			}).subscribe({
				complete: () => {
					called = true;
				}
			});

			assert.isTrue(called);
		},
		'invalid complete handler'() {
			assert.throws(() => {
				new Observable((observer) => {
					observer.complete();
				}).subscribe({
					complete: <any>false
				});
			});

			assert.throws(() => {
				new Observable((observer) => {
					observer.complete();
				}).subscribe({
					complete: <any>'test'
				});
			});

			assert.throws(() => {
				new Observable((observer) => {
					observer.complete();
				}).subscribe({
					complete: <any>1
				});
			});
		},
		'error during complete'() {
			assert.throws(() => {
				new Observable((observer) => {
					observer.complete();
				}).subscribe({
					complete() {
						throw new Error();
					}
				});
			});
		},
		'error during clean up'() {
			// error during clean up during start up
			assert.throws(() => {
				new Observable((observer) => {
					observer.complete();

					return () => {
						throw new Error();
					};
				}).subscribe({});
			});

			// error during clean up, with no completion handler
			assert.throws(() => {
				let observer: any;

				new Observable((o) => {
					observer = o;
					return () => {
						throw new Error();
					};
				}).subscribe({});

				observer.complete();
			});

			// error during clean up, with a completion handler
			assert.throws(() => {
				let observer: any;

				new Observable((o) => {
					observer = o;
					return () => {
						throw new Error();
					};
				}).subscribe({
					complete: () => {}
				});

				observer.complete();
			});
		}
	},
	'observer.error': {
		'error during cleanup'() {
			// error during clean up during start up
			assert.throws(() => {
				new Observable((observer) => {
					observer.error(new Error('observer error'));

					return () => {
						throw new Error('completion error');
					};
				}).subscribe({});
			}, /observer error/);

			// error during clean up, after start up
			assert.throws(() => {
				let observer: any;

				new Observable((o) => {
					observer = o;

					return () => {
						throw new Error('completion error');
					};
				}).subscribe({});

				observer.error(new Error('observer error'));
			}, /observer error/);

			// error in clean up only
			let called = false;
			assert.throws(() => {
				let observer: any;

				new Observable((o) => {
					observer = o;

					return () => {
						throw new Error('completion error');
					};
				}).subscribe({
					error: () => {
						called = true;
					}
				});

				observer.error(new Error('observer error'));
			}, /completion error/);
			assert.isTrue(called);
		},

		'invalid error handler'() {
			assert.throws(() => {
				new Observable((observer) => {
					observer.error(new Error('observer error'));
				}).subscribe({
					error: <any>1
				});
			});

			assert.throws(() => {
				new Observable((observer) => {
					observer.error(new Error('observer error'));
				}).subscribe({
					error: <any>false
				});
			});

			assert.throws(() => {
				new Observable((observer) => {
					observer.error(new Error('observer error'));
				}).subscribe({
					error: <any>'test'
				});
			});
		}
	},
	'observer.start': {
		'calling unsubscribe from start doesnt fire the subscriber'() {
			let called = false;

			new Observable(() => {
				called = true;
			}).subscribe({
				start: (subscription: Subscription) => {
					subscription.unsubscribe();
				}
			});

			assert.isFalse(called);
		}
	}
});
