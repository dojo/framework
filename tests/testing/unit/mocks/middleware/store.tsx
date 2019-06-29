const { it, describe } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import createStoreMock from '../../../../../src/testing/mocks/middleware/store';
import { createStoreMiddleware } from '../../../../../src/core/middleware/store';
import { tsx, create } from '../../../../../src/core/vdom';
import harness from '../../../../../src/testing/harness';
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
		const h = harness(() => <App key="app" />, { middleware: [[store, storeMock]] });
		h.expect(() => {
			return (
				<div>
					<button key="button" onclick={() => {}} />
					<button key="other" onclick={() => {}} />
					<span />
				</div>
			);
		});
		assert.isTrue(processStub.notCalled);
		h.trigger('@button', 'onclick');
		h.trigger('@other', 'onclick');
		assert.isTrue(processStub.calledOnce);
		storeMock((path) => [replace(path('foo'), 'foo')]);
		h.expect(() => {
			return (
				<div>
					<button key="button" onclick={() => {}} />
					<button key="other" onclick={() => {}} />
					<span>foo</span>
				</div>
			);
		});
		storeMock((path) => [replace(path('bar'), { qux: 1 })]);
		h.expect(() => {
			return (
				<div>
					<button key="button" onclick={() => {}} />
					<button key="other" onclick={() => {}} />
					<span>foo</span>
					<span>1</span>
				</div>
			);
		});
	});
});
