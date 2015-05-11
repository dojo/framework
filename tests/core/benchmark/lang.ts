import Benchmark = require('benchmark');
import lang = require('../../src/lang');

let benchmarks: Benchmark[] = [];

function onComplete() {
	console.log(this.name + ': ' + this.hz + ' with a margin of error of ' + this.stats.moe);
}

benchmarks.push(new Benchmark('lang.copy (single source, all options false)',
	// The `setup` option cannot be used, as the TypeScript compiler does not know
	// that `setup`'s local variables are made available to the test function.
	(function () {
		const options = {
			sources: [ <any> { a: 1, b: 'Lorem ipsum', c: [], d: 4 } ]
		};

		return function () {
			lang.copy(options);
		};
	})(), {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.copy (single source, descriptors true)', (function () {
	const options = {
		descriptors: true,
		sources: [
			Object.create(Object.prototype, {
				a: {
					value: 1,
					enumerable: true,
					configurable: true,
					writable: true
				},
				b: {
					value: 'Lorem ipsum',
					enumerable: true,
					configurable: true,
					writable: true
				},
				c: {
					value: [],
					enumerable: true,
					configurable: true,
					writable: true
				},
				d: {
					value: 4,
					enumerable: true,
					configurable: true,
					writable: true
				}
			})
		]
	};

	return function () {
		lang.copy(options);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.copy (multiple sources, all options true)', (function () {
	const options = {
		assignPrototype: true,
		deep: true,
		descriptors: true,
		sources: [
			Object.create(Object.create(null, {
				x: {
					value: ('1234567890').split('')
				},
				y: {
					enumerable: true,
					value: /\s/
				}
			}), {
				a: {
					value: 1,
					enumerable: true,
					configurable: true,
					writable: true
				},
				b: {
					value: 'Lorem ipsum',
					enumerable: true,
					configurable: true,
					writable: true
				},
				c: {
					value: [],
					enumerable: true,
					configurable: true,
					writable: true
				},
				d: {
					value: 4,
					enumerable: true,
					configurable: true,
					writable: true
				}
			}),

			{
				b: 'Dolor sit amet.',
				c: [ 1, 2, 3 ],
				d: 5
			},

			(function () {
				function Answers(kwArgs: { [key: string]: any }) {
					Object.keys(kwArgs).forEach(function (key: string): void {
						(<any> this)[key] = kwArgs[key];
					}, this);
				}

				return new (<any> Answers)({
					universe: 42
				});
			})()
		]
	};

	return function () {
		lang.copy(options);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.create', (function () {
	let object = <any> { a: 1, b: 'Lorem ipsum', c: [], d: 4 };

	return function () {
		lang.create(object, object, object, object);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.duplicate', (function () {
	let object = <any> { a: 1, b: 'Lorem ipsum', c: [], d: 4 };

	return function () {
		lang.duplicate(object);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.getPropertyDescriptor', (function () {
	let prototype = <any> { a: 1, b: 'Lorem ipsum', c: [], d: 4 };
	let object = prototype;
	let i = 10;

	while (i > 0) {
		object = Object.create(object);
		--i;
	}

	Object.defineProperty(prototype, 'e', {
		value: 5,
		configurable: false,
		enumerable: true,
		writable: false
	});

	return function () {
		lang.getPropertyDescriptor(object, 'e');
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.isIdentical', (function () {
	let a = Number('asdfx{}');
	let b = Number('xkcd');

	return function () {
		lang.isIdentical(a, b);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.lateBind', (function () {
	let object: any = {
		method: function () {}
	};

	return function () {
		lang.lateBind(object, 'method');
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.lateBind (partial application)', (function () {
	let object: any = {
		method: function () {}
	};

	return function () {
		lang.lateBind(object, 'method', 1, 2, 3);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.push(new Benchmark('lang.partial', (function () {
	function f() {}

	return function () {
		lang.partial(f, 1, 2, 3);
	};
})(), {
	onComplete: onComplete
}));

benchmarks.forEach(function (benchmark: Benchmark): void {
	benchmark.run();
});
