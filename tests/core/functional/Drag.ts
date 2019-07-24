const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { DragResults } from '../../../src/core/meta/Drag';
import Test from 'intern/lib/Test';

function getPage(test: Test) {
	return test.remote.get(`${__dirname}/meta/Drag.html`).setFindTimeout(5000);
}

registerSuite('Drag', {
	'touch drag'() {
		if (!this.remote.session.capabilities.touchEnabled) {
			this.skip('Not touch enabled device');
		}
		return getPage(this)
			.findById('results')
			.pressFinger(50, 50)
			.sleep(100)
			.moveFinger(100, 100)
			.sleep(100)
			.findById('results')
			.getVisibleText()
			.then((text) => {
				const result: DragResults = JSON.parse(text);
				assert.isTrue(result.isDragging, 'should be in a drag state');
				assert.deepEqual(result.delta, { x: 50, y: 50 }, 'should have dragged expected distance');
			})
			.releaseFinger(100, 100)
			.sleep(50)
			.findById('results')
			.getVisibleText()
			.then((text) => {
				const result: DragResults = JSON.parse(text);
				assert.isFalse(result.isDragging, 'should be no longer dragging');
				assert.deepEqual(result.delta, { x: 0, y: 0 }, 'should not have moved further');
			});
	},

	'mouse drag'() {
		const { browser, browserName, mouseEnabled } = this.remote.session.capabilities;
		if (!mouseEnabled || browser === 'iPhone' || browser === 'iPad') {
			this.skip('Not mouse enabled device');
		}
		if (browserName === 'MicrosoftEdge') {
			this.skip('For some reason, findById not working on Edge ATM.');
		}
		if (browserName === 'internet explorer') {
			this.skip('Dragging is not working on Internet Explorer.');
		}
		return getPage(this)
			.findById('results')
			.moveMouseTo(50, 50)
			.pressMouseButton()
			.sleep(100)
			.moveMouseTo(100, 100)
			.sleep(100)
			.getVisibleText()
			.then((text) => {
				const result: DragResults = JSON.parse(text);
				assert.isTrue(result.isDragging, 'should be in a drag state');
				assert.deepEqual(result.delta, { x: 50, y: 50 }, 'should have dragged expected distance');
			})
			.releaseMouseButton()
			.sleep(50)
			.getVisibleText()
			.then((text) => {
				const result: DragResults = JSON.parse(text);
				assert.isFalse(result.isDragging, 'should be no longer dragging');
				assert.deepEqual(result.delta, { x: 0, y: 0 }, 'should have dragged expected distance');
			});
	}
});
