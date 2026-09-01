export const findSetEffects = (prev, next) => {
    const effects = [];
    const added = [];
    const removed = [];
    prev.forEach(id => {
        if (!next.has(id))
            removed.push(id);
    });
    next.forEach(id => {
        if (!prev.has(id))
            added.push(id);
    });
    effects.push(...added, ...removed);
    return { effects, added, removed };
};
