import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './createWidgetBase';
import createProjectorMixin, { Projector, ProjectorOptions } from './mixins/createProjectorMixin';

export interface ProjectorFactory extends ComposeFactory<Projector, ProjectorOptions> { }

/**
 * Projector Factory
 */
const createProjector: ProjectorFactory = createWidgetBase
	.mixin(createProjectorMixin);

export default createProjector;

export * from './mixins/createProjectorMixin';
