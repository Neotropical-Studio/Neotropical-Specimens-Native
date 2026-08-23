import { useState } from 'react';
import type { SpecimenView } from './view';

export type LiveSyncMode = 'off' | 'ws' | 'poll';

export function useLiveSpecimens(initial: SpecimenView[] = []) {
	const [specimens] = useState<SpecimenView[]>(initial);
	return { specimens, loading: false };
}
