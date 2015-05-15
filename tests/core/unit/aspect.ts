import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import sinon = require('sinon');
import * as aspect from 'src/aspect';

const slice = Array.prototype.slice;
let obj: any;
let methodSpy: any;

function createBeforeSpy() {
	return sinon.spy(function (a: number) {
		return [a + 1];
	});
}

registerSuite({
		name: 'aspect',

		'beforeEach'() {
			methodSpy = sinon.spy(function (a: number) {
				return a + 1;
			});
			obj = { method: methodSpy };
		},

		'.before': {
			'return value passed as arguments'() {
				let aspectSpy = createBeforeSpy();

				aspect.before(obj, 'method', aspectSpy);

				obj.method(0);
				assert.isTrue(aspectSpy.calledBefore(methodSpy));
				assert.isTrue(aspectSpy.calledOnce);
				assert.isTrue(methodSpy.calledOnce);
				assert.equal(aspectSpy.lastCall.args[0], 0);
				assert.equal(methodSpy.lastCall.args[0], 1);
				assert.equal(methodSpy.returnValues[0], 2);
			},

			'multiple aspect.before()'() {
				const aspectSpy1 = createBeforeSpy();
				const aspectSpy2 = createBeforeSpy();

				aspect.before(obj, 'method', aspectSpy1);
				aspect.before(obj, 'method', aspectSpy2);

				obj.method(5);
				assert.isTrue(aspectSpy2.calledBefore(aspectSpy1));
				assert.isTrue(aspectSpy1.calledBefore(methodSpy));
				assert.equal(aspectSpy2.lastCall.args[0], 5);
				assert.equal(aspectSpy1.lastCall.args[0], 6);
				assert.equal(methodSpy.lastCall.args[0], 7);
				assert.equal(methodSpy.returnValues[0], 8);
			}
		},

		'.after': {
			'overriding return value from original method'() {
				const expected = 'override!';
				const aspectSpy = sinon.stub().returns(expected);

				aspect.after(obj, 'method', aspectSpy);
				assert.equal(obj.method(0), expected);
				assert.isTrue(aspectSpy.calledAfter(methodSpy));
			},

			'multiple aspect.after()'() {
				const aspectStub1 = sinon.stub();
				const aspectStub2 = sinon.stub();

				aspect.after(obj, 'method', aspectStub1);
				aspect.after(obj, 'method', aspectStub2);

				obj.method(0);
				assert.isTrue(aspectStub1.calledAfter(methodSpy));
				assert.isTrue(aspectStub2.calledAfter(aspectStub1));
			},

			'provides the original arguments to the aspect method'() {
				const expected = 'expected';
				const aspectStub = sinon.stub().returns(expected);

				aspect.after(obj, 'method', aspectStub);
				assert.equal(obj.method(0), expected);
				assert.isTrue(aspectStub.calledAfter(methodSpy));
				assert.equal(aspectStub.lastCall.args[0], 1);
				assert.deepEqual(slice.call(aspectStub.lastCall.args[1]), methodSpy.lastCall.args);
			}
		},

		'.around': {
			'single around'() {
				const expected = 5;
				const aroundFunction = sinon.stub().returns(expected);
				const aspectStub = sinon.stub().returns(aroundFunction);

				aspect.around(obj, 'method', aspectStub);

				assert.equal(obj.method(0), expected);
				assert.isTrue(aspectStub.calledOnce);
				assert.isTrue(aroundFunction.calledOnce);
				assert.equal(aroundFunction.firstCall.args[0], 0);
				assert.isFalse(methodSpy.called);

				// test that the original method was provided
				aspectStub.callArgWith(0, 10);
				assert.isTrue(methodSpy.calledOnce);
				assert.equal(methodSpy.firstCall.args[0], 10);
			}
		},

		'handle.destroy()': {
			'prevents aspect from being called'() {
				const aspectSpy = createBeforeSpy();
				const handle = aspect.before(obj, 'method', aspectSpy);

				obj.method(0);
				assert.notEqual(obj.method, methodSpy);

				handle.destroy();
				obj.method(1);
				assert.notEqual(obj.method, methodSpy);
				assert.isTrue(methodSpy.calledTwice);
				assert.isTrue(aspectSpy.calledOnce);
			},

			'can remove an aspect from the middle of a list'() {
				const aspectSpy1 = createBeforeSpy();
				const aspectSpy2 = createBeforeSpy();
				const handle = aspect.before(obj, 'method', aspectSpy1);

				aspect.before(obj, 'method', aspectSpy2);
				handle.destroy();

				obj.method(0);
				assert.isTrue(methodSpy.called);
				assert.isTrue(aspectSpy2.called);
				assert.isFalse(aspectSpy1.called);
			},

			'removing a aspect stub'() {
				const obj: any = {};
				const aspectSpy = sinon.stub();
				aspect.before(obj, 'method', sinon.stub());
				const handle = aspect.before(obj, 'method', aspectSpy);

				handle.destroy();
				obj.method(0);
				assert.isFalse(aspectSpy.called);
			},

			'removing the first of multiple aspects'() {
				const aroundFunction = sinon.stub();
				const aspectStub = sinon.stub().returns(aroundFunction);
				const handle = aspect.around(obj, 'method', aspectStub);

				handle.destroy();
				obj.method(0);
				assert.isTrue(aspectStub.calledOnce);
				assert.isTrue(methodSpy.calledOnce);
				assert.isFalse(aroundFunction.called);
			}
		}
	}
);
