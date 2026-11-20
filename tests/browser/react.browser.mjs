import { stylingRegressions } from './styling.mjs';
stylingRegressions('react');

import { editingRegressions } from './editing.mjs';
editingRegressions();

import { browserConformance } from './conformance.mjs';
browserConformance();

import { tablistOwnershipRegressions } from './tablist.mjs';
tablistOwnershipRegressions('react');

import { relationRegressions } from './relations.mjs';
relationRegressions();
