/// <reference path="intern/intern.d.ts" />

declare module 'intern/dojo/Promise' {
	import Promise = require('dojo/Promise');
	export = Promise;
}

declare module 'intern/lib/util' {
	export function getErrorMessage(error: any): string;
}

declare module 'intern/lib/reporters/Runner' {
	import charm = require('charm');
	class Runner {
		protected charm: charm.Charm;
		protected hasErrors: boolean;
		protected sessions: any;

		constructor(config?: any);
	}
	export = Runner;
}

declare module 'istanbul/lib/collector' {
	class Collector {
		add(coverage: any): void;
		files(): string[];
	}

	export = Collector;
}

declare module 'istanbul/lib/report/json' {
	import Collector = require('istanbul/lib/collector');
	class JsonReporter {
		constructor(options: any);

		writeReport(collector: Collector, sync: boolean): void;
	}
	export = JsonReporter;
}

declare module 'istanbul/lib/instrumenter' {
	class Instrumenter {
		constructor(options?: any);

		instrumentSync(code: string, path: string): string;
		lastFileCoverage(): any;
	}
	export = Instrumenter;
}

declare module 'istanbul/index' {
	let result: any;
	export = result;
}

declare module 'glob' {
	const glob: {
		(pattern: string, callback: (err: Error, matches: string[]) => void): void;
		(pattern: string, options: any, callback: (err: Error, matches: string[]) => void): void;

		sync(pattern: string, options?: any): string[];
	};
	export = glob;
}

declare module 'charm' {
	import { Stream } from 'stream';

	const charm: {
		(): charm.Charm;
	};
	module charm {
		export interface Charm extends Stream {
			reset(): Charm;
			destroy(): void;
			end(): void;
			write(buf: string): Charm;
			display(attr: string): Charm;
			foreground(color: string|number): Charm;
			background(color: string|number): Charm;
		}
	}
	export = charm;
}
