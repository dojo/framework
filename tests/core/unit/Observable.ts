const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Observable from '../../src/Observable';

function asyncRange(start: number, end: number) {
	return new Observable((observer) => {
		let i = start;

		function handler() {
			observer.next(i++);
			if (i > end) {
				observer.complete();
			} else {
				setTimeout(handler, 0);
			}
		}

		setTimeout(handler, 0);
	});
}

registerSuite('Observable', {
	toPromise: {
		'resolution with single'() {
			return Observable.of(42)
				.toPromise()
				.then((value: number) => {
					assert.strictEqual(value, 42);
				});
		},
		'resolution with multiple'() {
			return Observable.from([1, 2, 3])
				.toPromise()
				.then((value: number) => {
					assert.strictEqual(value, 1);
				});
		},
		reject(this: any) {
			let dfd = this.async();

			new Observable(() => {
				throw new Error('error');
			})
				.toPromise()
				.then(
					dfd.rejectOnError(() => {
						assert.fail('should not have succeeded');
					}),
					dfd.callback((error: Error) => {
						assert.strictEqual(error.message, 'error');
					})
				);
		}
	},
	map: {
		'transforms values'() {
			let values: any[] = [],
				returns: any[] = [];

			new Observable<number>((observer) => {
				returns.push(observer.next(1));
				returns.push(observer.next(2));
				observer.complete();
			})
				.map((x) => x * 2)
				.subscribe({
					next(v) {
						values.push(v);
						return -v;
					}
				});

			assert.deepEqual(values, [2, 4], 'Mapped values are sent to the observer');
			assert.deepEqual(returns, [-2, -4], 'Return values from the observer are returned to the caller');
		},
		'errors during callback get sent to the observer'() {
			let error = new Error(),
				thrown = null,
				returned = null,
				token = {};

			new Observable<number>((observer) => {
				returned = observer.next(1);
			})
				.map(() => {
					throw error;
				})
				.subscribe({
					error(e) {
						thrown = e;
						return token;
					}
				});

			assert.equal(thrown, error, 'Exceptions from callback are sent to the observer');
			assert.equal(returned, token, 'The result of calling error is returned to the caller');
		},
		'errors are sent to the observer'() {
			let error = new Error(),
				thrown = null,
				returned = null,
				token = {};

			new Observable((observer) => {
				returned = observer.error(error);
			})
				.map((x) => x)
				.subscribe({
					error(e) {
						thrown = e;
						return token;
					}
				});

			assert.equal(thrown, error, 'Error values are forwarded');
			assert.equal(returned, token, 'The return value of the error method is returned to the caller');
		},
		'invalid argument errors'() {
			const observable = new Observable(() => {});

			assert.throws(() => observable.map(<any>undefined), TypeError);
			assert.throws(() => observable.map(<any>null), TypeError);
			assert.throws(() => observable.map(<any>{}), TypeError);
			assert.throws(() => observable.map(<any>42), TypeError);
		},
		'complete is forwarded to the observer'() {
			let arg = {},
				passed = null;

			new Observable((observer) => {
				observer.complete(arg);
			})
				.map((x) => x)
				.subscribe({
					complete(v) {
						passed = v;
					}
				});

			assert.equal(passed, arg, 'Complete values are forwarded');
		}
	},

	filter: {
		'allowed argument'() {
			let observable = new Observable(() => undefined);

			assert.throws(() => observable.filter(<any>undefined), TypeError);
			assert.throws(() => observable.filter(<any>null), TypeError);
			assert.throws(() => observable.filter(<any>{}), TypeError);
		},
		'even numbers'() {
			const source = Observable.of(1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10).filter((x) => {
				return x % 2 ? false : true;
			});

			let values: any[] = [];
			let finished = false;

			source.subscribe({
				next(value: number) {
					values.push(value);
				},
				complete() {
					finished = true;
				}
			});

			assert.isTrue(finished);
			assert.deepEqual(values, [2, 4, 6, 8, 10]);
		},

		'errors thrown from callback are returned to observer'() {
			let error = new Error(),
				thrown = null,
				returned = null,
				token = {};

			new Observable((observer) => {
				returned = observer.next(1);
			})
				.filter((x) => {
					throw error;
				})
				.subscribe({
					error(e) {
						thrown = e;
						return token;
					}
				});

			assert.equal(thrown, error, 'The result of calling error is returned to the caller');
			assert.equal(returned, token);
		},

		'errors propagate'() {
			let error = new Error(),
				thrown = null,
				returned = null,
				token = {};

			new Observable((observer) => {
				returned = observer.error(error);
			})
				.filter((x) => true)
				.subscribe({
					error(e) {
						thrown = e;
						return token;
					}
				});

			assert.equal(thrown, error, 'Error values are forwarded');
			assert.equal(returned, token, 'The return value of the error method is returned to the caller');
		},

		'complete is called on the observer'() {
			let arg = {},
				passed = null,
				token = {};

			new Observable((observer) => {
				observer.complete(arg);
			})
				.filter((x) => true)
				.subscribe({
					complete(v) {
						passed = v;
						return token;
					}
				});

			assert.equal(passed, arg, 'Complete values are forwarded');
		}
	},
	defer: {
		'execution is deferred until subscribe'() {
			let called = false;
			let values: number[] = [];

			const source = Observable.defer(() => {
				return new Observable<number>((observer) => {
					called = true;

					observer.next(1);
					observer.next(2);
				});
			});

			assert.isFalse(called);

			source.subscribe({
				next(value) {
					values.push(value);
				}
			});

			assert.isTrue(called);
			assert.deepEqual(values, [1, 2]);
		},

		'errors thrown during factory call are sent to subscriber'() {
			let error: any = undefined;

			const source = Observable.defer(() => {
				throw new Error('error');
			});

			source.subscribe({
				error(e) {
					error = e;
				}
			});

			assert.equal(error.message, 'error');
		},

		'errors created in factory observable get propagated to the observer'() {
			const source = Observable.defer(() => {
				return new Observable((observer) => {
					observer.error(new Error('error'));
				});
			});

			source.subscribe({
				error(error) {
					assert.equal(error.message, 'error');
				}
			});
		}
	},

	toArray: {
		'complete list'() {
			let called = false;

			Observable.from([1, 2, 3])
				.toArray()
				.subscribe((values) => {
					called = true;
					assert.deepEqual(values, [1, 2, 3]);
				});

			assert.isTrue(called);
		},
		'errors thrown during subscription are sent to observer'() {
			new Observable(() => {
				throw new Error('test');
			})
				.toArray()
				.subscribe(
					() => {
						assert.fail('should not have succeeded');
					},
					(error) => {
						assert.equal(error.message, 'test');
					}
				);
		},
		'errors called are sent to observer'() {
			new Observable((observer) => {
				observer.error(new Error('test'));
			})
				.toArray()
				.subscribe(
					() => {
						assert.fail('should not have succeeded');
					},
					(error) => {
						assert.equal(error.message, 'test');
					}
				);
		},
		'complete calls are sent to observer'() {
			let completeValue = 0;

			new Observable((observer) => {
				observer.complete(4);
			})
				.toArray()
				.subscribe({
					complete(value) {
						completeValue = value;
					}
				});

			assert.equal(completeValue, 4);
		}
	},

	mergeAll: {
		'synchronous concat'() {
			let values: any[] = [];

			const source = Observable.of(
				Observable.defer(() => Observable.of(1, 2, 3)),
				Observable.defer(() => Observable.of(4, 5, 6))
			);

			source.mergeAll(1).subscribe({
				next(value) {
					values.push(value);
				}
			});

			assert.deepEqual(values, [1, 2, 3, 4, 5, 6]);
		},

		'asynchronous concat'(this: any) {
			const dfd = this.async();
			let values: any[] = [];

			const source = Observable.of(
				Observable.defer(() => asyncRange(1, 2)),
				Observable.defer(() => asyncRange(3, 4))
			);

			source.mergeAll(1).subscribe({
				next(value) {
					values.push(value);
				},
				complete: dfd.callback(() => {
					assert.deepEqual(values, [1, 2, 3, 4]);
				})
			});
		},

		'non observable values'() {
			let values: any[] = [];

			Observable.of(1, 2, 3)
				.mergeAll(1)
				.subscribe((value) => {
					values.push(value);
				});

			assert.deepEqual(values, [1, 2, 3]);
		},

		concurrency(this: any) {
			const dfd = this.async();
			let values: any[] = [];

			let observables: Observable<any>[] = [];

			observables.push(Observable.defer(() => asyncRange(1, 2)));
			observables.push(Observable.defer(() => asyncRange(3, 4)));
			observables.push(Observable.defer(() => asyncRange(5, 6)));
			observables.push(Observable.defer(() => asyncRange(7, 8)));
			observables.push(Observable.defer(() => asyncRange(9, 10)));
			observables.push(Observable.defer(() => asyncRange(11, 12)));

			const source = Observable.from(observables);

			source.mergeAll(2).subscribe({
				next(value) {
					values.push(value);
				},
				complete: dfd.callback(() => {
					assert.sameMembers(values, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
				})
			});
		},

		'underused concurrency'(this: any) {
			const dfd = this.async();
			let values: any[] = [];

			const source = Observable.of(Observable.defer(() => asyncRange(1, 2)));

			source.mergeAll(2).subscribe({
				next(value) {
					values.push(value);
				},
				complete: dfd.callback(() => {
					assert.deepEqual(values, [1, 2]);
				})
			});
		},

		'thrown errors during merge call observer'() {
			Observable.of(
				new Observable(() => {
					throw new Error('error');
				})
			).subscribe({
				error(error) {
					assert.equal(error.message, 'error');
				}
			});
		},

		'called errors during merge call observer'() {
			Observable.of(
				new Observable((observer) => {
					observer.error(new Error('error'));
				})
			).subscribe({
				error(error) {
					assert.equal(error.message, 'error');
				}
			});
		}
	}
});
