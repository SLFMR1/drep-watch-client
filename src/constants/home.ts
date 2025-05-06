const WIDTHS: Record<number, string> = {
    1: "123px",
    2: "133px",
    3: "114px",
}
const SMALL_WIDTHS: Record<number, string> = {
    1: "109px",
    2: "117px",
    3: "101px",
}

const FILTER_TYPES = {
    EXPLORE_DREPS: 3,
    LATEST_ANSWERS: 2,
    LATEST_QUESTIONS: 1,
};

const FILTERS = [
    { label: "Questions", type: FILTER_TYPES.LATEST_QUESTIONS },
    { label: "Answers", type: FILTER_TYPES.LATEST_ANSWERS },
    { label: "Dreps", type: FILTER_TYPES.EXPLORE_DREPS },
];

export {
    FILTER_TYPES,
    FILTERS,
    SMALL_WIDTHS, 
    WIDTHS,
}