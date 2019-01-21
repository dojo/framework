import global from './global';
`!has('build-elide')`;
import 'whatwg-fetch';

export default global.fetch.bind(global) as (input: RequestInfo, init?: RequestInit) => Promise<Response>;
