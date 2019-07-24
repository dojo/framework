const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createResizeMock from '../../../../../src/testing/mocks/middleware/resize';
import resize from '../../../../../src/core/middleware/resize';
import { tsx, create } from '../../../../../src/core/vdom';
import harness from '../../../../../src/testing/harness';

describe('resize mock', () => {
	it('should mock resize middleware calls', () => {
		const resizeMock = createResizeMock();
		const factory = create({ resize });
		const App = factory(({ middleware: { resize } }) => {
			const rects = resize.get('root');
			return <div key="root">{JSON.stringify(rects)}</div>;
		});
		const h = harness(() => <App key="app" />, { middleware: [[resize, resizeMock]] });
		h.expect(() => <div key="root">null</div>);
		resizeMock('root', { width: 100 });
		h.expect(() => <div key="root">{`{"width":100}`}</div>);
		resizeMock('root', { width: 101 });
		h.expect(() => <div key="root">{`{"width":101}`}</div>);
	});

	it('should deal with multiple mocked keys', () => {
		const resizeMock = createResizeMock();
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
		const h = harness(() => <App key="app" />, { middleware: [[resize, resizeMock]] });
		h.expect(() => (
			<div>
				<div key="root">null</div>
				<div key="other">null</div>
			</div>
		));
		resizeMock('root', { width: 100 });
		h.expect(() => (
			<div>
				<div key="root">{`{"width":100}`}</div>
				<div key="other">null</div>
			</div>
		));
		resizeMock('root', { width: 101 });
		resizeMock('other', { width: 100 });
		h.expect(() => (
			<div>
				<div key="root">{`{"width":101}`}</div>
				<div key="other">{`{"width":100}`}</div>
			</div>
		));
	});
});
