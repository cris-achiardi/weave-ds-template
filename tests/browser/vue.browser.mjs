import { navigationRegressions } from './navigation.mjs';

navigationRegressions();

import { stylingRegressions } from './styling.mjs';
stylingRegressions('vue');

import { editingRegressions } from './editing.mjs';
editingRegressions();

import { browserConformance } from './conformance.mjs';
browserConformance();

import { tablistOwnershipRegressions } from './tablist.mjs';
tablistOwnershipRegressions('vue');

import { relationRegressions } from './relations.mjs';
relationRegressions();

import { frameworkFormRegressions } from './framework-forms.mjs';
frameworkFormRegressions();

import { frameworkControlRegressions } from './framework-controls.mjs';
frameworkControlRegressions();
