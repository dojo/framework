/// <reference path="intern/intern.d.ts" />
/// <reference path="benchmark/benchmark.d.ts" />
/// <reference path="sinon/sinon.d.ts" />

declare module 'intern/dojo/Promise' {
	import Promise = require('dojo/Promise');
	export = Promise;
}
