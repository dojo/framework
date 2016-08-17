import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'interactive',

	setup(this: any) {
		return this.remote
			.get((<any> require).toUrl('./widgets.html'))
			.setFindTimeout(5000)
			.findByCssSelector('body.loaded');
	},

	'Button'(this: any) {
		return this.remote
			.findByCssSelector('[data-widget-id=button1]')
				.click()
				.end()
			.findById('output')
				.getVisibleText()
				.then((text: string) => {
					const output = JSON.parse(text);
					assert.deepEqual(output, {
						id: 'button1',
						label: 'button1'
					});
				});
	},

	'TextInput'(this: any) {
		return this.remote
			.findByCssSelector('[data-widget-id=textinput1]')
				.click()
				.type('bar')
				.end()
			.findById('output')
				.getVisibleText()
				.then((text: string) => {
					const output = JSON.parse(text);
					assert.deepEqual(output, {
						id: 'textinput1',
						name: 'textinput1',
						value: 'bar'
					});
				});
	}
});
