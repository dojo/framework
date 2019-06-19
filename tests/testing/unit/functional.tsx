const { it, afterEach, after, before } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import { harness } from '../../../src/testing/harness';
import { createResizeMock, createIntersectionMock } from '../../../src/testing/mocks';
import { create, tsx, diffProperty, invalidator } from '../../../src/core/vdom';
import { icache } from '../../../src/core/middleware/icache';
import { resize } from '../../../src/core/middleware/resize';
import { intersection } from '../../../src/core/middleware/intersection';

let resizeMock: any;
let intersectionMock: any;

describe('harness - functional', () => {
	before(() => {
		resizeMock = createResizeMock();
		intersectionMock = createIntersectionMock();
	});

	afterEach(() => {
		resizeMock.reset();
		intersectionMock.reset();
	});

	after(() => {
		resizeMock.restore();
		intersectionMock.restore();
	});

	it('foo', () => {
		const factory = create({ icache });

		const App = factory(({ middleware: { icache } }) => {
			const counter = icache.get<number>('counter') || 0;
			return (
				<div>
					<button
						key="click-me"
						onclick={() => {
							const counter = icache.get<number>('counter') || 0;
							icache.set('counter', counter + 1);
						}}
					>{`Click Me ${counter}`}</button>
				</div>
			);
		});
		const h = harness(() => <App />);
		h.expect(() => (
			<div>
				<button key="click-me" onclick={() => {}}>
					Click Me 0
				</button>
			</div>
		));
		h.trigger('@click-me', 'onclick');
		h.expect(() => (
			<div>
				<button key="click-me" onclick={() => {}}>
					Click Me 1
				</button>
			</div>
		));
	});

	it('bar', () => {
		const factory = create({ diffProperty, invalidator });
		let id = 0;
		const App = factory(({ middleware: { diffProperty, invalidator } }) => {
			diffProperty('key', () => {
				id++;
				invalidator();
			});
			return (
				<div>
					<button key="click-me">{`Click Me ${id}`}</button>
				</div>
			);
		});
		const h = harness(() => <App />);
		h.expect(() => (
			<div>
				<button key="click-me">Click Me 0</button>
			</div>
		));
		h.expect(() => (
			<div>
				<button key="click-me">Click Me 1</button>
			</div>
		));
		h.expect(() => (
			<div>
				<button key="click-me">Click Me 2</button>
			</div>
		));
	});

	it('baz', () => {
		const factory = create({ diffProperty, invalidator });
		let id = 0;
		const App = factory(({ middleware: { diffProperty, invalidator }, properties }) => {
			diffProperty('key', (prev: any, current: any) => {
				if (prev.key === 'app' && current.key === 'app') {
					id++;
					invalidator();
				}
			});
			return (
				<div>
					<button key="click-me">{`${properties.key} ${id}`}</button>
				</div>
			);
		});
		const h = harness(() => <App key="app" />);
		h.expect(() => (
			<div>
				<button key="click-me">app 0</button>
			</div>
		));
		h.expect(() => (
			<div>
				<button key="click-me">app 1</button>
			</div>
		));
	});

	it('qux', () => {
		const factory = create({ resize });
		const App = factory(({ middleware: { resize } }) => {
			const rects = resize.get('root');
			return <div key="root">{JSON.stringify(rects)}</div>;
		});
		const map = new Map();
		map.set(resize, resizeMock.mockResize);
		resizeMock.stubNode('root');
		const h = harness(() => <App key="app" />, { mockMiddlewareMap: map });
		h.expect(() => <div key="root">null</div>);
		resizeMock.trigger('root', { width: '100' });
		h.expect(() => <div key="root">{`{"width":"100"}`}</div>);
		resizeMock.trigger('root', { width: '101' });
		h.expect(() => <div key="root">{`{"width":"101"}`}</div>);
	});

	it('foobar', () => {
		const factory = create({ resize });
		const App = factory(({ middleware: { resize } }) => {
			const rootRects = resize.get('root');
			const otherRects = resize.get('other');
			return (
				<div>
					<div key="root">{JSON.stringify(rootRects)}</div>
					<div key="other">{JSON.stringify(otherRects)}</div>
				</div>
			);
		});
		const map = new Map();
		map.set(resize, resizeMock.mockResize);
		resizeMock.stubNode('root');
		resizeMock.stubNode('other');
		const h = harness(() => <App key="app" />, { mockMiddlewareMap: map });
		h.expect(() => (
			<div>
				<div key="root">null</div>
				<div key="other">null</div>
			</div>
		));
		resizeMock.trigger('root', { width: '100' });
		h.expect(() => (
			<div>
				<div key="root">{`{"width":"100"}`}</div>
				<div key="other">null</div>
			</div>
		));
		resizeMock.trigger('root', { width: '101' });
		resizeMock.trigger('other', { width: '100' });
		h.expect(() => (
			<div>
				<div key="root">{`{"width":"101"}`}</div>
				<div key="other">{`{"width":"100"}`}</div>
			</div>
		));
	});

	it('foobaz', () => {
		const factory = create({ intersection });
		const App = factory(({ middleware: { intersection } }) => {
			const details = intersection.get('root');
			return <div key="root">{JSON.stringify(details)}</div>;
		});
		const map = new Map();
		map.set(intersection, intersectionMock.mockIntersection);
		intersectionMock.stubNode('root');
		const h = harness(() => <App key="app" />, { mockMiddlewareMap: map });
		h.expect(() => <div key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</div>);
		intersectionMock.trigger('root', { isIntersecting: true });
		h.expect(() => <div key="root">{`{"isIntersecting":true}`}</div>);
		intersectionMock.trigger('root', { isIntersecting: false });
		h.expect(() => <div key="root">{`{"isIntersecting":false}`}</div>);
	});
});
