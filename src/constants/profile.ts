const P_WIDTHS: Record<number, string> = {
    1: "165px",
    2: "57px",
}
const P_SMALL_WIDTHS: Record<number, string> = {
    1: "145px",
    2: "51px",
}

const P_FILTER_TYPES = {
    QUESTIONS_ANSWERS: 1,
    VOTES: 2,
};

const P_FILTERS = [
    { label: "Questions & answers", type: P_FILTER_TYPES.QUESTIONS_ANSWERS },
    { label: "Votes", type: P_FILTER_TYPES.VOTES },
];

export {
    P_FILTER_TYPES,
    P_FILTERS,
    P_SMALL_WIDTHS, 
    P_WIDTHS,
}