const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createFocusMock from '../../../../../src/testing/mocks/middleware/focus';
import focus from '../../../../../src/core/middleware/focus';
import { tsx, create } from '../../../../../src/core/vdom';
import harness from '../../../../../src/testing/harness';

describe('focus mock', () => {
	it('should mock focus of a node', () => {
		const focusMock = createFocusMock();
		const factory = create({ focus });
		const App = factory(({ middleware: { focus } }) => {
			return <div key="root">{focus.isFocused('root') ? 'focus' : 'no focus'}</div>;
		});
		const h = harness(() => <App />, { middleware: [[focus, focusMock]] });

		focusMock('root', false);
		h.expect(() => <div key="root">no focus</div>);

		focusMock('root', true);
		h.expect(() => <div key="root">focus</div>);
	});
});
