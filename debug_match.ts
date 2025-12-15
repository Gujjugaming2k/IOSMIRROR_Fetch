
import { findBestMatch } from "./server/utils/matcher";

const meta = {
    id: "tt0099785",
    type: "movie",
    name: "Home Alone",
    year: "1990"
};

const results = [
    { id: "1", title: "A Girl Walks Home Alone at Night", provider: "prime" as const, year: "2014" },
    // Simulating that the actual Home Alone might be missing or have a different format
    { id: "2", title: "Home Alone 2", provider: "prime" as const, year: "1992" }
];

const match = findBestMatch(meta, results);
console.log("Match:", match);
