import global from '../../../../src/shim/global';
const { registerSuite } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import Resize from '../../../../src/core/meta/Resize';
import { stub, SinonStub } from 'sinon';

import NodeHandler from '../../../../src/core/NodeHandler';
import WidgetBase from '../../../../src/core/WidgetBase';

let resizeObserver: any;
let resizeCallback: ([]: any[]) => void;
let bindInstance: WidgetBase;
let isFoo: SinonStub;
let isBar: SinonStub;
let observer: {
	observe: SinonStub;
	disconnect: SinonStub;
};

let globalResizeObserver: any;
registerSuite('meta - Resize', {
	async before() {
		bindInstance = new WidgetBase();
		resizeObserver = stub().callsFake(function(callback: any) {
			resizeCallback = callback;
			return observer;
		});
		globalResizeObserver = global.ResizeObserver;
		global.ResizeObserver = resizeObserver;
	},

	beforeEach() {
		isFoo = stub();
		isBar = stub();
		observer = {
			observe: stub(),
			disconnect: stub()
		};
	},

	afterEach() {
		isFoo.reset();
		isBar.reset();
		resizeObserver.resetHistory();
	},

	after() {
		global.ResizeObserver = globalResizeObserver;
	},

	tests: {
		'Will return predicates defaulted to false if node not loaded'() {
			const nodeHandler = new NodeHandler();

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.deepEqual(resize.get('foo', { isFoo, isBar }), { isFoo: false, isBar: false });
			assert.isFalse(isFoo.called);
			assert.isFalse(isBar.called);
		},
		'Will create a new ResizeObserver when node exists'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			resize.get('foo', { isFoo, isBar });
			assert.isTrue(resizeObserver.calledOnce);
		},
		'Will call predicates when resize event is observed'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			const contentRect: any = {
				width: 10
			};

			resize.get('foo', { isFoo, isBar });
			resizeCallback([{ contentRect }]);

			assert.isTrue(isFoo.firstCall.calledWith(contentRect));
			assert.isTrue(isBar.firstCall.calledWith(contentRect));
		},
		'Will only set up one observer per widget per key'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			resize.get('foo', { isFoo });
			resize.get('foo', { isBar });
			assert.isTrue(resizeObserver.calledOnce);
		},
		'Will call invalidate when predicates have changed'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			const contentRect: any = {
				width: 10
			};

			isFoo.onFirstCall().returns(false);
			isFoo.onSecondCall().returns(true);

			resize.get('foo', { isFoo, isBar });

			resizeCallback([{ contentRect }]);
			resizeCallback([{ contentRect }]);

			const predicates = resize.get('foo', { isFoo, isBar });

			assert.isTrue(invalidate.calledTwice);
			assert.isTrue(predicates.isFoo);
		},
		'Will invalidate given no predicates'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			const contentRect: any = {
				width: 10
			};

			resize.get('foo');
			resizeCallback([{ contentRect }]);
			assert.isTrue(invalidate.called);
		},
		'Should disconnect the resize observer when meta is destroyed'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const element = document.createElement('div');
			document.body.appendChild(element);
			nodeHandler.add(element, 'foo');

			const resize = new Resize({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			resize.get('foo');
			assert.isTrue(observer.observe.calledOnce);
			resize.destroy();
			assert.isTrue(observer.disconnect.calledOnce);
		}
	}
});
