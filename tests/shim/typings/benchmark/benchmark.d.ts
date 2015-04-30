declare module 'benchmark' {
	class Benchmark {
		constructor(name: string, callback: () => any, options?: Benchmark.Options);
		aborted: boolean;
		compiled: (string | (() => void));
		count: number;
		cycles: number;
		error: {};
		fn: (string | (() => void));
		hz: number;
		running: boolean;
		setup: (string | (() => void));
		teardown: (string | (() => void));
		abort: () => Benchmark;
		clone: (options: Benchmark.Options) => Benchmark;
		compare: (compare: Benchmark) => number;
		emit: (type: string | Benchmark.Event) => any;
		listeners: (type: string) => any[];
		off: (type: string, listener: () => any) => Benchmark;
		on: (type: string, listener: () => any) => Benchmark;
		name: string;
		reset: () => Benchmark;
		run: (options?: Benchmark.Options) => Benchmark;
		stats: Benchmark.Stats;
		times: Benchmark.Times;
		toString: () => string;
	}

	module Benchmark {
		export interface Event {
			aborted: boolean;
			cancelled: boolean;
			currentTarget: any;
			result: any;
			target: any;
			timeStamp: number;
			type: string;
		}

		export interface Options {
			async?: boolean;
			defer?: boolean;
			delay?: number;
			id?: string;
			initCount?: number;
			maxTime?: number;
			minSamples?: number;
			minTime?: number;
			name?: string;
			onAbort?: () => void;
			onComplete?: () => void;
			onCycle?: () => void;
			onError?: () => void;
			onReset?: () => void;
			onStart?: () => void;
		}

		export interface Stats {
			deviation: number;
			mean: number;
			moe: number;
			rme: number;
			sample: number[];
			sem: number;
			variance: number;
		}

		export interface Times {
			cycle: number;
			elapsed: number;
			period: number;
			timeStamp: number;
		}

		export class Suite {
			constructor(name: string, options?: Options);
			aborted: boolean;
			length: number;
			running: boolean;
			abort: () => Suite;
			add: (name: string, callback: () => void, options?: Options) => Suite;
			clone: (options?: Options) => Suite;
			emit: (type: string | Event) => any;
			filter: (callback: string | ((benchmark: Benchmark, index: number, suite: Suite) => boolean)) => Suite;
			forEach: (callback: (benchmark: Benchmark, index: number, suite: Suite) => void) => void;
			indexOf: (value: any) => number;
			invoke: (name: string | Options, ...args: any[]) => any[];
			join: (separator: string) => string;
			listeners: (type: string) => any[];
			map: (callback: (benchmark: Benchmark, index: number, suite: Suite) => any) => any[];
			off: (type: string, listener: () => any) => Benchmark;
			on: (type: string, listener: () => any) => Benchmark;
			pluck: (property: string) => any[];
			pop: () => Benchmark;
			push: (benchmark: Benchmark) => number;
			reduce: (callback: (memo: any, benchmark: Benchmark, index: number, suite: Suite) => any) => any;
			reset: () => Suite;
			reverse: () => Benchmark[];
			run: (options?: Options) => Suite;
			shift: () => Benchmark;
			slice: (start: number, end: number) => Benchmark[];
			sort: (compare?: (left: Benchmark, right: Benchmark) => number) => Suite;
			splice: (start: number, deleteCount: number, ...insertValues: any[]) => any[];
			unshift: (...args: any[]) => number;
		}
	}

	export = Benchmark;
}
