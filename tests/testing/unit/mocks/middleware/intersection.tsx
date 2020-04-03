const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import { tsx, create } from '../../../../../src/core/vdom';
import renderer from '../../../../../src/testing/renderer';
import assertionTemplate from '../../../../../src/testing/assertionTemplate';
import createIntersectionMock from '../../../../../src/testing/mocks/middleware/intersection';
import intersection from '../../../../../src/core/middleware/intersection';

describe('intersection mock', () => {
	it('should mock intersection middleware calls', () => {
		const intersectionMock = createIntersectionMock();
		const factory = create({ intersection });
		const App = factory(({ middleware: { intersection } }) => {
			const details = intersection.get('root');
			return <div key="root">{JSON.stringify(details)}</div>;
		});
		const r = renderer(() => <App key="app" />, { middleware: [[intersection, intersectionMock]] });
		r.expect(assertionTemplate(() => <div key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</div>));
		intersectionMock('root', { isIntersecting: true });
		r.expect(assertionTemplate(() => <div key="root">{`{"isIntersecting":true}`}</div>));
		intersectionMock('root', { isIntersecting: false });
		r.expect(assertionTemplate(() => <div key="root">{`{"isIntersecting":false}`}</div>));
	});
});
