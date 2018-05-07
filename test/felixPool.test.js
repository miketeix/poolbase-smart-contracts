const FelixPool = artifacts.require('./FelixPool.sol');
const BigNumber = web3.BigNumber;

const { latestTime, duration, increaseTimeTo } = require('./helpers/timer');
const { should, ensuresException, ether } = require('./helpers/utils');

contract('FelixPool', ([owner, investor1, investor2, investor3]) => {
    let felixPool, endTime;

    const threshold = new BigNumber(100);
    const rate = new BigNumber(10);

    beforeEach(async () => {
        endTime = latestTime() + duration.days(20); // 20 days
        felixPool = await FelixPool.new(threshold, endTime, rate);
    });

    describe('constructor sets variables', () => {
        it('sets the pool threshold', async () => {
            const thresholdInContract = await felixPool.threshold();
            thresholdInContract.should.be.bignumber.equal(threshold);
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

    describe('#deposit', () => {
        it('does NOT allow investments after the pool finishes', async () => {
            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.deposit({ from: investor1, value: ether(1) });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(0);
        });

        it('saves the number of contributions an investor has made', async () => {
            await felixPool.deposit({ from: investor1, value: ether(1) });

            let totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(ether(1));
            let investorContributions = await felixPool.contributions.call(
                investor1
            );
            investorContributions.should.be.bignumber.equal(ether(1));

            await felixPool.deposit({ from: investor1, value: ether(3) });

            totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(ether(4));
            investorContributions = await felixPool.contributions.call(
                investor1
            );
            investorContributions.should.be.bignumber.equal(ether(4));
        });

        it('saves the tokens entitlements for an investor after it has contributed', async () => {
            await felixPool.deposit({ from: investor1, value: ether(1) });

            let totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
            let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(1).mul(rate)
            );

            await felixPool.deposit({ from: investor1, value: ether(3) });

            totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(4).mul(rate));
            investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(4).mul(rate)
            );
        });

        it('emits ContributionMade event', async () => {
            const { logs } = await felixPool.deposit({
                from: investor1,
                value: ether(1)
            });

            const event = logs.find(e => e.event == 'ContributionMade');
            expect(event).to.exist;

            const { args } = logs[0];
            const { investor, contribution } = args;

            investor.should.be.equal(investor1);
            contribution.should.be.bignumber.equal(ether(1));
        });
    });
});
