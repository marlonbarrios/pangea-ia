import { decolonialConsultantScenario } from './decolonialConsultant';
import { thermometerColonialityScenario } from './thermometerColoniality';
import { valladolidDialogueScenario } from './valladolidDialogue';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects for Pangea_IA
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  Pangea_IA: decolonialConsultantScenario,
  thermometerColoniality: thermometerColonialityScenario,
  valladolidDialogue: valladolidDialogueScenario,
};

export const defaultAgentSetKey = 'Pangea_IA';
