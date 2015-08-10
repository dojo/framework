/// <reference path="intern/intern.d.ts" />
/// <reference path="benchmark/benchmark.d.ts" />
/// <reference path="sinon/sinon.d.ts" />
/// <reference path="formidable/formidable.d.ts" />
/// <reference path="http-proxy/http-proxy.d.ts" />
/// <reference path="services/echo.d.ts" />

declare module 'intern/dojo/Promise' {
	import Promise = require('dojo/Promise');
	export = Promise;
}
