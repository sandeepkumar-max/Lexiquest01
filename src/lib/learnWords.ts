import { CORE_WORDS } from './words/core';
import { EXTRA_WORDS } from './words/extra';

export type { LearnWord } from './words/types';

export const LEARN_WORDS = [...CORE_WORDS, ...EXTRA_WORDS];
