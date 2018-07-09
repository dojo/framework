import globalObject from '../shim/global';
import { deprecated } from './instrument';

deprecated({
	message: 'has been replaced with @dojo/framework/shim/global',
	name: '@dojo/framework/core/global',
	url: 'https://github.com/dojo/core/issues/302'
});

export default globalObject;
