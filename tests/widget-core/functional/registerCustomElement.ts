import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

registerSuite({
	name: 'registerCustomElement',

	'custom elements are registered'(this: any) {
		if (this.remote.session.capabilities.browser === 'iPhone' && this.remote.session.capabilities.version === '9.1') {
			this.skip('not compatible with iOS 9.1');
		}

		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('test-button > button');
	},
	'custom element initial properties are set correctly'(this: any) {
		if (this.remote.session.capabilities.browser === 'iPhone' && this.remote.session.capabilities.version === '9.1') {
			this.skip('not compatible with iOS 9.1');
		}

		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('test-button > button')
			.then((element: any) => {
				return element.getVisibleText();
			})
			.then((text: string) => {
				assert.strictEqual(text, 'hello world');
			});
	},
	'custom element event handlers are registered'(this: any) {
		if (this.remote.session.capabilities.browser === 'iPhone' && this.remote.session.capabilities.version === '9.1') {
			this.skip('not compatible with iOS 9.1');
		}

		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('test-button > button')
			.click()
			.end()
			.execute('return window.buttonClicked')
			.then((buttonClicked: boolean) => {
				assert.isTrue(buttonClicked);
			});
	},
	'setting custom element attribute updates properties'(this: any) {
		if (this.remote.session.capabilities.browser === 'iPhone' && this.remote.session.capabilities.version === '9.1') {
			this.skip('not compatible with iOS 9.1');
		}

		return this.remote
			.get((<any> require).toUrl('./support/registerCustomElement.html'))
			.setFindTimeout(1000)
			.findByCssSelector('test-button > button')
			.end()
			.execute('document.querySelector("test-button").setAttribute("label", "greetings")')
			.then(pollUntil<any>(function () {
				return (<any> document).querySelector('test-button > button').innerHTML === 'greetings world';
			}, undefined, 1000), undefined);
	},
	'setting custom element properties updates widget'(this: any) {
		if (this.remote.session.capabilities.browser === 'iPhone' && this.remote.session.capabilities.version === '9.1') {
			this.skip('not compatible with iOS 9.1');
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
	}
});
