const { assert } = intern.getPlugin('chai');
const { describe, it } = intern.getInterface('bdd');
import * as sinon from 'sinon';
import NodeHandler from '../../../../src/core/NodeHandler';
import WidgetBase from '../../../../src/core/WidgetBase';
import Block from '../../../../src/core/meta/Block';

let bindInstance = new WidgetBase();

describe('Block Meta', () => {
	it('Should resolve module result when async', () => {
		let resolverOne: any;
		let resolverTwo: any;
		const promiseOne = new Promise((resolve) => {
			resolverOne = resolve;
		});
		const promiseTwo = new Promise((resolve) => {
			resolverTwo = resolve;
		});

		const invalidate = sinon.stub();
		const nodeHandler = new NodeHandler();

		function testModule(a: string): string | null {
			return promiseOne as any;
		}

		function testModuleOther(a: string): string | null {
			return promiseTwo as any;
		}

		const meta = new Block({
			invalidate,
			nodeHandler,
			bind: bindInstance
		});

		const resultOne = meta.run(testModule)('test');
		const resultTwo = meta.run(testModuleOther)('test');
		assert.isNull(resultOne);
		assert.isNull(resultTwo);

		resolverOne('resultOne');
		resolverTwo('resultTwo');

		return Promise.all([promiseOne, promiseTwo]).then(() => {
			const resultOne = meta.run(testModule)('test');
			assert.strictEqual(resultOne, 'resultOne');
			const resultTwo = meta.run(testModuleOther)('test');
			assert.strictEqual(resultTwo, 'resultTwo');
		});
	});

	it('Should return the result immediately when sync', () => {
		const invalidate = sinon.stub();
		const nodeHandler = new NodeHandler();

		function testModule(a: string): string | null {
			return 'sync';
		}

		const meta = new Block({
			invalidate,
			nodeHandler,
			bind: bindInstance
		});

		let resultOne = meta.run(testModule)('test');
		assert.strictEqual(resultOne, 'sync');
		resultOne = meta.run(testModule)('test');
		assert.strictEqual(resultOne, 'sync');
	});

	it('Should return result value if module does not return a promise', () => {
		const invalidate = sinon.stub();
		const nodeHandler = new NodeHandler();

		function testModule(a: string) {
			return undefined;
		}

		const meta = new Block({
			invalidate,
			nodeHandler,
			bind: bindInstance
		});

		let result = meta.run(testModule)('test');
		assert.isUndefined(result);
	});
});
