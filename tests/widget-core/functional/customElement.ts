const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

let skip: boolean;

registerSuite('customElement', {
	beforeEach() {
		const { browserName, browser, version } = this.remote.session.capabilities;
		skip = false;
		if ((browser === 'iPhone' && version === '9.1') || (browserName === 'safari' && version === '9.1.3')) {
			skip = true;
		}
	},

	tests: {
		'custom elements are registered'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findById('testButton');
		},
		'custom element initial properties are set correctly'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findById('testButton')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'hello world');
				});
		},
		'custom element event handlers are registered'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#testButton > button')
				.click()
				.end()
				.execute('return window.buttonClicked')
				.then((buttonClicked: boolean) => {
					assert.isTrue(buttonClicked);
				});
		},
		'custom elements emit event on connection'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#testButton > button')
				.click()
				.end()
				.execute('return window.connectedEvent')
				.then((connectedEvent: boolean) => {
					assert.isTrue(connectedEvent);
				});
		},
		'updates the correct instance when multiple or the same custom elements are used'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findById('testButton-2')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'Worlds hello');
				});
		},
		'setting custom element attribute updates properties'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findById('testButton')
				.end()
				.execute('document.querySelector("test-button").setAttribute("label", "greetings")')
				.then(
					pollUntil(
						function() {
							return (
								(<any>document).querySelector('test-button > button').innerHTML === 'greetings world'
							);
						},
						undefined,
						1000
					),
					undefined
				);
		},
		'setting custom element properties updates widget'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('no-attributes > button')
				.end()
				.execute('document.querySelector("no-attributes").buttonLabel = "greetings"')
				.then(
					pollUntil(
						function() {
							return (<any>document).querySelector('no-attributes > button').innerHTML === 'greetings';
						},
						undefined,
						1000
					),
					undefined
				);
		},
		'creating elements manually works'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#manualButton > button')
				.end()
				.then(
					pollUntil(
						function() {
							return (<any>document).querySelector('#manualButton > button').innerHTML === 'manual';
						},
						undefined,
						1000
					),
					undefined
				);
		},
		'elements readded to the DOM are only initialized once'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#reinitButton > button')
				.end()
				.then(
					pollUntil(
						function() {
							return (<any>document).querySelector('#reinitButton > button').innerHTML === 'test';
						},
						undefined,
						1000
					),
					undefined
				);
		},
		'declarative children should be wrapped as widgets'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#parent-element > div > child-wrapper#nested-parent > div > div')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'nested child');
				})
				.end()
				.findByCssSelector('#parent-element > div > div')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'top level child');
				});
		},
		'programmatically added children should be wrapped as widgets'() {
			if (skip) {
				this.skip('not compatible with iOS 9.1 or Safari 9.1');
			}
			return this.remote
				.get('_build/tests/functional/decorators/customElement.html')
				.setFindTimeout(1000)
				.findByCssSelector('#dynamic-parent-element > div > child-wrapper > div > div')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'programmatic nested child');
				})
				.end()
				.findByCssSelector('#dynamic-parent-element > div > div')
				.then((element: any) => {
					return element.getVisibleText();
				})
				.then((text: string) => {
					assert.strictEqual(text, 'programmatic top level child');
				});
		}
	}
});
