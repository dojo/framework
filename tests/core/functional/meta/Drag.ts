import { v, w, renderer } from '../../../../src/core/vdom';
import WidgetBase from '../../../../src/core/WidgetBase';
import Drag from '../../../../src/core/meta/Drag';

class DragExample extends WidgetBase {
	render() {
		const dragResults = this.meta(Drag).get('root');
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
	}
}

const r = renderer(() => w(DragExample, {}));
r.mount();
