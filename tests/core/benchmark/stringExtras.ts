import Benchmark = require('benchmark');

let benchmarks: any[] = [];

benchmarks.forEach(function(benchmark: any): void {
	new Benchmark(benchmark.name, benchmark.fn, {
		onComplete: function(this: any) {
			console.log(this.name + ': ' + this.hz + ' with a margin of error of ' + this.stats.moe);
		}
	}).run();
});
