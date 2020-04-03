const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import createFocusMock from '../../../../../src/testing/mocks/middleware/focus';
import focus from '../../../../../src/core/middleware/focus';
import { tsx, create } from '../../../../../src/core/vdom';
import renderer from '../../../../../src/testing/renderer';
import assertionTemplate from '../../../../../src/testing/assertionTemplate';

describe('focus mock', () => {
	it('should mock focus of a node', () => {
		const focusMock = createFocusMock();
		const factory = create({ focus });
		const App = factory(({ middleware: { focus } }) => {
			return <div key="root">{focus.isFocused('root') ? 'focus' : 'no focus'}</div>;
		});
		const r = renderer(() => <App />, { middleware: [[focus, focusMock]] });

		focusMock('root', false);
		r.expect(assertionTemplate(() => <div key="root">no focus</div>));

		focusMock('root', true);
		r.expect(assertionTemplate(() => <div key="root">focus</div>));
	});
});
