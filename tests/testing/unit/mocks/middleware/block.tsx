const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createBlockMock from '../../../../../src/testing/mocks/middleware/block';
import block from '../../../../../src/core/middleware/block';
import { tsx, create } from '../../../../../src/core/vdom';
import renderer, { assertion } from '../../../../../src/testing/renderer';

describe('block mock', () => {
	it('should mock block middleware calls', () => {
		function func() {
			return null;
		}
		const blockMock = createBlockMock([[func, () => 'func result']]);
		const factory = create({ block });
		const App = factory(({ middleware: { block } }) => {
			const blockResult = block(func)();
			return <div key="root">{blockResult}</div>;
		});
		const r = renderer(() => <App key="app" />, { middleware: [[block, blockMock]] });
		r.expect(assertion(() => <div key="root">func result</div>));
	});

	it('should deal with multiple mocked functions', () => {
		function func(_: any) {
			return null;
		}
		function func1() {
			return null;
		}
		const blockMock = createBlockMock([[func, (foo: any) => foo], [func1, () => 'bar']]);
		const factory = create({ block });
		const App = factory(({ middleware: { block } }) => {
			return (
				<div>
					<div key="root">{block(func)('foo')}</div>
					<div key="other">{block(func1)()}</div>
				</div>
			);
		});
		const r = renderer(() => <App key="app" />, { middleware: [[block, blockMock]] });
		r.expect(
			assertion(() => (
				<div>
					<div key="root">foo</div>
					<div key="other">bar</div>
				</div>
			))
		);
	});

	it('should return a default', () => {
		function func() {
			return null;
		}
		const blockMock = createBlockMock();
		const factory = create({ block });
		const App = factory(({ middleware: { block } }) => {
			const blockResult = block(func)();
			return <div key="root">{blockResult}</div>;
		});
		const r = renderer(() => <App key="app" />, { middleware: [[block, blockMock]] });
		r.expect(assertion(() => <div key="root" />));
	});
});
