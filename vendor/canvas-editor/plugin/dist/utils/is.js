import { FALSY, TRULY } from "./constant";
export const isTruly = (value) => {
    return value === TRULY;
};
export const isFalsy = (value) => {
    return !value || value === FALSY;
};
