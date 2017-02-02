import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import { Require } from '@dojo/interfaces/loader';
import pollUntil = require('leadfoot/helpers/pollUntil');

declare const require: Require;

function executeTest(suite: Suite, htmlTestPath: string, testFn: (result: any) => void, timeout = 10000): Command<any> {
	return suite.remote
		.get(require.toUrl(htmlTestPath))
		.then(pollUntil<any>(function() {
			return (<any> window).loaderTestResults;
		}, undefined, timeout), undefined)
		.then(testFn, function() {
			throw new Error('loaderTestResult was not set.');
		});
}

const text = 'abc';

registerSuite({
	name: 'text plugin',

	'correct text'(this: any) {
		return executeTest(this, './textPlugin.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips XML'(this: any) {
		return executeTest(this, './textPluginXML.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips HTML'(this: any) {
		return executeTest(this, './textPluginHTML.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips empty file'(this: any) {
		return executeTest(this, './textPluginEmpty.html', function(results: any) {
			assert.strictEqual(results.text, '');
		});
	}
});
