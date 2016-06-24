import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/support/has';

registerSuite({
	name: 'native/Symbol',
	'verify API'() {
		if (!has('es6-symbol')) {
			this.skip('No native support');
		}
		const dfd = this.async();
		require([ 'src/native/Symbol' ], dfd.callback((m: any) => {
			/* tslint:disable-next-line:variable-name */
			const Symbol = m.default;
			const { isSymbol } = m;
			const sym = Symbol('foo');
			assert.typeOf(sym, 'symbol');
			assert.isTrue(isSymbol(sym));
			assert.isFalse(isSymbol('foo'));
			assert.strictEqual(Symbol, global.Symbol);
			[
				'hasInstance',
				'isConcatSpreadable',
				'iterator',
				'species',
				'replace',
				'search',
				'split',
				'match',
				'toPrimitive',
				'toStringTag',
				'unscopables'
			].forEach((wellKnown) => assert.typeOf(Symbol[wellKnown], 'symbol'));
		}));
	}
});
