export const noZero = (num) => {
    // COMPAT: 避免出现 0 值以及 0.5 值的不确定性
    return Math.max(num, 1);
};
export const noFloat = (num, forward = true) => {
    // COMPAT: 避免出现小数
    return forward ? Math.ceil(num) : Math.floor(num);
};
