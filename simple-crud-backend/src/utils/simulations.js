function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function burnCpu(ms) {
    const end = Date.now() + ms;
    let iterations = 0;

    while (Date.now() < end) {
        iterations += Math.sqrt(iterations + Math.random());
    }

    return Math.round(iterations);
}

module.exports = {
    burnCpu,
    sleep,
};
