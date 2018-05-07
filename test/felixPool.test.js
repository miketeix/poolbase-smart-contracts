const FelixPool = artifacts.require('./FelixPool.sol');
const TokenMock = artifacts.require('./TokenMock.sol');
const BigNumber = web3.BigNumber;

const { latestTime, duration, increaseTimeTo } = require('./helpers/timer');
const { should, ensuresException, ether } = require('./helpers/utils');

contract('FelixPool', ([owner, investor1, investor2, investor3]) => {
    let felixPool, endTime;

    const threshold = ether(10);
    const rate = new BigNumber(2);

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

        it('sets admin', async () => {
            const admin = await felixPool.admin();
            admin.should.be.bignumber.equal(owner);
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

        it('allows total contribution to be sent by sending ether to the contract directly', async () => {
            await felixPool.sendTransaction({
                from: investor1,
                value: ether(1)
            });

            let totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(ether(1));
            let investorContributions = await felixPool.contributions.call(
                investor1
            );
            investorContributions.should.be.bignumber.equal(ether(1));

            await felixPool.sendTransaction({
                from: investor1,
                value: ether(3)
            });

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

    describe('#withdrawContribution', () => {
        it('does NOT allow investment withdraws when investor has not contributed', async () => {
            try {
                await felixPool.withdrawContribution({ from: investor1 });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(0);
        });

        it('does NOT allow withdraws when the pool is successful', async () => {
            await felixPool.deposit({ from: investor1, value: threshold });

            try {
                await felixPool.withdrawContribution({ from: investor1 });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(threshold);
        });

        it('withdraws contributions an investor has made', async () => {
            await felixPool.deposit({ from: investor1, value: ether(2) });
            await felixPool.deposit({ from: investor2, value: ether(1) });

            let totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(ether(3));
            let investorContributions = await felixPool.contributions.call(
                investor1
            );
            investorContributions.should.be.bignumber.equal(ether(2));

            await felixPool.withdrawContribution({ from: investor1 });

            totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(ether(1));
            investorContributions = await felixPool.contributions.call(
                investor1
            );
            investorContributions.should.be.bignumber.equal(0);

            const investor2Contributions = await felixPool.contributions.call(
                investor2
            );
            investor2Contributions.should.be.bignumber.equal(ether(1));
        });

        it('resets token entitlements for investors who have withdrawn their investments', async () => {
            await felixPool.deposit({ from: investor1, value: ether(2) });
            await felixPool.deposit({ from: investor2, value: ether(1) });

            let totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(3).mul(rate));
            let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(2).mul(rate)
            );

            await felixPool.withdrawContribution({ from: investor1 });

            totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
            investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(0);

            const investor2TokenEntitlements = await felixPool.tokenEntitlements.call(
                investor2
            );
            investor2TokenEntitlements.should.be.bignumber.equal(
                ether(1).mul(rate)
            );
        });

        it('transfers wei investment back to the investor', async () => {
            const investorWeiBalance = web3.eth.getBalance(investor1);
            await felixPool.deposit({ from: investor1, value: ether(5) });

            await felixPool.withdrawContribution({ from: investor1 });

            const investorWeiBalancePostInteraction = web3.eth.getBalance(
                investor1
            );

            investorWeiBalancePostInteraction
                .toNumber()
                .should.be.closeTo(investorWeiBalance.toNumber(), 1e17);
        });

        it('emits ContributionWithdrawn event', async () => {
            await felixPool.deposit({
                from: investor1,
                value: ether(1)
            });

            const { logs } = await felixPool.withdrawContribution({
                from: investor1
            });

            const event = logs.find(e => e.event == 'ContributionWithdrawn');
            expect(event).to.exist;

            const { args } = logs[0];
            const { investor, contribution } = args;

            investor.should.be.equal(investor1);
            contribution.should.be.bignumber.equal(ether(1));
        });
    });

    describe('#confirmTokenAddress', () => {
        let token;
        const totalTokensForPool = threshold.mul(rate);

        beforeEach(async () => {
            token = await TokenMock.new(felixPool.address, totalTokensForPool);
        });

        it('requires admin to set token address', async () => {
            await felixPool.deposit({
                from: investor1,
                value: threshold
            });

            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.confirmTokenAddress(token.address, {
                    from: investor1
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('requires pool to have finished', async () => {
            await felixPool.deposit({
                from: investor1,
                value: threshold
            });

            try {
                await felixPool.confirmTokenAddress(token.address, {
                    from: owner
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('requires equal or more tokens sent to pool contract', async () => {
            // eRC20 tokens for tranferred to felixPool is lower than
            // the totalTokens felixPool expects
            await felixPool.deposit({
                from: investor1,
                value: threshold.add(ether(1))
            });

            await increaseTimeTo(latestTime() + duration.days(21));
            const test = await felixPool.totalTokens();
            const test2 = await token.balanceOf(felixPool.address);

            try {
                await felixPool.confirmTokenAddress(token.address, {
                    from: owner
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('sets ERC20 token to pool', async () => {
            await felixPool.deposit({
                from: investor1,
                value: threshold
            });

            await increaseTimeTo(latestTime() + duration.days(21));

            await felixPool.confirmTokenAddress(token.address, { from: owner });

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.true;

            const erc20InPool = await felixPool.token();
            erc20InPool.should.be.equal(token.address);
        });

        it('emits TokenConfirmed event', async () => {
            await felixPool.deposit({
                from: investor1,
                value: threshold
            });
            await increaseTimeTo(latestTime() + duration.days(21));

            const { logs } = await felixPool.confirmTokenAddress(
                token.address,
                { from: owner }
            );

            const event = logs.find(e => e.event == 'TokenConfirmed');
            expect(event).to.exist;

            const { args } = logs[0];
            const { tokenAddress } = args;

            tokenAddress.should.be.equal(token.address);
        });
    });
});
