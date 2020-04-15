const { it, describe } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import createStoreMock from '../../../../../src/testing/mocks/middleware/store';
import { createStoreMiddleware } from '../../../../../src/core/middleware/store';
import { tsx, create } from '../../../../../src/core/vdom';
import renderer, { wrap, assertion } from '../../../../../src/testing/renderer';
import { createProcess } from '../../../../../src/stores/process';
import { stub } from 'sinon';
import { replace } from '../../../../../src/stores/state/operations';

interface State {
	foo: string;
	bar: {
		qux: number;
	};
}

const store = createStoreMiddleware<State>();

const myProcess = createProcess('test', [() => {}]);
const otherProcess = createProcess('other', [() => {}]);

describe('store mock', () => {
	it('should mock store middleware', () => {
		const processStub = stub();
		const storeMock = createStoreMock<State>([[myProcess, processStub]]);
		const factory = create({ store });
		const App = factory(({ middleware: { store } }) => {
			const { get, path, executor } = store;
			const foo = get(path('foo'));
			const qux = get(path('bar', 'qux'));
			return (
				<div>
					<button
						key="button"
						onclick={() => {
							executor(myProcess)({ id: 'test' });
						}}
					/>
					<button
						key="other"
						onclick={() => {
							executor(otherProcess)({ id: 'test' });
						}}
					/>
					<span>{foo}</span>
					{qux && <span>{`${qux}`}</span>}
				</div>
			);
		});
		const r = renderer(() => <App key="app" />, { middleware: [[store, storeMock]] });
		const WrappedButton = wrap('button');
		const WrappedOtherButton = wrap('button');
		const WrappedSpan = wrap('span');
		const template = assertion(() => {
			return (
				<div>
					<WrappedButton key="button" onclick={() => {}} />
					<WrappedOtherButton key="other" onclick={() => {}} />
					<WrappedSpan />
				</div>
			);
		});
		r.expect(template);
		assert.isTrue(processStub.notCalled);
		r.property(WrappedButton, 'onclick');
		r.property(WrappedOtherButton, 'onclick');
		storeMock((path) => [replace(path('foo'), 'foo')]);
		const fooTemplate = template.setChildren(WrappedSpan, () => ['foo']);
		r.expect(fooTemplate);
		assert.isTrue(processStub.calledOnce);
		storeMock((path) => [replace(path('bar'), { qux: 1 })]);
		r.expect(fooTemplate.insertAfter(WrappedSpan, () => [<span>1</span>]));
	});
});
