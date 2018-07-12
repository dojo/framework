import globalObject from '@dojo/shim/global';
import { deprecated } from './instrument';

deprecated({
	message: 'has been replaced with @dojo/shim/global',
	name: '@dojo/core/global',
	url: 'https://github.com/dojo/core/issues/302'
});

export default globalObject;
