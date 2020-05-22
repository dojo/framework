import { drag } from '../../../../src/core/middleware/drag';
import renderer, { create, v, w } from '../../../../src/core/vdom';

const factory = create({ drag });
const DragExample = factory(function DragExample({ middleware: { drag } }) {
	const dragResults = drag.get('root');
	return v(
		'div',
		{
			key: 'root',
			styles: {
				backgroundColor: dragResults.isDragging ? 'green' : 'white',
				border: '1px solid black',
				color: dragResults.isDragging ? 'white' : 'black',
				height: '400px',
				userSelect: 'none',
				width: '200px'
			}
		},
		[v('pre', { id: 'results' }, [JSON.stringify(dragResults, null, '  ')])]
	);
});

const r = renderer(() => w(DragExample, {}));
r.mount();
