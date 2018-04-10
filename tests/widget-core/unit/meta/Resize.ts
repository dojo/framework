const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '@dojo/shim/global';
import { stub, SinonStub } from 'sinon';
import Resize, { ContentRect } from '../../../src/meta/Resize';
import NodeHandler from '../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

let resizeObserver: any;
let resizeCallback: ([]: any[]) => void;
const bindInstance = new WidgetBase();
let isFoo: SinonStub;
let isBar: SinonStub;

registerSuite('meta - Resize', {
	beforeEach() {
		isFoo = stub();
		isBar = stub();
		resizeObserver = stub().callsFake(function(callback: any) {
			const observer = {
				observe: stub()
			};
			resizeCallback = callback;
			return observer;
		});

		global.ResizeObserver = resizeObserver;
	},

	afterEach() {
		isFoo.reset();
		isBar.reset();
		resizeObserver.reset();
		global.ResizeObserver = undefined;
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

			const contentRect: Partial<ContentRect> = {
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

			const contentRect: Partial<ContentRect> = {
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
		}
	}
});
