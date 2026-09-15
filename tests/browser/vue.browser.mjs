import { navigationRegressions } from './navigation.mjs';

navigationRegressions();

import { stylingRegressions } from './styling.mjs';
stylingRegressions('vue');

import { editingRegressions } from './editing.mjs';
editingRegressions();

import { browserConformance } from './conformance.mjs';
browserConformance();
