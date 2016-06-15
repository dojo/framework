import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'interactive',

	setup() {
		return this.remote
			.get((<any> require).toUrl('./widgetClasses.html'))
			.setFindTimeout(5000)
			.findByCssSelector('body.loaded');
	},

	'Adding and Removing Classes'() {
		return this.remote
			.findByCssSelector('[data-widget-id=button]')
				.click()
				.end()
			.sleep(10)
			.findByCssSelector('[data-widget-id=header]')
				.getSpecAttribute('class')
				.then((className: string) => {
					assert.equal(className, 'foo');
				})
				.end()
			.findByCssSelector('[data-widget-id=button]')
				.click()
				.end()
			.sleep(10)
			.findByCssSelector('[data-widget-id=header]')
				.getSpecAttribute('class')
				.then((className: string) => {
					assert.equal(className, 'bar');
				})
				.end()
			.findByCssSelector('[data-widget-id=button]')
				.click()
				.end()
			.sleep(10)
			.findByCssSelector('[data-widget-id=header]')
				.getSpecAttribute('class')
				.then((className: string) => {
					assert.equal(className, 'baz');
				})
				.end()
			.findByCssSelector('[data-widget-id=button]')
				.click()
				.end()
			.sleep(10)
			.findByCssSelector('[data-widget-id=header]')
				.getSpecAttribute('class')
				.then((className: string) => {
					assert.equal(className, 'foo');
				})
				.end();
	}
});
