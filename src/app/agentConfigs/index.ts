import { decolonialConsultantScenario } from './decolonialConsultant';
import { thermometerColonialityScenario } from './thermometerColoniality';
import { valladolidDebateScenario } from './valladolidDebate';
import { pangeaLatentSpaceScenario } from './pangeaLatentSpace';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects for Pangea_IA
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  Pangea_IA: decolonialConsultantScenario,
  thermometerColoniality: thermometerColonialityScenario,
  valladolidDebate: valladolidDebateScenario,
  pangeaLatentSpace: pangeaLatentSpaceScenario,
};

export const defaultAgentSetKey = 'Pangea_IA';
