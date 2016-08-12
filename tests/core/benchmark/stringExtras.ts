import Benchmark = require('benchmark');
import { padEnd, padStart } from '../../src/stringExtras';

const text = 'Lorem';
const count = 10;
const character = ' ';

let benchmarks: any[] = [];

benchmarks.push({
	name: 'stringUtil.padStart',
	fn: function () {
		padStart(text, count, character);
	}
});

benchmarks.push({
	name: 'stringUtil.padEnd',
	fn: function () {
		padEnd(text, count, character);
	}
});

benchmarks.forEach(function (benchmark: any): void {
	new Benchmark(benchmark.name, benchmark.fn, {
		onComplete: function (this: any) {
			console.log(this.name + ': ' + this.hz + ' with a margin of error of ' + this.stats.moe);
		}
	}).run();
});
