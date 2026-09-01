export const toFixedNumber = (num, fractionDigits = 0) => {
    const times = Math.pow(10, fractionDigits);
    const roundNum = Math.round(num * times);
    return roundNum / times;
};
