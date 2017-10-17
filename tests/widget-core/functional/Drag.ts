import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
// import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');
import { DragResults } from '../../src/meta/Drag';

registerSuite({
	name: 'Drag',

	'touch drag'(this: any) {
		if (!this.remote.session.capabilities.touchEnabled) {
			this.skip('Not touch enabled device');
		}
		return this.remote
			.get((<any> require).toUrl('./meta/Drag.html'))
			.setFindTimeout(5000)
			.findById('results')
			.pressFinger(50, 50)
			.sleep(100)
			.moveFinger(100, 100)
			.sleep(100)
			.findById('results')
			.getVisibleText()
			.then((text: string) => {
				const result: DragResults = JSON.parse(text);
				assert.isTrue(result.isDragging, 'should be in a drag state');
				assert.deepEqual(result.delta, { x: 50, y: 50 }, 'should have dragged expected distance');
			})
			.releaseFinger()
			.sleep(50)
			.findById('results')
			.getVisibleText()
			.then((text: string) => {
				const result: DragResults = JSON.parse(text);
				assert.isFalse(result.isDragging, 'should be no longer dragging');
				assert.deepEqual(result.delta, { x: 0, y: 0 }, 'should not have moved further');
			});
	},

	'mouse drag'(this: any) {
		const { browser, browserName, mouseEnabled } = this.remote.session.capabilities;
		if (!mouseEnabled || browser === 'iPhone' || browser === 'iPad') {
			this.skip('Not mouse enabled device');
		}
		if (browserName === 'MicrosoftEdge') {
			this.skip('For some reason, findById not working on Edge ATM.');
		}
		return this.remote
			.get((<any> require).toUrl('./meta/Drag.html'))
			.setFindTimeout(5000)
			.findById('results')
			.moveMouseTo(50, 50)
			.pressMouseButton()
			.sleep(100)
			.moveMouseTo(100, 100)
			.sleep(100)
			.findById('results')
			.getVisibleText()
			.then((text: string) => {
				const result: DragResults = JSON.parse(text);
				assert.isTrue(result.isDragging, 'should be in a drag state');
				assert.deepEqual(result.delta, { x: 50, y: 50 }, 'should have dragged expected distance');
			})
			.releaseMouseButton()
			.sleep(50)
			.findById('results')
			.getVisibleText()
			.then((text: string) => {
				const result: DragResults = JSON.parse(text);
				assert.isFalse(result.isDragging, 'should be no longer dragging');
				assert.deepEqual(result.delta, { x: 0, y: 0 }, 'should have dragged expected distance');
			});
	}
});
