`!has('build-elide')`;
import 'cross-fetch/polyfill';
import wrapper from './util/wrapper';

export default wrapper('fetch', false, true) as (input: RequestInfo, init?: RequestInit) => Promise<Response>;
