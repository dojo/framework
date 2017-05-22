import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

let skip: boolean;

registerSuite({
	name: 'registerCustomElement',
	beforeEach(this: any) {
		const { browserName, browser, version } = this.remote.session.capabilities;
		skip = false;
		if ((browser === 'iPhone' && version === '9.1') || (browserName === 'safari' && version === '9.1.3')) {
			skip = true;
		}
	},
	'custom elements are registered'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findById('testButton');
	},
	'custom element initial properties are set correctly'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findById('testButton')
			.then((element: any) => {
				return element.getVisibleText();
			})
			.then((text: string) => {
				assert.strictEqual(text, 'hello world');
			});
	},
	'custom element event handlers are registered'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('#testButton > button')
			.click()
			.end()
			.execute('return window.buttonClicked')
			.then((buttonClicked: boolean) => {
				assert.isTrue(buttonClicked);
			});
	},
	'updates the correct instance when multiple or the same custom elements are used'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findById('testButton-2')
			.then((element: any) => {
				return element.getVisibleText();
			})
			.then((text: string) => {
				assert.strictEqual(text, 'Worlds hello');
			});
	},
	'setting custom element attribute updates properties'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findById('testButton')
			.end()
			.execute('document.querySelector("test-button").setAttribute("label", "greetings")')
			.then(pollUntil<any>(function () {
				return (<any> document).querySelector('test-button > button').innerHTML === 'greetings world';
			}, undefined, 1000), undefined);
	},
	'setting custom element properties updates widget'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('no-attributes > button')
			.end()
			.execute('document.querySelector("no-attributes").buttonLabel = "greetings"')
			.then(pollUntil<any>(function () {
				return (<any> document).querySelector('no-attributes > button').innerHTML === 'greetings';
			}, undefined, 1000), undefined);
	},
	'creating elements manually works'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('#manualButton > button')
			.end()
			.then(pollUntil<any>(function () {
				return (<any> document).querySelector('#manualButton > button').innerHTML === 'manual';
			}, undefined, 1000), undefined);
	},
	'elements readded to the DOM are only initialized once'(this: any) {
		if (skip) {
			this.skip('not compatible with iOS 9.1 or Safari 9.1');
		}
		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('#reinitButton > button')
			.end()
			.then(pollUntil<any>(function () {
				return (<any> document).querySelector('#reinitButton > button').innerHTML === 'test';
			}, undefined, 1000), undefined);
	}
});
