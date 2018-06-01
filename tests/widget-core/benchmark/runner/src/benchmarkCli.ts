import { config } from './common';
import * as yargs from 'yargs';
import * as fs from 'fs';
import { runBench } from './benchmarkRunner';

let args = yargs(process.argv)
	.usage(
		'$0 [--framework Framework1,Framework2,...] [--benchmark Benchmark1,Benchmark2,...] [--count n] [--exitOnError]'
	)
	.help('help')
	.default('check', 'false')
	.default('exitOnError', 'false')
	.default('count', config.REPEAT_RUN)
	.boolean('headless')
	.array('framework')
	.array('benchmark').argv;

let runBenchmarks = args.benchmark && args.benchmark.length > 0 ? args.benchmark : [''];
let runFrameworks = args.framework && args.framework.length > 0 ? args.framework : [''];
let count = Number(args.count);

config.REPEAT_RUN = count;

let dir = args.check === 'true' ? 'results_check' : 'benchmark-results';
let exitOnError = args.exitOnError === 'true';

config.EXIT_ON_ERROR = exitOnError;

if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir);
}

if (args.help) {
	yargs.showHelp();
} else {
	runBench(runFrameworks, runBenchmarks, dir, count);
}
