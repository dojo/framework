import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import * as pollUntil from 'leadfoot/helpers/pollUntil';

function executeTest(suite: Suite, htmlTestPath: string, testFn: (result: any) => void, timeout = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(htmlTestPath))
		.then(pollUntil<any>(function() {
			return (<any> window).loaderTestResults;
		}, null, timeout), undefined)
		.then(testFn, function() {
			throw new Error('loaderTestResult was not set.');
		});
}

const text = 'abc';

registerSuite({
	name: 'text plugin',

	'correct text'() {
		return executeTest(this, './textPlugin.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips XML'() {
		return executeTest(this, './textPluginXML.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips HTML'() {
		return executeTest(this, './textPluginHTML.html', function(results: any) {
			assert.strictEqual(results.text, text);
		});
	},

	'strips empty file'() {
		return executeTest(this, './textPluginEmpty.html', function(results: any) {
			assert.strictEqual(results.text, '');
		});
	}
});
