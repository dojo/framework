const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createNodeMock from '../../../../../src/testing/mocks/middleware/node';
import dimensions from '../../../../../src/core/middleware/dimensions';
import { tsx, create, node } from '../../../../../src/core/vdom';
import renderer, { assertion } from '../../../../../src/testing/renderer';

describe('node mock', () => {
	it('should mock nodes', () => {
		const nodeMock = createNodeMock();
		const factory = create({ dimensions });
		const App = factory(({ middleware: { dimensions } }) => {
			const rects = dimensions.get('root');
			return <div key="root">{JSON.stringify(rects)}</div>;
		});
		const r = renderer(() => <App key="app" />, { middleware: [[node, nodeMock]] });
		r.expect(
			assertion(() => (
				<div key="root">{`{"client":{"height":0,"left":0,"top":0,"width":0},"offset":{"height":0,"left":0,"top":0,"width":0},"position":{"bottom":0,"left":0,"right":0,"top":0},"scroll":{"height":0,"left":0,"top":0,"width":0},"size":{"width":0,"height":0}}`}</div>
			))
		);
		const client = { clientLeft: 1, clientTop: 2, clientWidth: 3, clientHeight: 4 };
		const offset = { offsetHeight: 10, offsetLeft: 10, offsetTop: 10, offsetWidth: 10 };
		const scroll = { scrollHeight: 10, scrollLeft: 10, scrollTop: 10, scrollWidth: 10 };
		const position = { bottom: 10, left: 10, right: 10, top: 10 };
		const size = { width: 10, height: 10 };

		const domNode = {
			...offset,
			...scroll,
			...client,
			getBoundingClientRect: () => ({
				...position,
				...size
			})
		};
		nodeMock('root', domNode);
		r.expect(
			assertion(() => (
				<div key="root">{`{"client":{"height":4,"left":1,"top":2,"width":3},"offset":{"height":10,"left":10,"top":10,"width":10},"position":{"bottom":10,"left":10,"right":10,"top":10},"scroll":{"height":10,"left":10,"top":10,"width":10},"size":{"width":10,"height":10}}`}</div>
			))
		);
	});
});
