import { useState } from 'react';
import type { SpecimenView } from './view';

export function useLiveSpecimens(initial: SpecimenView[] = []) {
	const [specimens] = useState<SpecimenView[]>(initial);
	return { specimens, loading: false };
}
