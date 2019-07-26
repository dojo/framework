const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createBreakpointMock from '../../../../../src/testing/mocks/middleware/breakpoint';
import breakpoint from '../../../../../src/core/middleware/breakpoint';
import { tsx, create } from '../../../../../src/core/vdom';
import harness from '../../../../../src/testing/harness';

describe('breakpoint mock', () => {
	it('should mock breakpoint middleware calls', () => {
		const breakpointMock = createBreakpointMock();
		const factory = create({ breakpoint });
		const App = factory(({ middleware: { breakpoint } }) => {
			const breakpointResult = breakpoint.get('root');
			return <div key="root">{JSON.stringify(breakpointResult)}</div>;
		});
		const h = harness(() => <App key="app" />, { middleware: [[breakpoint, breakpointMock]] });
		h.expect(() => <div key="root">null</div>);
		breakpointMock('root', { breakpoint: 'SM', contentRect: { width: 20 } });
		h.expect(() => <div key="root">{'{"breakpoint":"SM","contentRect":{"width":20}}'}</div>);
		breakpointMock('root', { breakpoint: 'XL', contentRect: { width: 1020 } });
		h.expect(() => <div key="root">{'{"breakpoint":"XL","contentRect":{"width":1020}}'}</div>);
	});

	it('should deal with multiple mocked keys', () => {
		const breakpointMock = createBreakpointMock();
		const factory = create({ breakpoint });
		const App = factory(({ middleware: { breakpoint } }) => {
			const rootBreakpoint = breakpoint.get('root');
			const otherBreakpoint = breakpoint.get('other');
			return (
				<div>
					<div key="root">{JSON.stringify(rootBreakpoint)}</div>
					<div key="other">{JSON.stringify(otherBreakpoint)}</div>
				</div>
			);
		});
		const h = harness(() => <App key="app" />, { middleware: [[breakpoint, breakpointMock]] });
		h.expect(() => (
			<div>
				<div key="root">null</div>
				<div key="other">null</div>
			</div>
		));
		breakpointMock('root', { breakpoint: 'SM', contentRect: { width: 50 } });
		h.expect(() => (
			<div>
				<div key="root">{'{"breakpoint":"SM","contentRect":{"width":50}}'}</div>
				<div key="other">null</div>
			</div>
		));
		breakpointMock('root', { breakpoint: 'XL', contentRect: { width: 1020 } });
		breakpointMock('other', { breakpoint: 'MD', contentRect: { width: 620 } });
		h.expect(() => (
			<div>
				<div key="root">{'{"breakpoint":"XL","contentRect":{"width":1020}}'}</div>
				<div key="other">{'{"breakpoint":"MD","contentRect":{"width":620}}'}</div>
			</div>
		));
	});
});
