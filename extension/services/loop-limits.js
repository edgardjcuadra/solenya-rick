function toNonNegativeInt(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.floor(value));
}
export function evaluateLoopLimits(state, nowEpoch = Math.floor(Date.now() / 1000)) {
    if (state.jar_complete) {
        return {
            exceeded: true,
            reason: 'jar-complete',
            message: 'Jar processing complete',
        };
    }
    const maxTimeMinutes = toNonNegativeInt(state.max_time_minutes);
    const startEpoch = toNonNegativeInt(state.start_time_epoch);
    if (maxTimeMinutes > 0 && startEpoch > 0) {
        const elapsedSeconds = Math.max(0, nowEpoch - startEpoch);
        const maxTimeSeconds = maxTimeMinutes * 60;
        if (elapsedSeconds >= maxTimeSeconds) {
            return {
                exceeded: true,
                reason: 'time-limit',
                message: `Time limit exceeded (${elapsedSeconds}/${maxTimeSeconds}s)`,
                elapsedSeconds,
                maxTimeSeconds,
            };
        }
    }
    const maxIterations = toNonNegativeInt(state.max_iterations);
    const iteration = toNonNegativeInt(state.iteration);
    // Iteration is incremented at BeforeAgent and starts from 0. Using ">"
    // preserves "allow exactly N turns when max_iterations = N".
    if (maxIterations > 0 && iteration > maxIterations) {
        return {
            exceeded: true,
            reason: 'iteration-limit',
            message: `Iteration limit exceeded (${iteration}/${maxIterations})`,
        };
    }
    return { exceeded: false };
}
