/** Purpose bucket for ingest — maps to PORTFOLIO / REVIEW bindings (HLD). */
export type PurposeBucket = 'portfolio' | 'review';

/** Minimal v1 statuses — no full state machine (HLD). */
export type PhotoStatus = 'pending' | 'ready' | 'failed';

export type PhotoRow = {
	id: string;
	status: PhotoStatus;
	contentType: string | null;
	originalKey: string;
	error: string | null;
	createdAt: string;
	updatedAt: string;
};
