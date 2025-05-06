export const getId = (id: string | null | undefined): string => {
    if (id === null || id === undefined) {
        return '';
    }
    return id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
};