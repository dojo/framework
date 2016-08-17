import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'interactive',

	setup(this: any) {
		return this.remote
			.get((<any> require).toUrl('./tabbedPanel.html'))
			.setFindTimeout(5000)
			.findByCssSelector('body.loaded');
	},

	'TabbedPanel'(this: any) {
		return this.remote
			.findByCssSelector('dojo-panel-tabbed > ul > :nth-child(2) > :first-child')
				.click()
				.end()
			.findByCssSelector('dojo-panel.visible > div')
				.getVisibleText()
				.then((text: string) => {
					const result = JSON.parse(text);
					assert.deepEqual(result, {
						id: 'tab2'
					});
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > .active > :first-child')
				.getVisibleText()
				.then((text: string) => {
					assert.strictEqual(text, 'tab 2');
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > :nth-child(3) > :first-child')
				.click()
				.end()
			.findByCssSelector('dojo-panel.visible > div')
				.getVisibleText()
				.then((text: string) => {
					const result = JSON.parse(text);
					assert.deepEqual(result, {
						id: 'tab3'
					});
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > .active > :first-child')
				.getVisibleText()
				.then((text: string) => {
					assert.strictEqual(text, 'tab 3');
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > :nth-child(4) > :first-child')
				.click()
				.end()
			.findByCssSelector('dojo-panel.visible > div')
				.getVisibleText()
				.then((text: string) => {
					const result = JSON.parse(text);
					assert.deepEqual(result, {
						id: 'tab4'
					});
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > .active > :first-child')
				.getVisibleText()
				.then((text: string) => {
					assert.strictEqual(text, 'tab 4');
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > :nth-child(4) > :last-child')
				.click()
				.end()
			.findByCssSelector('dojo-panel.visible > div')
				.getVisibleText()
				.then((text: string) => {
					const result = JSON.parse(text);
					assert.deepEqual(result, {
						id: 'tab1'
					});
				})
				.end()
			.findByCssSelector('dojo-panel-tabbed > ul > .active > :first-child')
				.getVisibleText()
				.then((text: string) => {
					assert.strictEqual(text, 'tab 1');
				});
	}
});
