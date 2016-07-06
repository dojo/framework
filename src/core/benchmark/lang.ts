import Benchmark = require('benchmark');
import lang = require('../../src/lang');

function onComplete() {
	console.log(this.name + ': ' + this.hz + ' with a margin of error of ' + this.stats.moe);
}

const simpleSource = { a: 1, b: 'Lorem ipsum', c: 4 };
const simpleSourceWithArray = {
		a: 1,
		b: 'Dolor sit amet.',
		c: [ 1, 2, 3 ],
		d: 5
	};
const sourceFromConstructor = (function () {
		function Answers(kwArgs: { [key: string]: any }) {
			Object.keys(kwArgs).forEach(function (key: string): void {
				(<any> this)[key] = kwArgs[key];
			}, this);
		}

		return new (<any> Answers)({
			universe: 42
		});
	})();
const sourceWithInherited = Object.create(Object.create(null, {
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
	});

let benchmarks: Benchmark[] = [];

benchmarks.push(new Benchmark('lang.assign (single source)', function () {
		lang.assign(Object.create(null), simpleSource);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.assign (multiple sources)', function () {
		lang.assign(
			Object.create(null),
			simpleSource,
			simpleSourceWithArray,
			sourceWithInherited,
			sourceFromConstructor
		);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.deepAssign (single source)', function () {
		lang.deepAssign(Object.create(null), simpleSource);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.deepAssign (multiple sources)', function () {
		lang.deepAssign(
			Object.create(null),
			simpleSource,
			simpleSourceWithArray,
			sourceWithInherited,
			sourceFromConstructor
		);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.mixin (single source)', function () {
		lang.mixin(Object.create(null), simpleSource);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.mixin (multiple sources)', function () {
		lang.mixin(
			Object.create(null),
			simpleSource,
			simpleSourceWithArray,
			sourceWithInherited,
			sourceFromConstructor
		);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.deepMixin (single source)', function () {
		lang.deepMixin(Object.create(null), simpleSource);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.deepMixin (multiple sources)', function () {
		lang.deepMixin(
			Object.create(null),
			simpleSource,
			simpleSourceWithArray,
			sourceWithInherited,
			sourceFromConstructor
		);
	}, {
		onComplete: onComplete
	}));

benchmarks.push(new Benchmark('lang.create', function () {
		lang.create(simpleSource, simpleSource, simpleSource, simpleSource);
	}, {
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
