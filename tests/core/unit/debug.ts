const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub, SinonStub } from 'sinon';
import { add } from '../../../src/has/has';
import global from '../../../src/shim/global';
import { warn, error, registerWidget } from '../../../src/core/debug';

let consoleWarnStub: SinonStub;
let consoleErrorStub: SinonStub;

describe('debug', () => {
	beforeEach(() => {
		add('dojo-debug', true, true);
		consoleWarnStub = stub(console, 'warn');
		consoleErrorStub = stub(console, 'error');
	});

	afterEach(() => {
		consoleWarnStub.restore();
		consoleErrorStub.restore();
	});

	it('should proxy warn to console', () => {
		add('dojo-debug', true, true);
		warn('hello');
		assert.isTrue(consoleWarnStub.calledOnce);
	});

	it('should proxy error to console', () => {
		error('hello');
		assert.isTrue(consoleErrorStub.calledOnce);
		add('dojo-debug', false, true);
		error('hello');
		assert.isTrue(consoleErrorStub.calledTwice);
	});

	it('should only warn when dojo debug is true', () => {
		add('dojo-debug', false, true);
		warn('hello');
		assert.isTrue(consoleWarnStub.notCalled);
	});

	it('should register widget string on global dojo debug object', () => {
		registerWidget('widget');
		assert.deepEqual(global.dojoDebug.widgets, ['widget']);
		registerWidget('widget');
		assert.deepEqual(global.dojoDebug.widgets, ['widget']);
		registerWidget('another-widget');
		assert.deepEqual(global.dojoDebug.widgets, ['widget', 'another-widget']);
	});
});
