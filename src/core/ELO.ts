
/**
 * ELO Rating System Utilities
 */

export const STARTING_ELO = 1200;
export const K_FACTOR = 32;

/**
 * Calculate expected score for player A against player B
 * Formula: 1 / (1 + 10 ^ ((Rb - Ra) / 400))
 */
export function getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new rating
 * @param currentRating Player's current rating
 * @param opponentRating Opponent's rating
 * @param actualScore 1 for win, 0.5 for draw, 0 for loss
 */
export function calculateNewRating(currentRating: number, opponentRating: number, actualScore: number): number {
    const expected = getExpectedScore(currentRating, opponentRating);
    const change = K_FACTOR * (actualScore - expected);
    return Math.round(currentRating + change);
}
