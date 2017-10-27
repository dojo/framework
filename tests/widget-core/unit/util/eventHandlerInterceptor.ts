const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';
import eventHandlerInterceptor from '../../../src/util/eventHandlerInterceptor';

registerSuite('util/eventHandlerInterceptor', {

	'event is passed through with bind'() {
		const addEventListener = stub();
		const mockDomNode: Element = {
			addEventListener
		} as any;
		const listener = stub();
		const context = {};
		const bind = {};
		const result = eventHandlerInterceptor.call(context, 'onscroll', listener, mockDomNode, { bind });
		assert.isFunction(result);
		assert.isTrue(addEventListener.notCalled, 'addEventListener should not have been called');
		assert.isTrue(listener.notCalled, 'listener should not have been called');
		result('foo');
		assert.isTrue(listener.calledOnce);
		assert.deepEqual(listener.lastCall.args, [ 'foo' ], 'should have been called with proper arguments');
		assert.strictEqual(listener.lastCall.thisValue, bind, 'should have been called with proper bind');
	},

	'event is passed through without bind'() {
		const addEventListener = stub();
		const mockDomNode: Element = {
			addEventListener
		} as any;
		const listener = stub();
		const context = {};
		const result = eventHandlerInterceptor.call(undefined, 'onscroll', listener, mockDomNode, { });
		assert.isFunction(result);
		assert.isTrue(addEventListener.notCalled, 'addEventListener should not have been called');
		assert.isTrue(listener.notCalled, 'listener should not have been called');
		result.call(context, 'foo');
		assert.isTrue(listener.calledOnce);
		assert.deepEqual(listener.lastCall.args, [ 'foo' ], 'should have been called with proper arguments');
		assert.strictEqual(listener.lastCall.thisValue, context, 'should have been called with proper context');
	},

	'event is installed with bind'() {
		const addEventListener = stub();
		const mockDomNode: Element = {
			addEventListener
		} as any;
		const listener = stub();
		const context = {};
		const bind = {};
		const result = eventHandlerInterceptor.call(context, 'ontouchstart', listener, mockDomNode, { bind });
		assert.isUndefined(result);
		assert.isTrue(listener.notCalled, 'listener should not have been called');
		assert.isTrue(addEventListener.calledOnce, 'addEventListener should not have been called once');
		assert.strictEqual(addEventListener.lastCall.args[0], 'touchstart', 'should have called with proper event type');
		assert.isFunction(addEventListener.lastCall.args[1], 'should have passed a handler');
		const handler: (...args: any[]) => void = addEventListener.lastCall.args[1];
		handler('foo');
		assert.isTrue(listener.calledOnce);
		assert.deepEqual(listener.lastCall.args, [ 'foo' ], 'should have been called with proper arguments');
		assert.strictEqual(listener.lastCall.thisValue, bind, 'should have been called with proper context');
	},

	'event is installed without bind'() {
		const addEventListener = stub();
		const mockDomNode: Element = {
			addEventListener
		} as any;
		const listener = stub();
		const context = {};
		const result = eventHandlerInterceptor.call(context, 'ontouchstart', listener, mockDomNode, { });
		assert.isUndefined(result);
		assert.isTrue(listener.notCalled, 'listener should not have been called');
		assert.isTrue(addEventListener.calledOnce, 'addEventListener should not have been called once');
		assert.strictEqual(addEventListener.lastCall.args[0], 'touchstart', 'should have called with proper event type');
		assert.isFunction(addEventListener.lastCall.args[1], 'should have passed a handler');
		const handler: (...args: any[]) => void = addEventListener.lastCall.args[1];
		handler('foo');
		assert.isTrue(listener.calledOnce);
		assert.deepEqual(listener.lastCall.args, [ 'foo' ], 'should have been called with proper arguments');
		assert.strictEqual(listener.lastCall.thisValue, context, 'should have been called with proper context');
	},

	'passed through events'() {
		const eventHandlers = [
			'onblur',
			'onchange',
			'onclick',
			'ondblclick',
			'onfocus',
			'oninput',
			'onkeydown',
			'onkeypress',
			'onkeyup',
			'onload',
			'onmousedown',
			'onmouseenter',
			'onmouseleave',
			'onmousemove',
			'onmouseout',
			'onmouseover',
			'onmouseup',
			'onmousewheel',
			'onscroll',
			'onsubmit'
		];
		eventHandlers.forEach((eventType) => {
			const mockDomNode: Element = { } as any;
			const listener = () => { };
			const context = {};
			assert.isFunction(eventHandlerInterceptor.call(context, 'onscroll', listener, mockDomNode, { }), 'should pass through handler');
		});
	}
});
