`!has('build-elide')`;
import 'intersection-observer';
import wrapper from './util/wrapper';

export default wrapper('IntersectionObserver', true) as typeof IntersectionObserver;
