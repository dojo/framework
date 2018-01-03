import { v } from '../../../src/d';
import WidgetBase from '../../../src/WidgetBase';
import Projector from '../../../src/mixins/Projector';
import Drag from '../../../src/meta/Drag';

class DragExample extends WidgetBase {
	render() {
		const dragResults = this.meta(Drag).get('root');
		return v(
			'div',
			{
				key: 'root',
				styles: {
					'background-color': dragResults.isDragging ? 'green' : 'white',
					border: '1px solid black',
					color: dragResults.isDragging ? 'white' : 'black',
					height: '400px',
					'user-select': 'none',
					width: '200px'
				}
			},
			[v('pre', { id: 'results' }, [JSON.stringify(dragResults, null, '  ')])]
		);
	}
}

const projector = new (Projector(DragExample))();

projector.append();
