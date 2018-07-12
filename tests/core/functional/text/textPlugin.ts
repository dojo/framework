const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Test from 'intern/lib/Test';
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

async function executeTest(test: Test, htmlTestPath: string, timeout = 10000) {
	try {
		return await test.remote.get(htmlTestPath).then(
			pollUntil<{ text: string }>(
				function() {
					return (<any>window).loaderTestResults || null;
				},
				undefined,
				timeout
			)
		);
	} catch (e) {
		throw new Error('loaderTestResult was not set.');
	}
}

const text = 'abc';

registerSuite('text plugin', {
	async 'correct text'() {
		const results = await executeTest(this, `${__dirname}/textPlugin.html`);
		assert.strictEqual(results.text, text);
	},

	async 'strips XML'(this: any) {
		const results = await executeTest(this, `${__dirname}/textPluginXML.html`);
		assert.strictEqual(results.text, text);
	},

	async 'strips HTML'(this: any) {
		const results = await executeTest(this, `${__dirname}/textPluginHTML.html`);
		assert.strictEqual(results.text, text);
	},

	async 'strips empty file'(this: any) {
		const results = await executeTest(this, `${__dirname}/textPluginEmpty.html`);
		assert.strictEqual(results.text, '');
	}
});
