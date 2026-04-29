// Module-level store for Firebase confirmationResult.
// Can't be passed through navigation params (not JSON-serializable).
let _confirmationResult: any = null;

export const setConfirmationResult = (cr: any) => { _confirmationResult = cr; };
export const getConfirmationResult = () => _confirmationResult;
export const clearConfirmationResult = () => { _confirmationResult = null; };
