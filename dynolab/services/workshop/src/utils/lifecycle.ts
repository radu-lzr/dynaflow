const VALID_TRANSITIONS: Record<string, string> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'delivered',
};

export function canTransition(currentStatus: string, targetStatus: string): boolean {
    return VALID_TRANSITIONS[currentStatus] === targetStatus;
}

export function getNextStatus(currentStatus: string): string | null {
    return VALID_TRANSITIONS[currentStatus] || null;
}
