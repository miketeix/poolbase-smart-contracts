const { should, ensuresException } = require('./helpers/utils');
const FelixPool = artifacts.require('./FelixPool.sol');
const BigNumber = web3.BigNumber;

contract('FelixPool', ([owner, investor, investor2, investor3]) => {
    let felixPool;

    const threshold = new BigNumber(100);
    const startTime = web3.eth.getBlock('latest').timestamp + 24; // twenty secs in the future
    const endTime = startTime + 86400 * 20; // 20 days
    const rate = new BigNumber(10);

    beforeEach(async () => {
        felixPool = await FelixPool.new(threshold, startTime, endTime, rate);
    });

    describe.only('constructor sets variables', () => {
        it('sets the pool threshold', async () => {
            const thresholdInContract = await felixPool.threshold();
            thresholdInContract.should.be.bignumber.equal(threshold);
        });

        it('sets startTime', async () => {
            const startTimeInContract = await felixPool.startTime();
            startTimeInContract.should.be.bignumber.equal(startTime);
        });

        it('sets endTime', async () => {
            const endTimeInContract = await felixPool.endTime();
            endTimeInContract.should.be.bignumber.equal(endTime);
        });

        it('sets rate', async () => {
            const rateInContract = await felixPool.rate();
            rateInContract.should.be.bignumber.equal(rate);
        });
    });
});
